# 本番環境アップデートガイド

## 問題の概要

外部から本番サーバーにアクセスすると、フロントエンドは表示されるがDBのデータが取得できない問題。

## 原因

1. **フロントエンド**: `crypto.randomUUID()` が HTTP 環境で動作しない
2. **バックエンド**: `.env` ファイルの読み込み問題（修正済み）

## 修正内容

- **PR #462**: バックエンドの `.env` 読み込み修正 (マージ済み)
- **PR #463**: 環境変数チェックツールの追加
- **PR #464**: `crypto.randomUUID` 互換性修正

## アップデート手順

### ステップ 1: 最新コードを取得

本番サーバー側で:

```bash
cd /path/to/lot-management-system
git pull origin main
```

### ステップ 2: フロントエンドを再ビルド

**ローカル（開発マシン）で実行:**

```bash
# リポジトリのルートディレクトリで
python scripts/build_deploy_package.py
```

これにより、以下が作成されます:
```
deploy/lot-management-deploy-YYYYMMDD.zip
```

### ステップ 3: ZIP ファイルを本番サーバーにコピー

```bash
# 例: SCPでコピー
scp deploy/lot-management-deploy-YYYYMMDD.zip user@server:/path/to/
```

または、USBメモリやネットワーク共有経由でコピー。

### ステップ 4: 本番サーバーでデプロイ

```bash
# 本番サーバーで
cd /path/to
unzip lot-management-deploy-YYYYMMDD.zip

# 既存のディレクトリをバックアップ
mv lot-management-system lot-management-system.backup.$(date +%Y%m%d)

# 新しいファイルを配置
mv lot-management-deploy-YYYYMMDD lot-management-system
cd lot-management-system

# Python仮想環境のセットアップ
cd backend
python3.13 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# 環境変数を確認
python check_env.py
```

### ステップ 5: フロントエンドの配置

```bash
# backend から frontend の dist をコピー
# (FastAPI が静的ファイルを配信する構成の場合)
cd /path/to/lot-management-system/backend
ln -s ../frontend/dist frontend/dist
```

または、すでに `dist` が含まれている場合はこのステップはスキップ。

### ステップ 6: バックエンドを再起動

```bash
cd /path/to/lot-management-system/backend

# 既存のプロセスを停止
pkill -f uvicorn

# または systemd の場合
# sudo systemctl restart lot-management

# 起動
./start_production.sh
```

### ステップ 7: 動作確認

#### 7.1 サーバー内から確認

```bash
# ヘルスチェック
curl http://localhost:8000/api/health

# 環境変数チェック
curl http://localhost:8000/api/env-check

# ユーザー取得テスト
curl http://localhost:8000/api/users
```

#### 7.2 外部から確認

ブラウザで:
```
http://サーバーのIP:8000
```

1. **F12** を押して開発者ツールを開く
2. **Console タブ** を確認:
   - `crypto.randomUUID` エラーが出ていないか
3. **Network タブ** を確認:
   - API リクエスト (`/api/users` など) が送信されているか
   - ステータスコードが 200 OK か

#### 7.3 トラブルシューティング

**Console に `crypto.randomUUID` エラーが表示される場合:**

キャッシュをクリアしてリロード:
- **Windows**: `Ctrl + Shift + R`
- **Mac**: `Cmd + Shift + R`

または、ハードリロード:
- **Windows**: `Ctrl + F5`
- **Mac**: `Cmd + Option + R`

**それでもエラーが出る場合:**

ビルドが正しく行われていない可能性があります。ローカルで再度:
```bash
cd frontend
rm -rf dist node_modules
npm install
npm run build
```

そして再度デプロイパッケージを作成。

## クイックチェックリスト

本番サーバーで以下を順番に確認:

- [ ] 最新コードを pull した (`git pull origin main`)
- [ ] 新しいデプロイパッケージを作成した
- [ ] ZIP を本番サーバーにコピーした
- [ ] 解凍してファイルを配置した
- [ ] Python 仮想環境をセットアップした (`pip install -r requirements.txt`)
- [ ] 環境変数が正しく読み込まれている (`python check_env.py`)
- [ ] `SECRET_KEY` が正しく設定されている (401エラー防止のため)
- [ ] バックエンドを再起動した
- [ ] `curl http://localhost:8000/api/health` が成功する
- [ ] ブラウザで外部からアクセスできる
- [ ] ブラウザの Console にエラーがない
- [ ] ブラウザの Network タブでAPIリクエストが送信されている
- [ ] DBのデータが表示される

## ロールバック方法

問題が発生した場合、バックアップから復元:

```bash
cd /path/to
mv lot-management-system lot-management-system.failed
mv lot-management-system.backup.YYYYMMDD lot-management-system
cd lot-management-system/backend
./start_production.sh
```

## 関連ドキュメント

- `PRODUCTION_SETUP.md` - 初回セットアップ手順
- `docs/troubleshooting/FRONTEND_DB_CONNECTION_CHECK.md` - トラブルシューティング
- `backend/check_env.py` - 環境変数チェックスクリプト
