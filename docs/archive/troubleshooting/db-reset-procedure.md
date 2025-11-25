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

**この手順書を実行して結果を教えてください！**
