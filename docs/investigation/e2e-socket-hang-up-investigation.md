# E2E テスト socket hang up エラーの調査レポート

**作成日:** 2026-02-01  
**対象:** `e2e-04-permission.spec.ts` - 権限テスト

## 問題の概要

`e2e-04-permission.spec.ts` の「API直接呼び出し: 未認証は401」テストで socket hang up エラーが発生。

## 根本原因

### 1. テストの意図と実装の不一致
- **テスト名**: 「未認証は401」→ 401エラーを期待すべき
- **テストコード** (L102): `expect(status).toBe(200)` → 200を期待（**矛盾**）
- **コメント** (L100): 「200 OK が返ること（未認証でもアクセス可能なエンドポイント)」

### 2. `/api/admin/stats` の実際の仕様
- **未認証でもアクセス可能**（仕様として正しい）
- **使用箇所**:
  - ダッシュボード統計情報の取得（ログイン前でも表示）
  - 管理者ページでの統計表示
- **実装**: `get_current_user_optional` を使用
- **理由**: ダッシュボードの統計情報（在庫総数、受注数など）は公開情報として扱う

### 3. socket hang up の原因
- Playwrightの `request.get()` でHTTP接続エラーが発生
- **curlでは成功** → Playwright固有の問題
- 原因候補:
  - タイムアウト設定が不適切
  - Keep-Alive接続の問題
  - 複数の並列テストによるバックエンド負荷

### 4. テストスイートの目的
- **E2E-04: 権限テスト**
- 検知する事故: 権限漏れ、UI隠蔽のみでAPIは通る問題、権限チェックのバイパス
- **本来の目的**: 管理者専用エンドポイントに未認証でアクセスして403/401が返ることをテスト

## 結論

1. `/api/admin/stats` は**公開エンドポイント**なので、未認証で200が返るのは正しい
2. テスト名「未認証は401」が間違っている
3. 権限テストの目的を達成するには、**管理者専用エンドポイント**を使うべき

---

## 提案する修正（2つの選択肢）

### 【推奨】方針A: エンドポイント名を変更してからテストを修正

> [!IMPORTANT]
> `/api/admin/stats` という名前がダッシュボード（公開情報）用に使われているのは命名規則として違和感がある。
> より根本的な解決として、エンドポイント名を変更することを推奨。

#### 提案: エンドポイントのリネーム

```
/api/admin/stats → /api/dashboard/stats
または
/api/admin/stats → /api/public/stats
```

**理由:**
- `/api/admin/*` は管理者専用機能の印象が強い
- ダッシュボード統計は公開情報なので、パスも明確に区別すべき
- 将来的な混乱を防ぐ

**影響範囲:**
- バックエンド: `backend/app/presentation/api/routes/admin/admin_router.py`
- フロントエンド: `frontend/src/services/api.ts`, `frontend/src/shared/libs/admin-api.ts`
- E2Eテスト: 該当するテストコード

#### テスト修正（方針A）

```typescript
test("API直接呼び出し: 未認証は401", async ({ request }) => {
  // 管理者専用エンドポイントを使用
  const response = await request.get("http://localhost:18000/api/admin/metrics", {
    headers: {
      "Content-Type": "application/json",
      "Connection": "close", // Keep-Alive問題を回避
    },
    timeout: 10000,
  });

  expect(response.status()).toBe(401);
  console.log(`E2E-04: 未認証API呼び出し → ${response.status()} (期待通り)`);
});
```

---

### 方針B: テストのみ修正（短期対応）

エンドポイント名の変更は別タスクとして切り出し、今回はテストのみ修正。

```typescript
test("API直接呼び出し: 未認証は401", async ({ request }) => {
  const response = await request.get("http://localhost:18000/api/admin/metrics", {
    headers: {
      "Content-Type": "application/json",
      "Connection": "close",
    },
    timeout: 10000,
  });

  expect(response.status()).toBe(401);
  console.log(`E2E-04: 未認証API呼び出し → ${response.status()} (期待通り)`);
});
```

**変更点:**
- エンドポイント: `/api/admin/stats` → `/api/admin/metrics`
- `/api/admin/metrics` は管理者専用（`get_current_admin`）
- socket hang up対策: `Connection: close`, `timeout: 10000`

---

## 変更対象ファイル

### テスト修正（両方針共通）

#### [MODIFY] [e2e-04-permission.spec.ts](file:///Users/kazuya/dev/projects/lot-management-system/frontend/e2e/specs/p0/e2e-04-permission.spec.ts#L89-105)

- L93: エンドポイントを `/api/admin/metrics` に変更
- L94-97: `Connection: close` ヘッダーと `timeout: 10000` を追加

### エンドポイントリネーム（方針A のみ）

#### [MODIFY] [admin_router.py](file:///Users/kazuya/dev/projects/lot-management-system/backend/app/presentation/api/routes/admin/admin_router.py#L48)

- `/api/admin/stats` を `/api/dashboard/stats` に変更
- またはダッシュボード用の新しいルーターを作成

#### [MODIFY] [api.ts](file:///Users/kazuya/dev/projects/lot-management-system/frontend/src/services/api.ts#L30)

- `admin/stats` を `dashboard/stats` に変更

#### [MODIFY] [admin-api.ts](file:///Users/kazuya/dev/projects/lot-management-system/frontend/src/shared/libs/admin-api.ts#L18)

- `/admin/stats` を `/dashboard/stats` に変更

---

## 検証計画

```bash
# 修正したテストを実行
cd frontend
npx playwright test e2e/specs/p0/e2e-04-permission.spec.ts --project=smoke --reporter=list

# 全P0テストを実行して回帰を確認
npx playwright test e2e/specs/p0 --project=smoke --reporter=list
```

### 期待される結果

- `e2e-04-permission.spec.ts` の全5テストが成功
- socket hang upエラーが発生しない
- テストの実行時間が適切（30秒以内）

---

## 参考情報

### `/api/admin/metrics` の実装

`admin_router.py` L383-394:
```python
@router.get("/metrics")
def get_metrics(
    current_admin=Depends(get_current_admin),  # Only admin can view metrics
):
    """パフォーマンスメトリクスを取得."""
```

- **管理者専用エンドポイント**として明確に設計
- パフォーマンスメトリクスなので、機密情報として扱うのが妥当
