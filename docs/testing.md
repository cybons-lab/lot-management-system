# テスト実行ガイド

## 概要

本プロジェクトでは以下の3層構成でテストを実施します：

| レイヤー | ツール | 目的 | 実行時間目標 |
|---------|-------|------|-------------|
| E2E | Playwright | UI統合・導線破壊検知 | < 10分 |
| API統合 | pytest | DB整合性・CRUD・権限 | < 5分 |
| ユニット | pytest/Vitest | ビジネスロジック | < 2分 |

## ローカル実行

### 前提条件

```bash
# テスト用DB起動
docker compose -f docker-compose.test.yml up -d

# 依存関係インストール
cd backend && uv sync
cd frontend && npm ci
```

### バックエンドテスト

```bash
cd backend

# 全テスト実行
uv run pytest

# API統合テストのみ
uv run pytest tests/api -v

# カバレッジ付き
uv run pytest --cov=app --cov-report=html

# 特定のテストファイル
uv run pytest tests/api/test_orders_crud.py -v
```

### フロントエンドユニットテスト

```bash
cd frontend

# 全テスト実行
npm run test:run

# ウォッチモード
npm run test

# UI モード
npm run test:ui

# カバレッジ
npm run test:coverage
```

### E2Eテスト

```bash
cd frontend

# バックエンドが起動していることを確認
curl http://localhost:8000/api/health

# P0 Smokeテストのみ（高速）
npm run test:e2e:smoke

# 全E2Eテスト
npm run test:e2e

# ヘッドモード（ブラウザ表示）
npm run test:e2e:headed

# UIモード（インタラクティブ）
npm run test:e2e:ui

# デバッグモード
npm run test:e2e:debug
```

## CI実行

### ジョブ構成

```
frontend-tests ─┬─► e2e-smoke (P0) ─► e2e-full (main/develop のみ)
backend-tests ──┘
```

| ジョブ | 実行条件 | タイムアウト | 失敗時 |
|--------|---------|-------------|--------|
| frontend-tests | 常時 | - | ブロック |
| backend-tests | 常時 | - | ブロック |
| e2e-smoke | frontend/backend成功後 | 15分 | ブロック |
| e2e-full | main/develop && smoke成功後 | 30分 | 継続 |

### artifact保存

失敗時に以下がartifactとして保存されます：

- `playwright-report-*`: HTMLレポート
- `playwright-traces-*`: trace.zipファイル（trace viewer で確認可能）
- `backend-coverage-report`: カバレッジHTMLレポート

## DBリセット・テストデータ

### 方針

```
+------------------------+---------------------------+
| Backend pytest         | E2E Playwright            |
+------------------------+---------------------------+
| トランザクション分離    | API経由DBリセット          |
| (conftest.py)          | (beforeAll per worker)    |
| 各テスト後ロールバック   | ユニークprefixで衝突回避   |
+------------------------+---------------------------+
```

### Backend

- 各テストは独立したトランザクション内で実行
- テスト終了時に自動ロールバック
- 明示的なクリーンアップ不要

### E2E

```typescript
// ワーカー単位でDBリセット（beforeAll）
test.beforeAll(async ({ request }) => {
  const client = await ApiClient.create(request);
  await client.resetDatabase();  // POST /api/admin/reset-database
});

// テストデータはユニークprefixで作成
const testCode = `E2E-${Date.now() % 100000}`;
```

### リセットエンドポイント

| エンドポイント | 説明 | 制限 |
|--------------|------|------|
| `POST /api/admin/reset-database` | 全データ削除 + 管理者再作成 | 本番環境では403 |

> [!WARNING]
> reset-databaseはtest/development環境でのみ動作します。
> 本番環境で呼び出した場合は403が返却されます。

## セレクタ規約

### 優先順位

1. **getByRole** - アクセシビリティ属性（推奨）
   ```typescript
   page.getByRole("button", { name: "保存" })
   ```

2. **getByLabel** - ラベル関連付け
   ```typescript
   page.getByLabel("注文番号")
   ```

3. **getByTestId** - data-testid属性
   ```typescript
   page.locator('[data-testid="order-status"]')
   ```

4. **locator (CSS)** - 最後の手段
   ```typescript
   page.locator("table tbody tr")
   ```

### data-testid命名規約

```
{component}-{element}-{modifier}

例:
- order-status
- order-list-table
- save-button
- confirm-dialog
```

## P0 E2Eテスト一覧

| テストID | ファイル | 検知する事故 |
|---------|---------|-------------|
| E2E-01 | `e2e-01-order-flow.spec.ts` | クリティカルパスの導線破壊 |
| E2E-02 | `e2e-02-save-persistence.spec.ts` | DB保存失敗、楽観ロック不整合 |
| E2E-03 | `e2e-03-double-submit.spec.ts` | 保存連打による二重登録 |
| E2E-04 | `e2e-04-permission.spec.ts` | 権限漏れ、UI隠蔽のみでAPI通過 |
| E2E-05 | `e2e-05-list-filter.spec.ts` | フィルタクリア不具合、ソート不整合 |
| E2E-06 | `e2e-06-error-handling.spec.ts` | API 500時のUI破壊、無限ローディング |

## テスト追加ガイドライン

### 新規E2Eテスト

1. `frontend/e2e/specs/` 配下にファイル作成
2. P0（重要）なら `frontend/e2e/specs/p0/` に配置
3. Page Objectパターンを使用（`e2e/fixtures/pages/`）
4. 保存系は必ず `waitForResponse` でAPI確認

```typescript
// 良い例
const response = await page.waitForResponse(
  (r) => r.url().includes("/api/orders") && r.request().method() === "POST"
);
expect(response.ok()).toBeTruthy();

// 悪い例（sleep禁止）
await page.waitForTimeout(2000);  // ❌
```

### 新規API統合テスト

1. `backend/tests/api/` 配下にファイル作成
2. 既存のフィクスチャを活用（`conftest.py`）
3. 保存後は必ず再取得して確認

```python
# 良い例
response = client.post("/api/orders", json=data)
assert response.status_code == 201
order_id = response.json()["id"]

# 再取得して確認（重要！）
get_response = client.get(f"/api/orders/{order_id}")
assert get_response.json()["customer_code"] == data["customer_code"]
```

## トラブルシューティング

### E2Eテストがタイムアウトする

1. バックエンドが起動しているか確認
   ```bash
   curl http://localhost:8000/api/health
   ```

2. フロントエンドが起動しているか確認
   ```bash
   curl http://localhost:5173
   ```

3. trace viewerで確認
   ```bash
   cd frontend && npx playwright show-trace test-results/*/trace.zip
   ```

### DBリセットが失敗する

1. テストDBコンテナが起動しているか確認
   ```bash
   docker compose -f docker-compose.test.yml ps
   ```

2. 認証トークンが有効か確認（ログイン成功しているか）

### CIでのみ失敗する

1. artifactからtrace.zipをダウンロード
2. `npx playwright show-trace trace.zip` で確認
3. 環境差分を確認（URL、ポート、タイムアウト）

## 参考リンク

- [Playwright公式ドキュメント](https://playwright.dev/)
- [pytest公式ドキュメント](https://docs.pytest.org/)
- [comprehensive-test-strategy.md](./plans/comprehensive-test-strategy.md) - 詳細なテスト戦略計画
