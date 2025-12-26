# 開発環境セットアップ (Development Setup)

## 前提条件

- Docker Desktop (Mac/Windows) または Docker Engine (Linux)
- Git
- Node.js 20.x 以上（ローカル開発時）
- Python 3.13 以上（ローカル開発時）

## 1. クイックスタート（Docker推奨）

```bash
# 1. リポジトリをクローン
git clone https://github.com/cybons-lab/lot-management-system.git
cd lot-management-system

# 2. 環境変数を設定
cp .env.example .env

# 3. Docker Composeで起動
docker compose up -d

# 4. アクセス確認
# - Frontend: http://localhost:5173
# - Backend API: http://localhost:8000
# - API Docs: http://localhost:8000/docs
```

## 2. サービス構成

| サービス | ポート | 説明 |
|:---|:---:|:---|
| `frontend` | 5173 | Vite開発サーバー (React) |
| `backend` | 8000 | FastAPI |
| `db-postgres` | 5432 | PostgreSQL 15 |
| `pgadmin` | 5050 | pgAdmin 4 (オプション) |

### pgAdminを起動する場合

```bash
docker compose --profile ops up -d
```

## 3. 環境変数

`.env` ファイルで以下を設定可能:

```env
# Database
POSTGRES_DB=lot_management
POSTGRES_USER=admin
POSTGRES_PASSWORD=dev_password

# Backend
ENVIRONMENT=development
CORS_ORIGINS=http://localhost:5173

# pgAdmin (optional)
PGADMIN_DEFAULT_EMAIL=admin@example.com
PGADMIN_DEFAULT_PASSWORD=admin
```

## 4. マイグレーション

### 初回セットアップ

```bash
# Dockerコンテナ内で実行
docker compose exec backend alembic upgrade head

# 初期データ投入（必要な場合）
docker compose exec backend python -m scripts.seed_data
```

### 新規マイグレーション作成

```bash
docker compose exec backend alembic revision --autogenerate -m "Add new table"
docker compose exec backend alembic upgrade head
```

## 5. ローカル開発（Docker不使用）

### バックエンド

```bash
cd backend

# uv を使用（推奨）
curl -LsSf https://astral.sh/uv/install.sh | sh
uv sync

# または従来の方法
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt  # パッケージングスクリプトで生成

# 環境変数設定
export DATABASE_URL="postgresql://admin:dev_password@localhost:5432/lot_management"

# 開発サーバー起動
uvicorn app.main:app --reload --port 8000
```

### フロントエンド

```bash
cd frontend

# 依存関係インストール
npm install

# 開発サーバー起動
npm run dev
```

## 6. テスト実行

### バックエンド

```bash
# Docker環境
docker compose exec backend pytest

# ローカル環境
cd backend && pytest
```

### フロントエンド

```bash
# Docker環境
docker compose exec frontend npm test

# ローカル環境
cd frontend && npm test
```

## 7. コード品質チェック

```bash
# Lint (Backend)
docker compose exec backend ruff check .
docker compose exec backend mypy .

# Lint (Frontend)
docker compose exec frontend npm run lint

# フォーマット
docker compose exec backend ruff format .
docker compose exec frontend npm run format
```

## 8. OpenAPI スキーマ更新

バックエンドのAPIを変更した場合:

```bash
# スキーマ生成
docker compose exec backend python -m scripts.generate_openapi

# フロントエンド型定義生成
cd frontend && npm run generate:types
```

## 9. トラブルシューティング

### ポートが使用中

```bash
# 使用中のポートを確認
lsof -i :5173
lsof -i :8000
lsof -i :5432

# プロセスを終了してから再起動
docker compose down
docker compose up -d
```

### コンテナが起動しない

```bash
# ログ確認
docker compose logs backend
docker compose logs frontend

# 全てリビルド
docker compose down -v
docker compose build --no-cache
docker compose up -d
```

### データベース接続エラー

```bash
# DBコンテナの状態確認
docker compose ps db-postgres

# ヘルスチェック待機
docker compose up -d --wait
```

## 10. 便利なコマンド

```bash
# 全サービス停止
docker compose down

# ボリューム含めて削除（データリセット）
docker compose down -v

# 特定サービスのログ監視
docker compose logs -f backend

# コンテナ内でシェル起動
docker compose exec backend bash
docker compose exec frontend sh
```
