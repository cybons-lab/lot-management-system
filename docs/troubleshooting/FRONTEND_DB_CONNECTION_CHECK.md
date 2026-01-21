# フロントエンドからDBデータが取得できない問題の診断

## 問題: 外部からアクセスするとDBのデータが表示されない

### 診断手順

#### ステップ 1: ブラウザの開発者ツールで確認

1. **F12** キーまたは右クリック → **検証** で開発者ツールを開く

2. **Console タブ**を確認:
   ```
   crypto.randomUUID is not a function
   ```
   このエラーがある場合 → **#464 の修正が必要**

3. **Network タブ**を確認:
   - リクエストが表示されている？
     - ✅ **YES** → バックエンドに到達している（ステップ2へ）
     - ❌ **NO** → フロントエンドのエラーが原因（crypto.randomUUID問題）

#### ステップ 2: バックエンドの応答を確認

Network タブで API リクエスト（例: `/api/users`, `/api/lots` など）をクリック:

##### パターン A: ステータスコード 500 (Internal Server Error)
```json
{
  "detail": "DATABASE_URL must be set"
}
```
**原因:** バックエンドで `.env` が読み込まれていない
**解決策:** #462 の修正を適用し、`start_production.sh` で起動

##### パターン B: ステータスコード 200 だがデータが空
```json
{
  "items": [],
  "total": 0
}
```
**原因:** DBは接続できているがデータが存在しない
**解決策:** サンプルデータを投入

##### パターン C: CORS エラー
```
Access to fetch at 'http://xxx' from origin 'http://yyy' has been blocked by CORS policy
```
**原因:** CORS設定が間違っている
**解決策:** `.env` の `CORS_ORIGINS` を修正

##### パターン D: Connection refused / Network error
```
Failed to fetch
net::ERR_CONNECTION_REFUSED
```
**原因:** バックエンドが起動していないか、ポートが間違っている
**解決策:** バックエンドを起動、ポート番号確認

## 問題別の解決策

### 問題 1: crypto.randomUUID エラー

**症状:**
- Console に `crypto.randomUUID is not a function`
- Network タブにリクエストが表示されない

**解決策:**
```bash
# #464 の修正をマージ
git pull origin main
cd frontend
npm install
npm run build
```

### 問題 2: .env が読み込まれていない

**症状:**
- Network タブでステータスコード 500
- `DATABASE_URL must be set` エラー

**解決策:**
```bash
# #462 の修正をマージ
git pull origin main

# check_env.py で確認
cd backend
python check_env.py

# 起動スクリプトで起動
./start_production.sh
```

### 問題 3: CORS エラー

**症状:**
- Network タブで CORS policy エラー
- リクエストは送信されているが blocked

**解決策:**
```bash
# .env を編集
vim backend/.env
```

以下を追加/修正:
```bash
CORS_ORIGINS=http://サーバーのIP:8000,http://localhost:8000
```

バックエンドを再起動:
```bash
./backend/start_production.sh
```

### 問題 4: バックエンドが起動していない

**症状:**
- Network タブで `ERR_CONNECTION_REFUSED`

**解決策:**
```bash
# バックエンドのステータス確認
ps aux | grep uvicorn

# 起動していない場合
cd backend
./start_production.sh
```

## 総合診断フローチャート

```
フロントエンドにアクセス
         |
         v
Console にエラー?
  YES → crypto.randomUUID? → #464 を適用
  NO  → 次へ
         |
         v
Network タブにリクエスト?
  NO  → Console エラーを確認
  YES → 次へ
         |
         v
ステータスコード?
  500 → バックエンドエラー → Response 確認
  200 → データが空? → DBにデータがあるか確認
  CORS → CORS設定を修正
  Connection refused → バックエンド起動確認
```

## クイックチェックリスト

本番環境で以下を順番に確認:

- [ ] バックエンドが起動している (`ps aux | grep uvicorn`)
- [ ] .env ファイルが存在する (`ls -la backend/.env`)
- [ ] 環境変数が読み込まれている (`python backend/check_env.py`)
- [ ] `/api/env-check` で status が ok (`curl http://localhost:8000/api/env-check`)
- [ ] フロントエンドがビルドされている (`ls frontend/dist/index.html`)
- [ ] ブラウザの Console にエラーがない（F12 → Console タブ）
- [ ] ブラウザの Network タブにリクエストが表示される
- [ ] API レスポンスが 200 OK

すべて ✅ なのにデータが表示されない場合:
- DBにデータが存在するか確認 (`psql -U user -d lot_management -c "SELECT COUNT(*) FROM users;"`)
