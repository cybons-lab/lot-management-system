# テストデータベースの使用方法

## 概要

このプロジェクトでは、開発用DBとテスト用DBを分離しています。

- **開発用DB**: `db-postgres` (port 5432)
- **テスト用DB**: `db-postgres-test` (port 5433)

## テストDBの起動

テストDBは`test`プロファイルで管理されており、必要な時のみ起動します。

```bash
# テストDBを起動
docker compose --profile test up -d db-postgres-test

# テストDBの状態確認
docker compose ps db-postgres-test

# テストDBを停止
docker compose --profile test down
```

## テストの実行

### Dockerコンテナ内から実行（推奨）

```bash
# テストDBを起動
docker compose --profile test up -d db-postgres-test

# テスト実行
docker compose exec backend pytest

# 特定のテストファイルを実行
docker compose exec backend pytest tests/services/test_lot_service.py -v
```

**注意**: Dockerコンテナ内では、環境変数`TEST_DATABASE_URL`が自動的に設定されます：
```
TEST_DATABASE_URL=postgresql+psycopg2://testuser:testpass@db-postgres-test:5432/lot_management_test
```

### ホストから実行（ローカル開発時）

ホストからテストを実行する場合は、`localhost:5433`を使用します：

```bash
# テストDBを起動
docker compose --profile test up -d db-postgres-test

# 環境変数を設定（オプション）
export TEST_DATABASE_URL="postgresql+psycopg2://testuser:testpass@localhost:5433/lot_management_test"

# テスト実行
cd backend
pytest
```

**デフォルト設定**: `backend/tests/conftest.py`はデフォルトで`localhost:5433`を使用します。

## テストDB仕様

| 項目 | 値 |
|------|------|
| ホスト（Docker内） | `db-postgres-test` |
| ホスト（ホストから） | `localhost` |
| ポート（Docker内） | `5432` |
| ポート（ホストから） | `5433` |
| データベース名 | `lot_management_test` |
| ユーザー名 | `testuser` |
| パスワード | `testpass` |
| ストレージ | tmpfs（メモリ上、高速） |

## CI/CD

### GitHub Actions

GitHub Actionsでは、`services:` セクションでPostgreSQLを直接起動します（`.github/workflows/ci.yml` 参照）：

```yaml
services:
  postgres:
    image: postgres:15
    env:
      POSTGRES_USER: testuser
      POSTGRES_PASSWORD: testpass
      POSTGRES_DB: lot_management_test
    ports:
      - 5432:5432
```

接続URLは `localhost:5432` を使用：
```
TEST_DATABASE_URL=postgresql+psycopg2://testuser:testpass@localhost:5432/lot_management_test
```

### ローカルDocker環境でのCI模擬

ローカルでDockerを使ってテストを実行する場合：

```bash
# 1. テストDBを起動
docker compose --profile test up -d db-postgres-test

# 2. テストを実行
docker compose exec backend uv run pytest

# 3. テスト後、テストDBを停止（オプション）
docker compose --profile test down
```

**注意:** テストDBが起動していないとテストは失敗します。エラー例：
```
sqlalchemy.exc.OperationalError: could not translate host name "db-postgres-test" to address
```

## トラブルシューティング

### ポート5433が既に使用されている

```bash
# 既存のコンテナを確認
docker ps -a | grep 5433

# 古いコンテナを削除
docker stop <container_name>
docker rm <container_name>

# 再起動
docker compose --profile test up -d db-postgres-test
```

### 接続エラー

**Dockerコンテナ内から実行している場合**:
- `db-postgres-test:5432`を使用していることを確認
- `TEST_DATABASE_URL`環境変数が正しく設定されていることを確認

**ホストから実行している場合**:
- `localhost:5433`を使用していることを確認
- テストDBが起動していることを確認: `docker compose ps db-postgres-test`
