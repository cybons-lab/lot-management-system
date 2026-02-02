# 本番環境 Phase1 修正手順（緊急対応）

## 問題
1. 得意先品番マッピング登録で422エラー（validation error）
2. 在庫一覧で500エラー（v_lot_receipt_stock.supplier_item_id が存在しない）

## 修正ファイル

### 1. customer_items_schema.py
**ファイルパス**: `backend/app/presentation/schemas/masters/customer_items_schema.py`

**修正内容**: 以下の3箇所に `validation_alias` と `serialization_alias` を追加

#### Line 26-31 (CustomerItemBase)
```python
supplier_item_id: int = Field(
    ...,
    validation_alias="product_group_id",
    serialization_alias="product_group_id",
    description="仕入先品目ID (Phase1: required)",
)
```

#### Line 49-54 (CustomerItemUpdate)
```python
supplier_item_id: int | None = Field(
    None,
    validation_alias="product_group_id",
    serialization_alias="product_group_id",
    description="仕入先品目ID",
)
```

#### Line 71-73 (CustomerItemResponse)
```python
supplier_item_id: int = Field(
    ..., serialization_alias="product_group_id", description="仕入先品目ID (Phase1: required)"
)
```

---

## PostgreSQL ビュー修正SQL

本番環境でPostgreSQLに接続して以下のSQLを実行してください。

### 方法1: pgAdmin で実行（推奨）
1. pgAdmin で本番DBに接続
2. Query Tool を開く
3. 以下のSQLを貼り付けて実行

### 方法2: Pythonスクリプトで実行
```cmd
pip install psycopg2-binary
python fix_view_direct.py --user dxpj_user --db lot_management --password <パスワード>
```

### SQL本体

```sql
-- v_lot_receipt_stock ビューを修正（supplier_item_id カラムを追加）
CREATE OR REPLACE VIEW v_lot_receipt_stock AS
SELECT
    lr.id AS receipt_id,
    lm.id AS lot_master_id,
    lm.lot_number,
    lr.product_group_id,
    lr.supplier_item_id,
    si.product_code,
    si.display_name AS product_name,
    lr.warehouse_id,
    w.warehouse_code,
    w.warehouse_name,
    COALESCE(w.short_name, LEFT(w.warehouse_name, 10)) AS warehouse_short_name,
    lm.supplier_id,
    s.supplier_code,
    s.supplier_name,
    COALESCE(s.short_name, LEFT(s.supplier_name, 10)) AS supplier_short_name,
    lr.received_date,
    lr.expiry_date,
    lr.unit,
    lr.status,
    lr.received_quantity AS initial_quantity,
    COALESCE(wl_sum.total_withdrawn, 0) AS withdrawn_quantity,
    GREATEST(lr.received_quantity - COALESCE(wl_sum.total_withdrawn, 0) - lr.locked_quantity, 0) AS remaining_quantity,
    COALESCE(la.allocated_quantity, 0) AS reserved_quantity,
    COALESCE(lar.reserved_quantity_active, 0) AS reserved_quantity_active,
    GREATEST(
        lr.received_quantity - COALESCE(wl_sum.total_withdrawn, 0)
        - lr.locked_quantity - COALESCE(la.allocated_quantity, 0),
        0
    ) AS available_quantity,
    lr.locked_quantity,
    lr.lock_reason,
    lr.inspection_status,
    lr.receipt_key,
    lr.created_at,
    lr.updated_at,
    CASE
        WHEN lr.expiry_date IS NOT NULL
        THEN (lr.expiry_date - CURRENT_DATE)::INTEGER
        ELSE NULL
    END AS days_to_expiry
FROM lot_receipts lr
JOIN lot_master lm ON lr.lot_master_id = lm.id
LEFT JOIN supplier_items si ON lr.supplier_item_id = si.id
LEFT JOIN warehouses w ON lr.warehouse_id = w.id
LEFT JOIN suppliers s ON lm.supplier_id = s.id
LEFT JOIN (
    SELECT wl.lot_receipt_id, SUM(wl.quantity) AS total_withdrawn
    FROM withdrawal_lines wl
    JOIN withdrawals wd ON wl.withdrawal_id = wd.id
    WHERE wd.status != 'cancelled'
    GROUP BY wl.lot_receipt_id
) wl_sum ON wl_sum.lot_receipt_id = lr.id
LEFT JOIN (
    SELECT lot_receipt_id, SUM(quantity) as allocated_quantity
    FROM lot_allocations
    WHERE status NOT IN ('cancelled', 'withdrawn')
    GROUP BY lot_receipt_id
) la ON la.lot_receipt_id = lr.id
LEFT JOIN (
    SELECT source_id, SUM(reserved_qty) AS reserved_quantity_active
    FROM lot_reservations
    WHERE status = 'active' AND source_type = 'ORDER'
    GROUP BY source_id
) lar ON lar.source_id = lr.id;
```

### 確認SQL

```sql
-- ビューが正しく作成されたか確認
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'v_lot_receipt_stock'
ORDER BY ordinal_position;

-- supplier_item_id が含まれているはず
```

---

## 実行手順まとめ

1. **customer_items_schema.py を修正**
   - 上記の3箇所を修正

2. **PostgreSQL ビュー修正SQL を実行**
   - pgAdmin または Python スクリプトで実行

3. **アプリケーション再起動**
   ```cmd
   # Uvicorn を再起動
   ```

4. **動作確認**
   - 得意先品番マッピングページで登録を試す
   - 在庫一覧ページを開く

---

## トラブルシューティング

### Q: 422エラーが直らない
A: customer_items_schema.py の修正が反映されていません。ファイルを確認して再デプロイしてください。

### Q: 500エラーが直らない
A: ビューのSQLが正しく実行されたか確認してください。pgAdmin で `SELECT * FROM v_lot_receipt_stock LIMIT 1;` を実行して supplier_item_id カラムが存在するか確認。

### Q: pgAdmin がない
A: Python スクリプト（fix_view_direct.py）を使用してください。

---

## 備考

- この修正は Phase1 (SKU-driven inventory) の互換性レイヤーです
- 内部的には `supplier_item_id` を使用し、API境界で `product_group_id` としてフロントエンドに公開します
- 将来的にはフロントエンドも `supplier_item_id` に統一する予定です
