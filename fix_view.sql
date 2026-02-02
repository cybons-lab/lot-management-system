CREATE OR REPLACE VIEW v_lot_receipt_stock AS
SELECT
    lr.id AS receipt_id,
    lm.id AS lot_master_id,
    lm.lot_number,
    lr.product_group_id,
    lr.supplier_item_id,
    p.maker_part_code AS product_code,
    p.product_name,
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
LEFT JOIN product_groups p ON lr.product_group_id = p.id
LEFT JOIN warehouses w ON lr.warehouse_id = w.id
LEFT JOIN suppliers s ON lm.supplier_id = s.id
LEFT JOIN (
    SELECT
        wl.lot_receipt_id,
        SUM(wl.quantity) AS total_withdrawn
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
