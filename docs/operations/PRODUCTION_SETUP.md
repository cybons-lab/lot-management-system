# 本番環境セットアップガイド

## 問題の背景

本番環境で `.venv` から起動する際、`.env` ファイルが正しく読み込まれないことがあります。
これは、実行時のカレントディレクトリが異なるために発生します。

## 解決済みの変更点

### 1. config.py の修正

- `os.getenv()` を直接使用していた箇所を Pydantic Settings の `Field()` に変更
- `.env` ファイルのパスを環境変数 `ENV_FILE` で上書き可能に

### 2. 起動スクリプトの追加

本番環境用の起動スクリプト `backend/start_production.sh` を作成しました。

## セットアップ手順

### ステップ 1: 本番用 .env ファイルの作成

```bash
cd /path/to/lot-management-system/backend
cp .env.production.example .env
```

`.env` ファイルを編集し、本番環境の値に変更します:

```bash
# 必ず変更すべき項目
ENVIRONMENT=production
DATABASE_URL=postgresql://username:password@localhost:5432/lot_management
SECRET_KEY=ランダムな長い文字列に変更すること
CORS_ORIGINS=http://本番サーバーのIP:8000
```

> [!WARNING]
> `SECRET_KEY` が設定されていない、または開発用デフォルト値のままだと、セキュリティリスクがあるだけでなく、トークンの検証に失敗して **401 Unauthorized** エラーの原因となります。必ず一意な値を設定してください。

### ステップ 2: システム環境変数での設定 (推奨)

`.env` ファイルを使用する代わりに、OSのシステム環境変数に直接設定することで、ファイル管理の手間とリスクを減らせます。

#### Windows サーバーの場合
1. 「システムのプロパティ」>「詳細設定」>「環境変数」を開きます。
2. 「システム環境変数」の「新規」をクリックします。
3. 変数名: `SECRET_KEY`、変数値: `(生成したランダム文字列)` を入力して保存します。
4. サーバー（またはアプリケーション実行プロセス）を再起動して反映させます。

#### Docker / Docker Compose の場合
`docker-compose.yml` 内に記述します：
```yaml
services:
  backend:
    environment:
      - SECRET_KEY=your-secure-random-key
      - DATABASE_URL=...
```

### ステップ 3: PostgreSQL のインストールと設定

```bash
# PostgreSQL のインストール (Ubuntu/Debian の例)
sudo apt update
sudo apt install postgresql postgresql-contrib

# データベースとユーザーの作成
sudo -u postgres psql
```

PostgreSQL のコンソールで:

```sql
CREATE DATABASE lot_management;
CREATE USER your_db_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE lot_management TO your_db_user;
\q
```

### ステップ 3: Python 仮想環境のセットアップ

```bash
cd /path/to/lot-management-system/backend
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### ステップ 4: データベースマイグレーション

```bash
source .venv/bin/activate
cd /path/to/lot-management-system/backend
alembic upgrade head
```

### ステップ 5: 起動方法の選択

#### 方法 A: 起動スクリプトを使用 (推奨)

```bash
cd /path/to/lot-management-system
./backend/start_production.sh
```

#### 方法 B: 手動起動

```bash
cd /path/to/lot-management-system/backend
source .venv/bin/activate
export ENV_FILE="$(pwd)/.env"
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

#### 方法 C: systemd サービスとして起動 (自動起動)

1. サービスファイルをコピー:

```bash
sudo cp /path/to/lot-management-system/backend/lot-management.service.example \
        /etc/systemd/system/lot-management.service
```

2. サービスファイルを編集:

```bash
sudo nano /etc/systemd/system/lot-management.service
```

以下を実際の値に変更:
- `User=your-username` → 実際のユーザー名
- `Group=your-groupname` → 実際のグループ名
- `/path/to/lot-management-system` → 実際のパス

3. ログディレクトリの作成:

```bash
sudo mkdir -p /var/log/lot-management
sudo chown your-username:your-groupname /var/log/lot-management
```

4. サービスの有効化と起動:

```bash
sudo systemctl daemon-reload
sudo systemctl enable lot-management.service
sudo systemctl start lot-management.service
```

5. ステータス確認:

```bash
sudo systemctl status lot-management.service
```

### ステップ 6: フロントエンドのビルドと配置

```bash
cd /path/to/lot-management-system/frontend
npm install
npm run build
```

ビルドされたファイル (`dist/` ディレクトリ) を Web サーバー (Nginx, Apache など) で配信します。

## 環境変数の確認方法

本番環境で `.env` ファイルが正しく読み込まれているか確認する方法:

### 方法 1: チェックスクリプトを実行 (推奨)

```bash
cd /path/to/lot-management-system/backend
source .venv/bin/activate
python check_env.py
```

**出力例:**
```
============================================================
環境変数読み込み確認
============================================================

【基本設定】
  ENVIRONMENT: production
  APP_NAME: ロット管理システム
  APP_VERSION: 2.0.0

【データベース設定】
  DATABASE_URL: postgresql://user:****@localhost:5432/lot_management
  ✅ データベースURL設定済み

【CORS設定】
  CORS_ORIGINS: ['http://192.168.1.100:8000']
  ✅ CORSオリジン設定済み (1件)

【JWT設定】
  SECRET_KEY: prod...key1
  ✅ SECRET_KEYがカスタム値に設定されています

【.env ファイル情報】
  ENV_FILE環境変数: /path/to/backend/.env
  ✅ .envファイルが見つかりました

【総合判定】
✅ 全ての設定が正しく読み込まれています!
```

### 方法 2: API エンドポイントで確認

アプリケーション起動後、ブラウザまたは curl でアクセス:

```bash
curl http://localhost:8000/api/env-check
```

**レスポンス例:**
```json
{
  "status": "ok",
  "environment": "production",
  "env_file": {
    "path": "/path/to/backend/.env",
    "exists": true,
    "size_bytes": 250
  },
  "config": {
    "database_url": "postgresql://user:****@localhost:5432/lot_management",
    "database_url_set": true,
    "secret_key": "prod...key1",
    "secret_key_is_default": false,
    "cors_origins_count": 1,
    "log_level": "WARNING"
  },
  "directories": {
    "upload_dir_exists": true,
    "log_dir_exists": true
  },
  "warnings": []
}
```

**⚠️ 注意:** このエンドポイントは本番環境では外部に公開しないでください。内部確認用です。

### 方法 3: ログを確認

アプリケーション起動時のログで環境変数が読み込まれているか確認:

```bash
# systemd の場合
sudo journalctl -u lot-management.service -f

# 直接起動の場合
tail -f /path/to/backend/logs/app.log
```

## トラブルシューティング

### 問題 1: "DATABASE_URL must be set" エラー

**原因:** `.env` ファイルが読み込まれていない

**解決策:**

1. 環境変数チェックスクリプトを実行:
```bash
cd /path/to/lot-management-system/backend
python check_env.py
```

2. `.env` ファイルが正しい場所にあるか確認:
```bash
ls -la /path/to/lot-management-system/backend/.env
```

3. 環境変数 `ENV_FILE` を明示的に設定:
```bash
export ENV_FILE="/path/to/lot-management-system/backend/.env"
```

4. 起動スクリプトを使用する

### 問題 2: 外部からアクセスできない (localhost では動く)

**原因:** CORS 設定が localhost のみになっている

**解決策:**

`.env` ファイルの `CORS_ORIGINS` を本番サーバーの IP/ドメインに変更:

```bash
# 例: サーバーの IP が 192.168.1.100 の場合
CORS_ORIGINS=http://192.168.1.100:8000,http://localhost:8000
```

### 問題 3: データベースに接続できない

**原因:** PostgreSQL が起動していない、または接続情報が間違っている

**解決策:**

1. PostgreSQL が起動しているか確認:
```bash
sudo systemctl status postgresql
```

2. データベース接続をテスト:
```bash
psql -h localhost -U your_db_user -d lot_management
```

3. `.env` の `DATABASE_URL` が正しいか確認

### 問題 4: Permission denied エラー

**原因:** ファイル/ディレクトリの権限が不足

**解決策:**

```bash
# ログディレクトリの権限を確認
ls -la /path/to/lot-management-system/backend/logs

# 必要に応じて権限を変更
chown -R your-username:your-groupname /path/to/lot-management-system
```

## セキュリティチェックリスト

- [ ] `.env` ファイルの `SECRET_KEY` を変更した
- [ ] `.env` ファイルの権限を `600` に設定 (`chmod 600 .env`)
- [ ] `ENVIRONMENT=production` に設定した
- [ ] PostgreSQL のパスワードを変更した
- [ ] ファイアウォールで不要なポートを閉じた
- [ ] HTTPS を設定した (Nginx + Let's Encrypt など)

## 参考リンク

- FastAPI デプロイメント: https://fastapi.tiangolo.com/deployment/
- Uvicorn デプロイメント: https://www.uvicorn.org/deployment/
- PostgreSQL セキュリティ: https://www.postgresql.org/docs/current/security.html
