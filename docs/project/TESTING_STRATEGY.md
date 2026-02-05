# Testing Strategy - Lot Management System

## 目的

1人開発での品質担保を実現するため、**効率的なテスト戦略**を定義する。

**現状の課題:**
- SmartRead・マスタ・Excel View周りでのエラーが本番環境で発覚
- E2Eテストの不足によりリグレッションが検出できない
- 手動テストに依存しており、テスト工数が膨大

---

## テストピラミッド（推奨配分）

```
       /\
      /  \  E2E Tests (10%)        - クリティカルパスのみ
     /----\
    / 統合  \  Integration (30%)   - API統合、DB整合性
   /--------\
  /  Unit   \  Unit Tests (60%)    - ロジック、バリデーション
 /----------\
```

### 理由

- **Unit Tests (60%)**: 高速（ミリ秒）で、ロジックのバグを即座にキャッチ
- **Integration (30%)**: 中速（秒）で、API/DB間のバグをキャッチ
- **E2E (10%)**: 低速（分）で、ユーザー視点の致命的バグをキャッチ

---

## 優先順位付きテスト計画

### Phase 1: 即効性（今すぐ ~ 1週間）

**目標**: 致命的エラーを即座にキャッチ

#### 1. Smoke Tests (E2E)
- **所要時間**: 各10秒 × 3ページ = 30秒
- **対象**:
  - `frontend/e2e/specs/smoke/smartread-smoke.spec.ts` ✅ 作成済み
  - `frontend/e2e/specs/smoke/excel-view-smoke.spec.ts` ✅ 作成済み
  - `frontend/e2e/specs/smoke/masters-smoke.spec.ts` ✅ 作成済み

**実行方法**:
```bash
# Docker経由で実行
docker compose exec -T frontend npx playwright test specs/smoke --workers=1

# または Makefile に追加
make e2e-smoke
```

**CI/CDへの組み込み**:
```yaml
# .github/workflows/ci.yml に追加
- name: Run Smoke Tests
  run: docker compose exec -T frontend npx playwright test specs/smoke
```

#### 2. 型チェック・Lintの強化
```bash
# コミット前に必ず実行
make quality-check
```

**Git pre-commit hookへの追加**:
```bash
# .git/hooks/pre-commit
#!/bin/bash
make quality-check || exit 1
```

---

### Phase 2: 短期対策（2-3週間）

**目標**: クリティカルパスのバグを自動検出

#### 3. SmartRead Integration Tests (Backend)
- **所要時間**: 5秒
- **対象**:
  - `backend/tests/integration/test_smartread_integration.py` ✅ 作成済み

**追加すべきテストケース**:
```python
# test_smartread_integration.py に追加
- OCR結果の妥当性チェック（数量が負、単位不正）
- 大量注文データの処理（100行以上）
- 同時アップロード時の競合制御
```

#### 4. Master CRUD Integration Tests
```python
# backend/tests/integration/test_master_crud_integration.py

- 商品マスタ作成 → 在庫登録での使用
- 得意先マスタ更新 → 注文での反映
- マスタ削除時の依存チェック（外部キー制約）
```

#### 5. Excel View Critical Path (E2E)
```typescript
// frontend/e2e/specs/critical/excel-view-crud.spec.ts

- フィルタ適用 → ソート → データ確認
- セル編集 → 保存 → 再読み込みでの確認
- 大量データ（1000行）でのパフォーマンス
```

**実行方法**:
```bash
docker compose exec -T frontend npx playwright test specs/critical
```

---

### Phase 3: 中長期対策（1-2ヶ月）

**目標**: リグレッションを完全に防止

#### 6. Visual Regression Testing
```bash
# 正常時の画面を記録
docker compose exec -T frontend npx playwright test --update-snapshots

# 以降のテストで画面崩れを自動検出
docker compose exec -T frontend npx playwright test --reporter=html
```

**対象**: Excel View、マスタ一覧画面

#### 7. API Contract Testing
```python
# backend/tests/contract/test_api_contracts.py

- OpenAPI仕様とAPIレスポンスの一致を自動検証
- フロントエンドの型定義との整合性チェック
```

#### 8. Performance Testing
```bash
# Playwrightのトレース機能を使用
docker compose exec -T frontend npx playwright test --trace=on

# 遅い操作を可視化
npx playwright show-trace trace.zip
```

---

## テスト実行戦略

### ローカル開発時
```bash
# コミット前（必須）
make quality-check

# 機能開発時
make backend-test          # 該当モジュールのUnitテスト
make frontend-typecheck    # 型エラーチェック
```

### CI/CD（GitHub Actions）
```yaml
jobs:
  smoke-tests:
    runs-on: ubuntu-latest
    steps:
      - name: Smoke Tests
        run: make e2e-smoke
        timeout-minutes: 2

  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - name: Backend Unit Tests
        run: make backend-test
        timeout-minutes: 5

  integration-tests:
    runs-on: ubuntu-latest
    steps:
      - name: Backend Integration Tests
        run: docker compose exec -T backend pytest tests/integration
        timeout-minutes: 10

  e2e-critical:
    runs-on: ubuntu-latest
    steps:
      - name: Critical Path E2E
        run: make e2e-critical
        timeout-minutes: 15
```

---

## テスト作成ガイドライン

### E2Eテスト作成時のチェックリスト
- [ ] テストは独立している（他テストに依存しない）
- [ ] `workers=1`で安定して動作する
- [ ] 実行時間は1テストあたり30秒以内
- [ ] エラー時のスクリーンショットを自動保存
- [ ] データベースのクリーンアップを実行

### 統合テスト作成時のチェックリスト
- [ ] Mockは外部API呼び出しのみ使用
- [ ] データベース操作は実際のDBを使用
- [ ] トランザクションのロールバックでクリーンアップ
- [ ] エラーケースを必ず含める

### Unitテスト作成時のチェックリスト
- [ ] 外部依存は全てMock化
- [ ] 実行時間は1テストあたり100ms以内
- [ ] テストケース名が仕様書になっている
- [ ] AAA（Arrange-Act-Assert）パターンに従う

---

## メトリクス目標

### カバレッジ目標（3ヶ月後）
- **Backend Unit**: 80%以上
- **Backend Integration**: 主要APIエンドポイント100%
- **Frontend E2E**: クリティカルパス100%

### 実行時間目標
- **Smoke Tests**: 2分以内
- **Unit Tests**: 5分以内
- **Integration Tests**: 10分以内
- **E2E Critical**: 15分以内
- **Full E2E Suite**: 30分以内

---

## 参考資料

- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [pytest Best Practices](https://docs.pytest.org/en/stable/goodpractices.html)
- [Test Pyramid](https://martinfowler.com/articles/practical-test-pyramid.html)
