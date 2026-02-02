-- Comprehensive View Recreation Script
-- This script restores all views dropped by CASCADE while ensuring consistency with Phase 2 schema.

DROP VIEW IF EXISTS v_lot_details CASCADE;
DROP VIEW IF EXISTS v_inventory_summary CASCADE;
DROP VIEW IF EXISTS v_lot_receipt_stock CASCADE;
DROP VIEW IF EXISTS v_candidate_lots_by_order_line CASCADE;
DROP VIEW IF EXISTS v_lot_available_qty CASCADE;
DROP VIEW IF EXISTS v_lot_active_reservations CASCADE;
DROP VIEW IF EXISTS v_lot_allocations CASCADE;
DROP VIEW IF EXISTS v_lot_current_stock CASCADE;

-- 1. v_lot_allocations
CREATE VIEW v_lot_allocations AS
SELECT
    lot_id,
    SUM(reserved_qty) as allocated_quantity
FROM lot_reservations
WHERE status = 'confirmed'
GROUP BY lot_id;

-- 2. v_lot_active_reservations
CREATE VIEW v_lot_active_reservations AS
SELECT
    lot_id,
    SUM(reserved_qty) as reserved_quantity_active
FROM lot_reservations
WHERE status = 'active'
GROUP BY lot_id;

-- 3. v_lot_current_stock
CREATE VIEW v_lot_current_stock AS
SELECT
    lr.id AS lot_id,
    COALESCE(lr.supplier_item_id, lr.product_group_id) AS product_group_id,
    COALESCE(lr.supplier_item_id, lr.product_group_id) AS supplier_item_id,
    lr.warehouse_id,
    lr.received_quantity - lr.consumed_quantity AS current_quantity,
    lr.updated_at AS last_updated
FROM lot_receipts lr
WHERE lr.status = 'active';

-- 4. v_lot_available_qty (Depends on v_lot_allocations)
CREATE VIEW v_lot_available_qty AS
SELECT
    lr.id AS lot_id,
    COALESCE(lr.supplier_item_id, lr.product_group_id) AS product_group_id,
    COALESCE(lr.supplier_item_id, lr.product_group_id) AS supplier_item_id,
    lr.warehouse_id,
    GREATEST(
        lr.received_quantity - lr.consumed_quantity - lr.locked_quantity - COALESCE(la.allocated_quantity, 0),
        0
    ) AS available_qty,
    lr.received_date AS receipt_date,
    lr.expiry_date,
    lr.status AS lot_status
FROM lot_receipts lr
LEFT JOIN v_lot_allocations la ON lr.id = la.lot_id
WHERE lr.status = 'active'
  AND (lr.expiry_date IS NULL OR lr.expiry_date >= CURRENT_DATE);

-- 5. v_lot_receipt_stock (Depends on v_lot_allocations, v_lot_active_reservations)
CREATE VIEW v_lot_receipt_stock AS
SELECT
    lr.id AS lot_id,
    lr.id AS receipt_id,
    lm.id AS lot_master_id,
    lm.lot_number,
    COALESCE(lr.supplier_item_id, lr.product_group_id) AS product_group_id,
    COALESCE(lr.supplier_item_id, lr.product_group_id) AS supplier_item_id,
    si.maker_part_no AS product_code,
    si.maker_part_no AS maker_part_no,
    si.maker_part_no AS maker_part_code,
    si.display_name AS product_name,
    si.display_name AS display_name,
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
    lr.received_quantity,
    lr.consumed_quantity,
    (lr.received_quantity - lr.consumed_quantity) AS current_quantity,
    GREATEST(lr.received_quantity - lr.consumed_quantity - lr.locked_quantity, 0) AS remaining_quantity,
    COALESCE(la.allocated_quantity, 0) AS allocated_quantity,
    COALESCE(la.allocated_quantity, 0) AS reserved_quantity,
    COALESCE(lar.reserved_quantity_active, 0) AS reserved_quantity_active,
    GREATEST(
        lr.received_quantity - lr.consumed_quantity
        - lr.locked_quantity - COALESCE(la.allocated_quantity, 0),
        0
    ) AS available_quantity,
    lr.locked_quantity,
    lr.lock_reason,
    lr.inspection_status,
    lr.inspection_date,
    lr.inspection_cert_number,
    lr.shipping_date,
    lr.cost_price,
    lr.sales_price,
    lr.tax_rate,
    lr.temporary_lot_key,
    lr.origin_type,
    lr.origin_reference,
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
LEFT JOIN supplier_items si ON COALESCE(lr.supplier_item_id, lr.product_group_id) = si.id
LEFT JOIN warehouses w ON lr.warehouse_id = w.id
LEFT JOIN suppliers s ON lm.supplier_id = s.id
LEFT JOIN v_lot_allocations la ON lr.id = la.lot_id
LEFT JOIN v_lot_active_reservations lar ON lr.id = lar.lot_id
WHERE lr.status = 'active';

-- 6. v_inventory_summary (Depends on v_lot_receipt_stock)
CREATE VIEW v_inventory_summary AS
SELECT
  pw.product_group_id,
  pw.product_group_id AS supplier_item_id,
  pw.warehouse_id,
  COALESCE(agg.active_lot_count, 0) AS active_lot_count,
  COALESCE(agg.total_quantity, 0) AS total_quantity,
  COALESCE(agg.allocated_quantity, 0) AS allocated_quantity,
  COALESCE(agg.locked_quantity, 0) AS locked_quantity,
  COALESCE(agg.available_quantity, 0) AS available_quantity,
  0.0 AS provisional_stock,
  COALESCE(agg.available_quantity, 0) AS available_with_provisional,
  COALESCE(agg.last_updated, pw.updated_at) AS last_updated,
  CASE
    WHEN COALESCE(agg.active_lot_count, 0) = 0 THEN 'no_lots'
    WHEN COALESCE(agg.available_quantity, 0) > 0 THEN 'in_stock'
    ELSE 'depleted_only'
  END AS inventory_state
FROM product_warehouse pw
LEFT JOIN (
  SELECT
    v.supplier_item_id AS supplier_item_id,
    v.product_group_id AS product_group_id,
    v.warehouse_id,
    COUNT(*) AS active_lot_count,
    SUM(v.remaining_quantity) AS total_quantity,
    SUM(v.reserved_quantity) AS allocated_quantity,
    SUM(v.locked_quantity) AS locked_quantity,
    SUM(v.available_quantity) AS available_quantity,
    MAX(v.updated_at) AS last_updated
  FROM v_lot_receipt_stock v
  GROUP BY v.supplier_item_id, v.product_group_id, v.warehouse_id
) agg ON agg.supplier_item_id = pw.product_group_id AND agg.warehouse_id = pw.warehouse_id
WHERE pw.is_active = true;

-- 7. v_lot_details (Depends on v_lot_receipt_stock)
CREATE VIEW v_lot_details AS
SELECT
    v.*,
    si.maker_part_no AS supplier_maker_part_no,
    ci.customer_part_no,
    ci.customer_id AS primary_customer_id,
    CASE
        WHEN v.product_group_id IS NULL THEN 'no_product_group'
        ELSE 'mapped'
    END AS mapping_status,
    usa.user_id AS primary_user_id,
    u.username AS primary_username,
    u.display_name AS primary_user_display_name,
    (si.valid_to < CURRENT_DATE) AS product_deleted,
    (w.valid_to < CURRENT_DATE) AS warehouse_deleted,
    (s.valid_to < CURRENT_DATE) AS supplier_deleted
FROM v_lot_receipt_stock v
LEFT JOIN supplier_items si ON v.supplier_item_id = si.id
LEFT JOIN warehouses w ON v.warehouse_id = w.id
LEFT JOIN lot_master lm ON v.lot_master_id = lm.id
LEFT JOIN suppliers s ON lm.supplier_id = s.id
LEFT JOIN customer_items ci ON ci.supplier_item_id = v.supplier_item_id
LEFT JOIN user_supplier_assignments usa ON usa.supplier_id = s.id AND usa.is_primary = TRUE
LEFT JOIN users u ON usa.user_id = u.id;

-- 8. v_candidate_lots_by_order_line (Depends on v_lot_available_qty)
-- Requires v_order_line_context and v_customer_daily_products (which should still exist or be recreated)
CREATE OR REPLACE VIEW v_candidate_lots_by_order_line AS
SELECT
    c.order_line_id,
    l.lot_id,
    l.supplier_item_id,
    l.product_group_id,
    l.warehouse_id,
    l.available_qty,
    l.receipt_date,
    l.expiry_date
FROM v_order_line_context c
JOIN v_customer_daily_products f
    ON f.customer_id = c.customer_id
    AND f.product_group_id = c.product_group_id
JOIN v_lot_available_qty l
    ON l.product_group_id = c.product_group_id
    AND l.available_qty > 0
ORDER BY
    c.order_line_id,
    l.expiry_date,
    l.receipt_date,
    l.lot_id;
