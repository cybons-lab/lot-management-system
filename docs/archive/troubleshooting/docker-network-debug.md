# Docker Network Debugging Guide

このドキュメントは、Frontend から Backend への接続エラーをトラブルシューティングするためのガイドです。

## 問題の症状

```
lot-frontend | [vite] http proxy error: /api/admin/stats
Error: connect ECONNREFUSED 172.20.0.3:8000
```

または

```bash
curl http://localhost:8000/api/admin/healthcheck/db-counts
curl: (56) Recv failure: Connection was aborted
```

---

## 診断手順

### 1. コンテナの状態確認

```bash
# すべてのコンテナが Running か確認
docker compose ps

# 期待される出力:
# NAME            STATUS
# lot-backend     Up
# lot-frontend    Up
# lot-db-postgres Up (healthy)
```

**チェックポイント**:
- ✅ backend が `Up` 状態であること
- ✅ db-postgres が `Up (healthy)` 状態であること
- ❌ `Restarting` や `Exited` の場合は後述のログ確認へ

---

### 2. Backend ポート待受確認

```bash
# Backend コンテナ内でポート待受を確認
docker compose exec backend sh -c "ss -lntp | grep 8000 || netstat -tlnp | grep 8000 || echo 'Port 8000 not listening'"

# 期待される出力:
# LISTEN    0    128    0.0.0.0:8000    0.0.0.0:*    users:(("python",pid=1,...))
```

**チェックポイント**:
- ✅ `0.0.0.0:8000` で待受していること（127.0.0.1ではNG）
- ❌ `Port 8000 not listening` の場合は Uvicorn 起動コマンドを確認

---

### 3. Backend ログ確認

```bash
# Backend の起動ログを確認（直近200行）
docker compose logs backend -n 200

# 成功例:
# INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
# INFO:     Started reloader process [1] using WatchFiles
# INFO:     Started server process [7]
# INFO:     Waiting for application startup.
# INFO:     Application startup complete.

# 失敗例:
# sqlalchemy.exc.OperationalError: could not connect to server
# ModuleNotFoundError: No module named 'app'
```

**チェックポイント**:
- ✅ `Uvicorn running on http://0.0.0.0:8000` が表示されること
- ✅ `Application startup complete.` が表示されること
- ❌ エラーがある場合は該当エラーを修正

---

### 4. ネットワーク疎通確認

```bash
# Frontend から Backend への疎通確認
docker compose exec frontend sh -c "wget -O- http://backend:8000/api/health || curl http://backend:8000/api/health"

# 期待される出力（JSON）:
# {"status":"ok"}
```

**チェックポイント**:
- ✅ JSON レスポンスが返ってくること
- ❌ `Connection refused` の場合は Backend の起動状態を確認
- ❌ `Name resolution failed` の場合は Docker ネットワーク設定を確認

---

### 5. ホストから Backend への疎通確認

```bash
# ホスト（開発マシン）から Backend API を確認
curl http://localhost:8000/api/health
curl http://localhost:8000/api/admin/healthcheck/db-counts

# 期待される出力:
# {"status":"ok"}
# {"status":"ok","counts":{...},"total":123}
```

**チェックポイント**:
- ✅ JSONレスポンスが返ってくること
- ❌ `Connection refused` の場合は docker-compose.yml のポート設定を確認
  - `ports: ["8000:8000"]` が正しく設定されているか

---

### 6. Frontend Vite Proxy ログ確認

```bash
# Frontend のログを確認（Vite proxy のログが表示される）
docker compose logs frontend -n 100 | grep proxy

# 成功例:
# [vite] proxy request: GET /api/health -> http://backend:8000

# 失敗例:
# [vite] proxy error: Error: connect ECONNREFUSED 172.20.0.3:8000
```

**チェックポイント**:
- ✅ `proxy request` ログで `http://backend:8000` に転送されていること
- ❌ `ECONNREFUSED` の場合は Backend の起動状態を確認

---

## 修正方法

### 問題: Backend が起動していない

**原因**: Uvicorn コマンドが正しくない、または依存関係が不足

**修正**:
```bash
# docker-compose.yml を確認
# command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Dockerfile を確認（CMD が正しいか）
# CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**検証**:
```bash
docker compose restart backend
docker compose logs backend -f
```

---

### 問題: Vite Proxy の target が間違っている

**原因**: `vite.config.ts` の `target` が Docker サービス名と一致していない

**修正**:
```typescript
// frontend/vite.config.ts
const target = process.env.VITE_BACKEND_ORIGIN || "http://backend:8000";
//                                                          ^^^^^^^
//                                      Docker Compose サービス名を使用
```

**検証**:
```bash
docker compose restart frontend
docker compose logs frontend -f
```

---

### 問題: CORS エラー

**原因**: Backend の CORS 設定が不足

**修正**:
```python
# backend/app/main.py
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

または環境変数で設定:
```yaml
# docker-compose.yml
services:
  backend:
    environment:
      CORS_ORIGINS: "http://localhost:5173,http://127.0.0.1:5173"
```

**検証**:
```bash
# ブラウザの開発者ツールで CORS エラーが出ないか確認
# または curl で OPTIONS リクエストを送信
curl -X OPTIONS http://localhost:8000/api/health -H "Origin: http://localhost:5173" -v
```

---

### 問題: データベース接続エラー

**原因**: PostgreSQL が起動していない、または接続情報が間違っている

**修正**:
```bash
# PostgreSQL の状態確認
docker compose ps db-postgres

# PostgreSQL が healthy になるまで待つ
docker compose up -d db-postgres
docker compose logs db-postgres -f
```

**検証**:
```bash
# Backend から DB に接続できるか確認
docker compose exec backend sh -c "python -c 'from app.core.database import engine; print(engine.url)'"
```

---

## クイックリファレンス

### よく使うコマンド

```bash
# 全サービスを再起動
docker compose restart

# Backend のみ再起動
docker compose restart backend

# ログをリアルタイムで確認
docker compose logs -f backend
docker compose logs -f frontend

# コンテナに入って直接確認
docker compose exec backend sh
docker compose exec frontend sh

# ネットワークの確認
docker network ls
docker network inspect lot-management-system_lot-network
```

---

## 関連ドキュメント

- [Docker Compose設定](../../docker-compose.yml)
- [Vite設定](../../frontend/vite.config.ts)
- [Backend設定](../../backend/app/core/config.py)
- [トラブルシューティング](../troubleshooting/)

---

最終更新: 2025-11-10
