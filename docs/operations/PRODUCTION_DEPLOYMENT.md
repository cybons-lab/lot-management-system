# 本番環境デプロイガイド

Windows サーバー（PostgreSQL + Python venv）へのデプロイ手順書です。

## 📋 目次

1. [前提条件](#前提条件)
2. [PostgreSQL セットアップ](#postgresql-セットアップ)
3. [デプロイパッケージの展開](#デプロイパッケージの展開)
4. [Python 環境構築](#python-環境構築)
5. [環境変数設定](#環境変数設定)
6. [データベースマイグレーション](#データベースマイグレーション)
7. [アプリケーション起動](#アプリケーション起動)
8. [運用保守](#運用保守)

---

## 前提条件

| 項目 | 要件 |
|------|------|
| OS | Windows Server 2019 以降 |
| Python | 3.13 以上 |
| PostgreSQL | 15 以上 |
| Node.js | 20 以上（ビルド済みパッケージ使用時は不要） |

---

## PostgreSQL セットアップ

### 1. PostgreSQL インストール

[公式サイト](https://www.postgresql.org/download/windows/) からダウンロード・インストール。

### 2. データベースとユーザー作成

pgAdmin または `psql` で以下を実行:

```sql
-- 1. ユーザー作成
CREATE USER dxpj_user WITH PASSWORD 'your_secure_password' CREATEDB;

-- 2. データベース作成
CREATE DATABASE lot_management
  WITH OWNER = dxpj_user
  ENCODING = 'UTF8'
  LC_COLLATE = 'Japanese_Japan.932'
  LC_CTYPE = 'Japanese_Japan.932';

-- 3. 権限付与
GRANT ALL PRIVILEGES ON DATABASE lot_management TO dxpj_user;

-- 4. スキーマ権限（PostgreSQL 15以降で必要）
\c lot_management
GRANT ALL ON SCHEMA public TO dxpj_user;
```

---

## デプロイパッケージの展開

### 1. パッケージ作成（開発マシン）

```powershell
# プロジェクトルートで実行
python scripts/build_deploy_package.py
```

生成される `deploy/lot-management-deploy-YYYYMMDD.zip` を本番サーバーにコピー。

### 2. 展開

```powershell
# 任意のディレクトリに展開
Expand-Archive -Path lot-management-deploy-YYYYMMDD.zip -DestinationPath C:\Apps\lot-management
```

---

## Python 環境構築

### 1. 仮想環境作成

```powershell
cd C:\Apps\lot-management\backend

# 仮想環境作成
python -m venv .venv

# 有効化
.\.venv\Scripts\Activate.ps1

# 依存関係インストール
pip install --upgrade pip
pip install -r requirements.txt
```

---

## 環境変数設定

`backend/.env` を作成:

```env
# 本番環境設定
ENVIRONMENT=production

# データベース接続
DATABASE_URL=postgresql://dxpj_user:your_secure_password@localhost:5432/lot_management

# CORS設定（同一オリジン配信の場合）
CORS_ORIGINS=http://localhost:8000

# JWT秘密鍵（必ず変更すること）
SECRET_KEY=your-production-secret-key-here

# ログ設定
LOG_LEVEL=WARNING
LOG_FILE_ENABLED=true
LOG_JSON_FORMAT=true
```

> ⚠️ **重要**: `SECRET_KEY` は必ずランダムな文字列に変更してください。

---

## データベースマイグレーション

```powershell
# 仮想環境が有効な状態で実行
cd C:\Apps\lot-management\backend

# Alembic マイグレーション
alembic upgrade head

# ビュー作成
python scripts/apply_views.py
```

---

## アプリケーション起動

### 開発・テスト用

```powershell
cd C:\Apps\lot-management\backend
.\.venv\Scripts\Activate.ps1

uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### 本番サービス化（推奨）

Windows サービスとして登録する場合は [NSSM](https://nssm.cc/) を使用:

```powershell
# NSSM インストール後
nssm install LotManagement "C:\Apps\lot-management\backend\.venv\Scripts\python.exe"
nssm set LotManagement AppParameters "-m uvicorn app.main:app --host 0.0.0.0 --port 8000"
nssm set LotManagement AppDirectory "C:\Apps\lot-management\backend"
nssm start LotManagement
```

---

## フロントエンドの確認

デプロイパッケージには `frontend/dist/` が含まれています。

FastAPI が静的ファイルを配信するよう設定済みのため、
`http://your-server:8000/` にアクセスすればフロントエンドが表示されます。

---

## 運用保守

### ログ確認

```powershell
# ログディレクトリ
C:\Apps\lot-management\backend\logs\
```

### データベースバックアップ

```powershell
# pg_dump でバックアップ
pg_dump -U dxpj_user -h localhost lot_management > backup_YYYYMMDD.sql
```

### アップデート手順

1. 新しいデプロイパッケージを作成
2. サービス停止
3. `backend/app/`, `frontend/dist/` を上書き
4. `alembic upgrade head` でマイグレーション
5. サービス再起動

---

## トラブルシューティング

### 接続エラー

```
原因: PostgreSQL が起動していない / 認証情報が間違っている
対処: services.msc で PostgreSQL サービスを確認、.env の DATABASE_URL を確認
```

### ポート競合

```powershell
# 8000番ポートを使用中のプロセスを確認
netstat -ano | findstr :8000
```

### マイグレーションエラー

```powershell
# 現在のマイグレーション状態を確認
alembic current

# 履歴確認
alembic history
```
