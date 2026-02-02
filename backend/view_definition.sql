-- View definition for v_lot_receipt_stock
-- Dumped from db-postgres:5432/lot_management

CREATE OR REPLACE VIEW v_lot_receipt_stock AS
 SELECT lr.id AS lot_id,
    lr.id AS receipt_id,
    lm.id AS lot_master_id,
    lm.lot_number,
    COALESCE(lr.supplier_item_id, lr.product_group_id) AS product_group_id,
    COALESCE(lr.supplier_item_id, lr.product_group_id) AS supplier_item_id,
    si.maker_part_no AS product_code,
    si.maker_part_no,
    si.maker_part_no AS maker_part_code,
    si.display_name AS product_name,
    si.display_name,
    lr.warehouse_id,
    w.warehouse_code,
    w.warehouse_name,
    COALESCE(w.short_name, "left"(w.warehouse_name::text, 10)::character varying) AS warehouse_short_name,
    lm.supplier_id,
    s.supplier_code,
    s.supplier_name,
    COALESCE(s.short_name, "left"(s.supplier_name::text, 10)::character varying) AS supplier_short_name,
    lr.received_date,
    lr.expiry_date,
    lr.unit,
    lr.status,
    lr.received_quantity,
    lr.consumed_quantity,
    lr.received_quantity - lr.consumed_quantity AS current_quantity,
    GREATEST(lr.received_quantity - lr.consumed_quantity - lr.locked_quantity, 0::numeric) AS remaining_quantity,
    COALESCE(la.allocated_quantity, 0::numeric) AS allocated_quantity,
    COALESCE(la.allocated_quantity, 0::numeric) AS reserved_quantity,
    COALESCE(lar.reserved_quantity_active, 0::numeric) AS reserved_quantity_active,
    GREATEST(lr.received_quantity - lr.consumed_quantity - lr.locked_quantity - COALESCE(la.allocated_quantity, 0::numeric), 0::numeric) AS available_quantity,
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
            WHEN lr.expiry_date IS NOT NULL THEN lr.expiry_date - CURRENT_DATE
            ELSE NULL::integer
        END AS days_to_expiry
   FROM lot_receipts lr
     JOIN lot_master lm ON lr.lot_master_id = lm.id
     LEFT JOIN supplier_items si ON COALESCE(lr.supplier_item_id, lr.product_group_id) = si.id
     LEFT JOIN warehouses w ON lr.warehouse_id = w.id
     LEFT JOIN suppliers s ON lm.supplier_id = s.id
     LEFT JOIN v_lot_allocations la ON lr.id = la.lot_id
     LEFT JOIN v_lot_active_reservations lar ON lr.id = lar.lot_id
  WHERE lr.status::text = 'active'::text;;
