# トラブルシューティング 統合ガイド

最終更新: 2025-11-25

---

## 📚 目次

1. [概要](#概要)
2. [Docker Network Debugging Guide](#docker-network-debugging-guide)
3. [DB状態確認とリセット手順](#db状態確認とリセット手順)
4. [クイックリファレンス](#クイックリファレンス)

---

## 概要

本ドキュメントは、ロット管理システムにおける一般的なトラブルシューティング手順を統合したものです。

### 統合元ドキュメント

1. **Docker Network Debugging Guide**
   - 元ファイル: `docs/troubleshooting/docker-network-debug.md`
   - 内容: Frontend から Backend への接続エラーのトラブルシューティング

2. **DB状態確認とリセット手順**
   - 元ファイル: `docs/troubleshooting/db-reset-procedure.md`
   - 内容: データベース関連エラーの診断とリセット手順

---

# Docker Network Debugging Guide

このセクションは、Frontend から Backend への接続エラーをトラブルシューティングするためのガイドです。

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

# DB状態確認とリセット手順

## 問題の症状

- `/api/masters/products` → 500エラー
- `/api/lots?with_stock=true` → 500エラー
- `/api/orders` → 500エラー
- シードデータ投入でユニーク制約違反

## 原因

1. `lot_current_stock` VIEW が存在しない可能性
2. データ不整合（シードデータの重複実行）
3. マイグレーション未適用の可能性

---

## Step 1: バックエンドログの確認

**PowerShellで実行**:
```powershell
docker logs lot-backend --tail 100
```

**確認ポイント**:
- `AttributeError` の有無
- `relation "lot_current_stock" does not exist` の有無
- SQLエラーメッセージ

---

## Step 2: PostgreSQL状態確認

### 2-1. PostgreSQLコンテナに接続

```powershell
docker exec -it lot-db-postgres psql -U admin -d lot_management
```

### 2-2. VIEWの存在確認

```sql
-- VIEWの一覧確認
\dv

-- lot_current_stock の詳細確認
\d+ lot_current_stock
```

**期待結果**:
```
                 List of relations
 Schema |        Name        | Type |  Owner
--------+--------------------+------+----------
 public | lot_current_stock  | view | admin
```

もし **"Did not find any relation"** と表示される場合 → VIEW未作成

### 2-3. データ件数確認

```sql
-- 各テーブルのデータ件数
SELECT 'customers' AS table_name, COUNT(*) FROM customers
UNION ALL
SELECT 'products', COUNT(*) FROM products
UNION ALL
SELECT 'warehouses', COUNT(*) FROM warehouses
UNION ALL
SELECT 'lots', COUNT(*) FROM lots
UNION ALL
SELECT 'orders', COUNT(*) FROM orders
UNION ALL
SELECT 'stock_movements', COUNT(*) FROM stock_movements;
```

### 2-4. 重複データの確認

```sql
-- 受注番号の重複確認
SELECT order_no, COUNT(*)
FROM orders
GROUP BY order_no
HAVING COUNT(*) > 1;
```

---

## Step 3: VIEW作成（存在しない場合のみ）

VIEWが存在しない場合、以下を実行:

```sql
CREATE OR REPLACE VIEW lot_current_stock AS
SELECT
  sm.lot_id,
  sm.product_id,
  sm.warehouse_id,
  SUM(sm.quantity_delta)::NUMERIC(15,4) AS current_quantity,
  COALESCE(MAX(sm.occurred_at), MAX(sm.created_at)) AS last_updated
FROM stock_movements sm
WHERE sm.deleted_at IS NULL
  AND sm.lot_id IS NOT NULL
GROUP BY sm.lot_id, sm.product_id, sm.warehouse_id
HAVING SUM(sm.quantity_delta) <> 0;
```

確認:
```sql
SELECT COUNT(*) FROM lot_current_stock;
```

---

## Step 4: データリセット（クリーンスタート）

### オプションA: 全データ削除＋シード再投入

```sql
-- PostgreSQL内で実行
TRUNCATE TABLE
  allocations,
  order_lines,
  orders,
  stock_movements,
  lots,
  products,
  customers,
  warehouses,
  suppliers
RESTART IDENTITY CASCADE;
```

**注意**: これで全データが削除されます！

### オプションB: 特定テーブルのみ削除

```sql
-- 受注・在庫関連のみ削除（マスタは保持）
TRUNCATE TABLE
  allocations,
  order_lines,
  orders,
  stock_movements,
  lots
RESTART IDENTITY CASCADE;
```

### PostgreSQLから退出

```sql
\q
```

---

## Step 5: シードデータ再投入

**PowerShellまたはcurlで実行**:

```powershell
curl -X 'POST' 'http://localhost:8000/api/admin/seeds' `
  -H 'accept: application/json' `
  -H 'Content-Type: application/json' `
  -d '{
  "seed": 42,
  "dry_run": false,
  "customers": 10,
  "products": 20,
  "warehouses": 3,
  "lots": 80,
  "orders": 25
}'
```

**期待結果**:
```json
{
  "message": "Seed data created successfully",
  "counts": {
    "customers": 10,
    "products": 20,
    "warehouses": 3,
    "lots": 80,
    "orders": 25
  }
}
```

---

## Step 6: API動作確認

### 6-1. マスタAPI

```powershell
# 製品マスタ
curl http://localhost:8000/api/masters/products?limit=5

# 得意先マスタ
curl http://localhost:8000/api/masters/customers?limit=5

# 倉庫マスタ
curl http://localhost:8000/api/masters/warehouses?limit=5
```

**期待**: Status 200、データ配列が返る

### 6-2. 在庫API

```powershell
curl "http://localhost:8000/api/lots?with_stock=true&limit=10"
```

**期待**: Status 200、ロットデータが返る

### 6-3. 受注API

```powershell
curl http://localhost:8000/api/orders?limit=10
```

**期待**: Status 200、受注データが返る

---

## Step 7: フロントエンド確認

1. ブラウザで http://localhost:5173 にアクセス
2. ダッシュボード → 数値が表示されるはず
3. 在庫管理ページ → ロット一覧が表示されるはず
4. ロット引当ページ → 受注一覧が表示されるはず

---

## トラブルシューティング

### まだ500エラーが出る場合

```powershell
# バックエンドを再起動
docker compose restart backend

# ログを監視
docker logs lot-backend --tail 50 --follow
```

### VIEWの再作成に失敗する場合

```sql
-- まず既存のVIEWを削除
DROP VIEW IF EXISTS lot_current_stock;

-- 再作成
CREATE VIEW lot_current_stock AS
SELECT
  sm.lot_id,
  sm.product_id,
  sm.warehouse_id,
  SUM(sm.quantity_delta)::NUMERIC(15,4) AS current_quantity,
  COALESCE(MAX(sm.occurred_at), MAX(sm.created_at)) AS last_updated
FROM stock_movements sm
WHERE sm.deleted_at IS NULL
  AND sm.lot_id IS NOT NULL
GROUP BY sm.lot_id, sm.product_id, sm.warehouse_id
HAVING SUM(sm.quantity_delta) <> 0;
```

---

## よくある質問

### Q1: データが0件だとフロントエンドでエラーになる？

**A**: 現在は改善中です。以下のUIが追加されます：
- 在庫管理ページ: 「ロットがありません」メッセージ
- ロット引当ページ: 「受注残がありません」メッセージ

### Q2: シードデータを何度も実行してしまった

**A**: `seed` パラメータを変えて実行するか、Step 4でデータをリセットしてください。

### Q3: マイグレーションはどうすればいい？

**A**: 以下で確認・実行:
```powershell
docker exec -it lot-backend alembic current
docker exec -it lot-backend alembic upgrade head
```

---

# クイックリファレンス

## よく使うコマンド

### Docker Compose操作

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

### データベース操作

```bash
# PostgreSQL接続
docker exec -it lot-db-postgres psql -U admin -d lot_management

# マイグレーション確認
docker exec -it lot-backend alembic current
docker exec -it lot-backend alembic upgrade head

# ログ確認
docker logs lot-backend --tail 100
docker logs lot-db-postgres --tail 100
```

### API確認

```bash
# ヘルスチェック
curl http://localhost:8000/api/health

# DB接続確認
curl http://localhost:8000/api/admin/healthcheck/db-counts

# マスタデータ確認
curl http://localhost:8000/api/masters/products?limit=5
curl http://localhost:8000/api/masters/customers?limit=5
curl http://localhost:8000/api/masters/warehouses?limit=5

# 在庫確認
curl "http://localhost:8000/api/lots?with_stock=true&limit=10"

# 受注確認
curl http://localhost:8000/api/orders?limit=10
```

---

## 関連ドキュメント

- [Docker Compose設定](../docker-compose.yml)
- [Vite設定](../frontend/vite.config.ts)
- [Backend設定](../backend/app/core/config.py)
- [CLAUDE.md](../CLAUDE.md) - プロジェクト全体のガイド
- [README.md](../README.md) - プロジェクト概要

---

最終更新: 2025-11-25
