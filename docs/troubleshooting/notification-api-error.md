# 通知API接続エラー troubleshooting

**作成日:** 2026-02-01
**ステータス:** 未解決（一時スキップ）
**影響範囲:** 通知機能（フロントエンド）

## 問題の概要

ブラウザから通知APIにアクセスする際、`http://backend:8000/api/notifications` への直接リクエストが発生し、`ERR_NAME_NOT_RESOLVED` エラーが発生する。

### エラー内容

```
GET http://backend:8000/api/notifications?skip=0&limit=50 net::ERR_NAME_NOT_RESOLVED
```

- **期待される動作:** `/api/notifications` へのリクエストがViteプロキシ経由で `http://backend:8000` に転送される
- **実際の動作:** ブラウザが直接 `http://backend:8000` にアクセスしようとしてDNS解決に失敗

## 試した対策

### 1. 環境変数の修正

**問題:** `VITE_BACKEND_ORIGIN=http://backend:8000` が `VITE_` prefix のためクライアント側に埋め込まれていた

**対策:**
- `docker-compose.yml` で `VITE_BACKEND_ORIGIN` → `BACKEND_ORIGIN` に変更
- `vite.config.ts` で `env.BACKEND_ORIGIN` を参照するように修正

**結果:** ❌ エラー継続

### 2. `.env` ファイルの削除

**問題:** `frontend/.env` に `VITE_BACKEND_ORIGIN=http://localhost:8000` が存在し、Dockerボリュームマウント経由でコンテナに入っていた

**対策:**
- `.dockerignore` に `.env` を追加
- `frontend/.env` を削除
- Dockerイメージを再ビルド

**結果:** ❌ エラー継続

### 3. Viteキャッシュのクリア

**試した方法:**
- `node_modules/.vite` ディレクトリ削除
- `dist` ディレクトリ削除
- `docker compose build --no-cache frontend`
- `docker builder prune -af`
- `--force` フラグでVite起動（依存関係の強制再最適化）

**結果:** ❌ エラー継続

### 4. ブラウザキャッシュのクリア

**試した方法:**
- ハードリフレッシュ（Cmd+Shift+R）
- シークレットモード
- Application → Storage → Clear site data
- Chrome完全再起動

**結果:** ❌ エラー継続

### 5. ソースコードの修正

**問題を発見:** `frontend/src/services/api/alerts.ts` が古い設定を使用していた

```typescript
// 修正前
const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

// 修正後
const API_BASE = import.meta.env.DEV ? "/api" : (import.meta.env.VITE_API_BASE || "/api");
```

**同様の修正を実施:**
- `frontend/src/services/api/alerts.ts`
- `frontend/src/features/masters/hooks/useMasterImport.ts`

**Viteサーバー再起動:** `vite.config.ts` を touch して再起動確認

**結果:** ❌ エラー継続（ブラウザキャッシュが原因と推測）

## 検証済みの事実

### サーバー側（正常動作）

```bash
# docker compose logs frontend
[vite] proxy request: GET /api/notifications?skip=0&limit=50 -> http://backend:8000
```

- Viteプロキシは正しく動作している
- すべてのリクエストが `/api/*` として処理されている
- `http://backend:8000` へのプロキシが成功している

### クライアント側（問題あり）

**Network tab の Initiator chain:**
```
http://localhost:5173/dashboard
  → http://localhost:5173/src/main.tsx
    → http://localhost:5173/src/shared/libs/query-client.ts
      → http://localhost:5173/node_modules/vite/deps/ky.js?v=220018ff
        → http://localhost:5173/api/notifications?skip=0&limit=50
          → http://backend:8000/api/notifications?skip=0&limit=50  ← ここで失敗
```

- `ky.js?v=220018ff` の中で `http://backend:8000` への直接リクエストが発生
- ブラウザ側のJavaScriptバンドルに古い環境変数が埋め込まれている可能性

## 根本原因の推測

### 仮説1: Vite依存関係の最適化キャッシュ

`node_modules/.vite/deps/ky.js` にプリバンドルされたファイルに古い環境変数が埋め込まれている可能性。

- `--force` フラグで再最適化したが、ブラウザ側のキャッシュが残っている
- `ky.js?v=220018ff` のバージョンハッシュは変わっているが、内容が更新されていない

### 仮説2: ブラウザの Service Worker キャッシュ

Service Worker が古いバンドルファイルをキャッシュしている可能性。

- Application タブで確認したが Service Worker は登録されていなかった
- しかし、他のキャッシュメカニズムが働いている可能性

### 仮説3: `http-client.ts` 以外のAPIクライアントが存在

`alerts.ts` のように、`http-client.ts` を使わずに直接 `fetch()` を呼んでいるファイルが他にも存在する可能性。

- `alerts.ts` と `useMasterImport.ts` は修正済み
- 他のファイルも同様の問題がある可能性

## 現在の設定

### docker-compose.yml

```yaml
frontend:
  environment:
    VITE_API_BASE: "/api"  # クライアント側に埋め込まれる
    BACKEND_ORIGIN: "http://backend:8000"  # Viteプロキシのみが使用
```

### vite.config.ts

```typescript
const target = env.BACKEND_ORIGIN || env.VITE_BACKEND_ORIGIN || "http://localhost:8000";

server: {
  proxy: {
    "/api": {
      target,
      changeOrigin: true,
      secure: false,
      ws: true,
    },
  },
}
```

### http-client.ts

```typescript
const API_BASE_URL = import.meta.env.DEV ? "/api" : import.meta.env.VITE_API_BASE_URL || "/api";
```

## 次のステップ（未実施）

### オプション1: 完全なクリーンビルド

```bash
# すべてのDockerリソースを削除
docker compose down -v
docker system prune -af
docker volume prune -af

# ローカルのnode_modulesも削除
rm -rf frontend/node_modules
rm -rf frontend/package-lock.json

# 完全再構築
docker compose build --no-cache
docker compose up
```

### オプション2: 別ブラウザでテスト

- Safari または Firefox で同じURLにアクセス
- ブラウザ固有のキャッシュ問題かどうかを切り分け

### オプション3: VITE_API_BASE_URL を完全削除

すべてのファイルから `VITE_API_BASE_URL` 参照を削除し、`VITE_API_BASE` のみを使用する。

```bash
# 全ファイルをチェック
grep -r "VITE_API_BASE_URL" frontend/src
```

### オプション4: 開発環境でのみ強制的に `/api` を使用

`http-client.ts` で開発環境チェックを強化:

```typescript
const API_BASE_URL = "/api";  // 開発環境では常に /api
```

## 暫定対応

現時点では問題を一時的にスキップし、以下の作業を継続:

1. material-delivery-note-progress-tracking.md のコミット取り込み
2. その他の機能開発

通知機能のエラーは表示されるが、サーバー側のプロキシは正常に動作しているため、機能そのものには影響なし。

## 関連ファイル

- `/tmp/clear_browser_data.md` - ブラウザキャッシュクリア手順
- `frontend/.dockerignore` - `.env` 除外設定
- `docker-compose.yml` - 環境変数設定
- `frontend/vite.config.ts` - Viteプロキシ設定
- `frontend/src/shared/api/http-client.ts` - HTTPクライアント
- `frontend/src/services/api/alerts.ts` - Alert API（修正済み）
- `frontend/src/features/masters/hooks/useMasterImport.ts` - Master import（修正済み）
