# テスト環境セットアップガイド

## 概要

このプロジェクトのテストは**PostgreSQL test database**を使用します。本番環境と同じDBを使うことで、以下のメリットがあります：

- ✅ 本番と完全に同じDB動作（views, BIGSERIAL, すべての機能）
- ✅ サービス層の変更不要
- ✅ SQLite互換性の問題なし

## クイックスタート

### 1. テストDBのセットアップ（初回のみ）

プロジェクトルートから実行：

```bash
# 自動セットアップスクリプト
./setup-test-db.sh
```

または手動で：

```bash
# 1. テストDB起動
docker compose -f docker-compose.test.yml up -d

# 2. 準備完了まで待機
sleep 5

# 3. マイグレーション実行
cd backend
export DATABASE_URL="postgresql://testuser:testpass@localhost:5433/lot_management_test"
source .venv/bin/activate
alembic upgrade head
```

### 2. テスト実行

```bash
cd backend
source .venv/bin/activate

# 環境変数設定
export TEST_DATABASE_URL="postgresql://testuser:testpass@localhost:5433/lot_management_test"

# 全テスト実行
pytest

# 特定のテストファイル実行
pytest tests/api/test_orders.py -v

# 特定のテスト関数実行
pytest tests/api/test_orders.py::test_list_orders_success -v

# 詳細表示
pytest tests/api/test_allocations.py -v --tb=short
```

### 3. テストDB停止

```bash
# 停止（データ保持）
docker compose -f docker-compose.test.yml down

# 停止＋データ削除
docker compose -f docker-compose.test.yml down -v
```

## テスト構成

### 作成済みテストファイル（34テストケース）

#### tests/api/test_orders.py（13テスト）
- GET /api/orders - 一覧、フィルタ（status, customer_code, date_range）
- GET /api/orders/{id} - 詳細
- POST /api/orders - 作成
- DELETE /api/orders/{id}/cancel - キャンセル
- エラーケース（404, 409, バリデーション）

#### tests/api/test_allocations.py（11テスト）
- POST /api/allocations/drag-assign - 手動割当
- POST /api/allocations/preview - FEFOプレビュー
- POST /api/allocations/commit - 割当確定
- DELETE /api/allocations/{id} - キャンセル
- エラーケース（400, 404, 409）

#### tests/api/test_allocation_suggestions.py（10テスト）
- POST /api/allocation-suggestions/preview - forecast/orderモード
- GET /api/allocation-suggestions - 一覧、フィルタ
- エラーケース（400）

## Fixture構成

### conftest.py

**db_engine** (session scope)
- テストセッション全体で1回だけ作成
- 全テーブル作成（`Base.metadata.create_all`）
- 終了時にクリーンアップ

**db** (function scope)
- 各テスト関数ごとに新しいセッション
- トランザクション分離（自動ロールバック）
- テスト後にクリーンアップ

**client**
- FastAPI TestClient
- API endpoint テスト用

### テストパターン例

```python
def test_create_order(test_db: Session):
    """注文作成テスト"""
    client = TestClient(app)

    # Override FastAPI dependency
    def override_get_db():
        yield test_db
    app.dependency_overrides[get_db] = override_get_db

    # Arrange: マスターデータ作成
    warehouse = Warehouse(warehouse_code="WH-001", ...)
    test_db.add(warehouse)
    test_db.commit()

    # Act: API呼び出し
    response = client.post("/api/orders", json={...})

    # Assert: 結果検証
    assert response.status_code == 201
    assert response.json()["order_number"] == "ORD-001"

    # Cleanup
    app.dependency_overrides.clear()
```

## トラブルシューティング

### エラー: "could not connect to server"

テストDBが起動していません：

```bash
docker compose -f docker-compose.test.yml up -d
docker compose -f docker-compose.test.yml ps  # 確認
```

### エラー: "relation does not exist"

マイグレーションが未実行：

```bash
cd backend
export DATABASE_URL="postgresql://testuser:testpass@localhost:5433/lot_management_test"
alembic upgrade head
```

### エラー: "database is being accessed by other users"

テストDB使用中：

```bash
# 全接続を切断
docker compose -f docker-compose.test.yml restart
```

### デバッグモード

SQL クエリをログ出力：

```python
# conftest.py の engine 作成時
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    echo=True,  # ← これを True に変更
)
```

## CI/CD統合

GitHub Actionsでの実行例：

```yaml
# .github/workflows/test.yml
jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15-alpine
        env:
          POSTGRES_DB: lot_management_test
          POSTGRES_USER: testuser
          POSTGRES_PASSWORD: testpass
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5433:5432

    steps:
      - uses: actions/checkout@v3
      - name: Run migrations
        run: |
          cd backend
          export DATABASE_URL="postgresql://testuser:testpass@localhost:5433/lot_management_test"
          alembic upgrade head
      - name: Run tests
        run: |
          cd backend
          export TEST_DATABASE_URL="postgresql://testuser:testpass@localhost:5433/lot_management_test"
          pytest -v
```

## ベストプラクティス

### ✅ DO
- 各テストでマスターデータを明示的に作成
- `test_db` fixture を使ってトランザクション分離
- API呼び出しは `/api` prefix 付き
- テスト終了時に `app.dependency_overrides.clear()`

### ❌ DON'T
- 複数テスト間でデータを共有しない
- グローバル状態に依存しない
- ハードコードされたIDを使わない（PostgreSQLが自動採番）
- `db.commit()` の後に検証失敗で例外を投げる（ロールバックされない）

## 関連ドキュメント

- **IMPROVEMENT_CHECKLIST.md** - テスト実装進捗
- **TEST_CREATION_SUMMARY.md** - テスト作成サマリー
- **PROJECT_REVIEW_REPORT.md** - プロジェクトレビュー

## 参考リンク

- [pytest Documentation](https://docs.pytest.org/)
- [SQLAlchemy Testing](https://docs.sqlalchemy.org/en/20/orm/session_transaction.html#joining-a-session-into-an-external-transaction-such-as-for-test-suites)
- [FastAPI Testing](https://fastapi.tiangolo.com/tutorial/testing/)
