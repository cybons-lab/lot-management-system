-- Phase1 Migration View Fix
-- 本番環境で v_lot_receipt_stock を supplier_items ベースに更新
--
-- 実行方法:
--   psql -h localhost -U postgres -d lot_management -f fix_view_direct.sql
--
-- または pgAdmin で直接実行
--
-- このSQLは冪等（何度実行しても同じ結果）

DROP VIEW IF EXISTS v_lot_receipt_stock CASCADE;

CREATE OR REPLACE VIEW v_lot_receipt_stock AS
SELECT
    lr.id AS receipt_id,
    lr.lot_id,
    l.lot_number,
    l.expiry_date,
    l.production_date,
    l.supplier_item_id,
    si.product_code,
    si.display_name AS product_name,
    si.maker_part_no AS maker_part_code,
    l.supplier_id,
    s.name AS supplier_name,
    lr.warehouse_id,
    w.name AS warehouse_name,
    lr.receipt_date,
    lr.received_quantity,
    lr.inspection_status,
    lr.remarks,
    sh.quantity_change,
    COALESCE(
        (
            SELECT SUM(sh2.quantity_change)
            FROM stock_history sh2
            WHERE sh2.lot_id = l.id
              AND sh2.warehouse_id = lr.warehouse_id
        ),
        0
    ) AS current_stock
FROM
    lot_receipts lr
    JOIN lots l ON lr.lot_id = l.id
    JOIN supplier_items si ON l.supplier_item_id = si.id
    JOIN suppliers s ON l.supplier_id = s.id
    JOIN warehouses w ON lr.warehouse_id = w.id
    LEFT JOIN LATERAL (
        SELECT sh3.quantity_change
        FROM stock_history sh3
        WHERE sh3.lot_id = lr.lot_id
          AND sh3.warehouse_id = lr.warehouse_id
          AND sh3.reference_type = 'RECEIPT'
          AND sh3.reference_id = lr.id
        LIMIT 1
    ) sh ON TRUE;

-- 確認用クエリ（実行後に列が存在するか確認）
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'v_lot_receipt_stock'
ORDER BY ordinal_position;
