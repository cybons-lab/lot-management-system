# ロットアーカイブ時の401エラー調査レポート

**作成日**: 2026-02-01
**優先度**: High
**ステータス**: 調査中（デバッグログ追加済み）

---

## 問題の概要

ロットをアーカイブしようとすると401エラーが発生し、強制的にログアウトされる。

### 症状
- **操作**: ロット一覧 → アーカイブボタンクリック
- **結果**: 401 Unauthorized → 強制ログアウト
- **影響**: アーカイブ機能が使用不可、アーカイブ済みロットの復元テストも実施不可

---

## 調査結果

### 1. アーカイブAPIエンドポイント (backend/app/presentation/api/routes/inventory/lots_router.py:456)

```python
@router.patch("/{lot_id}/archive", response_model=LotResponse)
def archive_lot(
    lot_id: int,
    request: LotArchiveRequest | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(AuthService.get_current_user),  # ✅ 認証チェック実装済み
) -> Any:
```

**確認事項**:
- ✅ 認証チェックは正しく実装されている (`AuthService.get_current_user`)
- ✅ ログが追加され、リクエスト受信時にuser_id, usernameを記録

### 2. トークン有効期限 (backend/app/core/security.py:38)

```python
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 1 day (社内システムのため許容)
```

**確認事項**:
- ✅ トークンは24時間有効
- ❓ トークン有効期限切れではなさそう（短時間での操作でも発生）

### 3. フロントエンド実装

#### HTTP Client (frontend/src/shared/api/http-client.ts)

- **認証ヘッダー**: `Authorization: Bearer {token}` が送信される (L308-309)
- **401エラー処理**: `handleUnauthorizedError()` → `dispatchAuthError()` → ログアウト (L230-239)
- **デバウンス**: 500ms以内の重複401エラーは抑制 (L72-88)

#### アーカイブ処理 (frontend/src/services/api/lot-service.ts:92)

```typescript
export async function archiveLot(id: number, lotNumber?: string): Promise<LotResponse> {
  return http.patch<LotResponse>(`${BASE_PATH}/${id}/archive`, {
    lot_number: lotNumber,
  });
}
```

**確認事項**:
- ✅ `http.patch()` を使用（認証付きHTTPクライアント）
- ✅ デバッグログを追加済み（リクエスト前後でログ出力）

---

## 追加したデバッグログ

### Backend (lots_router.py:483-491)

```python
logger.info(
    "Lot archive request received",
    extra={
        "lot_id": lot_id,
        "user_id": current_user.id,
        "username": current_user.username,
        "has_confirmation": request is not None and request.lot_number is not None,
    },
)
```

### Frontend (lot-service.ts:92-115)

```typescript
console.log("[ArchiveLot] Sending archive request", {
  id,
  lotNumber,
  url: `${BASE_PATH}/${id}/archive`,
  timestamp: new Date().toISOString(),
});

// ... (エラー時も詳細ログ)
```

### HTTP Client (http-client.ts:311-321, 230-240)

```typescript
// リクエスト送信前
if (request.url.includes("/archive")) {
  console.log("[HTTP] Archive request", {
    url: request.url,
    method: request.method,
    hasToken: !!token,
    tokenPrefix: token ? token.substring(0, 20) + "..." : "none",
    authMode,
  });
}

// 401エラー発生時
console.error("[HTTP] 401 Unauthorized Error", {
  url: request?.url,
  method: request?.method,
  message: error.message,
  body,
  hasAuthHeader: request?.headers.has("Authorization"),
  authHeaderPrefix: request?.headers.get("Authorization")?.substring(0, 20) + "...",
});
```

---

## 🔍 根本原因の特定

**ステータス**: ✅ 原因特定完了

### 検証結果

1. **バックエンドログの確認**:
   ```
   {"event": "HTTP exception: 401", "path": "/api/lots/11/archive", "method": "PATCH"}
   ```
   - 401エラーは確実に発生している
   - `Lot archive request received` ログが**出力されていない** → 認証レイヤーで拒否

2. **SECRET_KEY検証**:
   ```bash
   $ docker compose exec backend python -c "from app.core.config import settings; print(settings.secret_key[:30])"
   dev-secret-key-change-in-produ
   ```
   - バックエンドは `dev-secret-key-change-in-production` を使用（デフォルト値）

3. **トークン検証テスト**:
   ```bash
   $ docker compose exec backend python
   >>> token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
   >>> payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
   ❌ JWTError: Signature verification failed.
   ```
   - **署名検証エラー**: トークンは別のSECRET_KEYで生成されている

### 🎯 根本原因

**トークンの署名検証失敗**:
- ユーザーのトークンは**以前のSECRET_KEYで生成**された
- バックエンド再起動後、`docker-compose.yml`にSECRET_KEYの設定がないため、デフォルト値を使用
- バックエンドが再起動されるたびに、既存トークンは無効化される可能性がある

### ✅ 解決方法

**即座の対応**: 再ログインしてトークンを再生成
1. ブラウザで**ログアウト**
2. 再度**ログイン**
3. 新しいトークンが現在のSECRET_KEYで生成される
4. アーカイブ機能が正常動作する

**恒久対策** (オプション):
1. `docker-compose.yml`に固定のSECRET_KEYを設定:
   ```yaml
   backend:
     environment:
       SECRET_KEY: "your-fixed-secret-key-here"
   ```
2. または `.env` ファイルを作成してSECRET_KEYを管理

---

## ~~次のステップ（再現手順）~~（検証完了）

~~1. **ブラウザDevToolsを開く**（Consoleタブ）~~
~~2. **ログイン**~~
~~3. **ロット一覧ページに移動**~~
~~4. **アーカイブ可能なロットを選択してアーカイブボタンをクリック**~~
~~5. **以下を確認**:~~
   ~~- `[ArchiveLot] Sending archive request` ログ~~
   ~~- `[HTTP] Archive request` ログ（hasToken, tokenPrefixを確認）~~
   ~~- `[HTTP] 401 Unauthorized Error` ログ（発生した場合）~~
   ~~- バックエンドログ (`docker compose logs -f backend`)で `Lot archive request received` を確認~~

---

## ~~想定される原因候補~~（検証完了）

### ~~仮説1~~: **✅ 確定**: トークンの署名検証エラー
- ~~ローカルストレージにトークンが存在するが、バックエンドで検証に失敗~~
- ~~可能性~~: **確定**: トークンは別のSECRET_KEYで生成されており、現在のバックエンドで検証できない

### ~~仮説2~~: **❌ 否定**: タイミング問題
- ~~トークン有効期限ギリギリでのリクエスト~~
- トークンのexp: 1770023830 (2026-04-02) → 期限切れではない

### ~~仮説3~~: **❌ 否定**: ヘッダー送信の問題
- ~~`Authorization` ヘッダーが実際には送信されていない~~
- スクリーンショットで確認: `Authorization: Bearer ...` は正しく送信されている

### ~~仮説4~~: **❌ 関係なし**: PATCH固有の問題
- ~~PATCHリクエストはリトライ対象外 (http-client.ts:301)~~
- リトライ対象外だが、401エラーの原因ではない（認証の問題）

### ~~仮説5~~: **❓ 未検証**: 他のアーカイブ系APIでも同様の問題
- 同じトークンを使用するため、**全てのAPIで同じ401エラー**が発生する可能性が高い
- 再ログイン後は全て正常動作するはず

---

## 関連ファイル

### Backend
- `backend/app/presentation/api/routes/inventory/lots_router.py`
- `backend/app/application/services/auth/auth_service.py`
- `backend/app/core/security.py`

### Frontend
- `frontend/src/services/api/lot-service.ts`
- `frontend/src/shared/api/http-client.ts`
- `frontend/src/hooks/api/useLotMutations.ts`
- `frontend/src/features/inventory/hooks/useLotActions.ts`

---

## 参考情報

- Codexからの指摘:
  > トークン期限切れ/無効化、Authorization ヘッダが欠落、バックエンドのトークン検証の問題が疑わしい。
  > トークンの有効期限/発行時間を確認するのが良い。

- 現在の設定:
  - トークン有効期限: 24時間
  - リトライ対象: GET, PUT, HEAD, DELETE, OPTIONS, TRACE（**PATCH除外**）
  - 401エラー時の挙動: イベント発火 → 強制ログアウト

---

## コミット

- **デバッグログ追加**: `24852088` (2026-02-01)
  - バックエンドログ追加（lots_router.py）
  - フロントエンドログ追加（lot-service.ts, http-client.ts）
  - 401エラー詳細ログ（トークン状態、ヘッダー確認）

- **原因特定と解決方法の追記**: `[pending]` (2026-02-01)
  - 根本原因: SECRET_KEYミスマッチによる署名検証エラー
  - 解決方法: 再ログインでトークン再生成
  - 恒久対策: docker-compose.ymlまたは.envでSECRET_KEYを固定

---

## 教訓

### システム設計の改善点

1. **SECRET_KEY管理**:
   - 現状: デフォルト値に依存、バックエンド再起動でトークン無効化
   - 改善: `.env`ファイルまたは`docker-compose.yml`で固定値を設定
   - 影響: 本番環境では必須（再起動のたびに全ユーザーがログアウトされる）

2. **トークン検証エラーの可視化**:
   - 現状: フロントエンドで「Could not validate credentials」のみ
   - 改善案: バックエンドで具体的なエラー理由をログ出力（JWTError, ExpiredSignatureError等）
   - メリット: デバッグ時間の短縮（今回は署名検証エラーが原因と特定するまで時間がかかった）

3. **デバッグログの重要性**:
   - 今回追加したログにより、リクエストが認証レイヤーで拒否されていることが判明
   - **教訓**: 認証周りは最初から詳細なログを仕込むべき（事後対応では原因特定に時間がかかる）
