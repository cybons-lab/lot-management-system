# Testing Quick Start Guide

## 今すぐできること（5分）

### 1. スモークテストを実行
```bash
# 最速（30秒）- ページが開くかだけをチェック
make test-smoke

# または直接
docker compose exec -T frontend npm run test:e2e:smoke
```

**これで検出できるエラー:**
- ページが真っ白
- JavaScriptエラーでアプリが起動しない
- 重大なルーティングエラー

---

### 2. コミット前の品質チェック
```bash
# 自動修正 + 型チェック + Unit/Integrationテスト（5分）
make quality-check

# スモークテスト含む完全版（10分）
make quality-check-full
```

---

### 3. CI/CDで自動実行
```yaml
# .github/workflows/ci.yml に追加
name: CI

on: [push, pull_request]

jobs:
  smoke-test:
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - uses: actions/checkout@v4
      - name: Start services
        run: docker compose up -d
      - name: Run smoke tests
        run: make test-smoke
      - name: Upload test results
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: test-results
          path: frontend/test-results/

  full-test:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@v4
      - name: Start services
        run: docker compose up -d
      - name: Run full quality check
        run: make ci-smoke
```

---

## テストの種類と実行時間

| テスト種類 | コマンド | 実行時間 | 検出できるバグ |
|----------|----------|----------|--------------|
| **Smoke** | `make test-smoke` | 30秒 | 致命的エラー（ページ真っ白、JS破損） |
| **Unit** | `make backend-test` | 3分 | ロジックバグ、バリデーション |
| **Integration** | `docker compose exec backend pytest tests/integration` | 5分 | API/DB整合性、外部API連携 |
| **E2E (P0)** | `make test-critical` | 10分 | クリティカルパスの動作確認 |
| **E2E (Full)** | `make frontend-test-e2e` | 30分 | リグレッション全体 |

---

## 新規機能開発時のテスト追加手順

### Step 1: Unit Tests（必須）
```python
# backend/tests/unit/test_new_feature.py
def test_new_feature_logic():
    result = new_feature_function(input_data)
    assert result == expected_output
```

### Step 2: Integration Tests（API追加時）
```python
# backend/tests/integration/test_new_feature_integration.py
def test_new_feature_api(client, db):
    response = client.post("/api/new-feature", json=data)
    assert response.status_code == 200
```

### Step 3: Smoke Test（新規ページ追加時）
```typescript
// frontend/e2e/specs/smoke/new-feature-smoke.spec.ts
test("新機能ページが表示される", async ({ page }) => {
  await page.goto("http://localhost:3000/new-feature");
  await expect(page.locator("h1")).toBeVisible();
});
```

### Step 4: E2E (Optional - クリティカルパスのみ)
```typescript
// frontend/e2e/specs/critical/new-feature.spec.ts
test("新機能のエンドツーエンドフロー", async ({ page }) => {
  // ユーザーが実際に行う操作を再現
  await page.click('button:has-text("新機能開始")');
  await page.fill('input[name="data"]', "テストデータ");
  await page.click('button:has-text("保存")');
  await expect(page.locator('text="保存しました"')).toBeVisible();
});
```

---

## トラブルシューティング

### Q1: E2Eテストが不安定（時々失敗する）
**A:** 並列実行が原因の可能性があります。
```bash
# workers=1で直列実行
docker compose exec -T frontend npx playwright test --workers=1
```

### Q2: テストが遅すぎる
**A:** スモークテストとP0テストのみを実行し、フルE2Eは週1回実行。
```bash
# 毎日
make test-smoke        # 30秒

# PR時
make quality-check     # 5分

# リリース前
make ci                # 20分
```

### Q3: SmartRead/Excel Viewでエラーが出やすい
**A:** 以下の3つのテストを追加：
1. **Smoke Test** - ページが開くか（作成済み: `specs/smoke/`）
2. **Integration Test** - バックエンドAPIが正常動作するか（作成済み: `backend/tests/integration/test_smartread_integration.py`）
3. **Critical E2E** - 主要フローが動作するか（TODO: `specs/critical/`に追加）

---

## 現在の作成済みテスト

### ✅ 作成済み
- `frontend/e2e/specs/smoke/smartread-smoke.spec.ts`
- `frontend/e2e/specs/smoke/excel-view-smoke.spec.ts`
- `frontend/e2e/specs/smoke/masters-smoke.spec.ts`
- `backend/tests/integration/test_smartread_integration.py`

### 📝 TODO（優先度順）
1. **SmartRead Critical Path E2E** (2-3時間)
   - OCR画像アップロード → 注文生成の流れ
   - エラーハンドリング確認

2. **Master CRUD Integration** (1時間)
   - 商品マスタ作成 → 在庫登録での使用
   - マスタ削除時の依存チェック

3. **Excel View Critical E2E** (2時間)
   - フィルタ/ソート動作確認
   - セル編集 → 保存の流れ

---

## 参考資料

- 詳細戦略: [docs/project/TESTING_STRATEGY.md](./TESTING_STRATEGY.md)
- E2E現状: [frontend/e2e/current_status.md](../../frontend/e2e/current_status.md)
- Playwright Docs: https://playwright.dev/docs/intro
