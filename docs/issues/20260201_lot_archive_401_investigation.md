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

## 次のステップ（再現手順）

1. **ブラウザDevToolsを開く**（Consoleタブ）
2. **ログイン**
3. **ロット一覧ページに移動**
4. **アーカイブ可能なロットを選択してアーカイブボタンをクリック**
5. **以下を確認**:
   - `[ArchiveLot] Sending archive request` ログ
   - `[HTTP] Archive request` ログ（hasToken, tokenPrefixを確認）
   - `[HTTP] 401 Unauthorized Error` ログ（発生した場合）
   - バックエンドログ (`docker compose logs -f backend`)で `Lot archive request received` を確認

---

## 想定される原因候補

### 仮説1: トークンの不正な状態
- ローカルストレージにトークンが存在するが、バックエンドで検証に失敗
- 可能性: トークンの署名検証エラー、ペイロード不正

### 仮説2: タイミング問題
- トークン有効期限ギリギリでのリクエスト
- リクエスト送信からバックエンド到達までの間に期限切れ

### 仮説3: ヘッダー送信の問題
- `Authorization` ヘッダーが実際には送信されていない
- HTTPクライアントのbeforeRequestフックが正しく動作していない

### 仮説4: PATCH固有の問題
- PATCHリクエストはリトライ対象外 (http-client.ts:301)
- ネットワーク一時不通時にリトライされず、401が返される

### 仮説5: 他のアーカイブ系APIでも同様の問題
- `/api/lots/{id}/archive` 以外のアーカイブ系エンドポイントでも発生する可能性
- 確認対象:
  - `/api/customers/{code}/restore`
  - `/api/suppliers/{code}/restore`
  - `/api/warehouses/{code}/restore`
  - その他のrestore/archiveエンドポイント

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
