"""update v_lot_receipt_stock with supplier_item fields

Revision ID: phase3_monitor_view_update
Revises: fcb64f0fe213
Create Date: 2026-01-25 19:40:00.000000

"""

import sqlalchemy as sa

from alembic import op


# revision identifiers, used by Alembic.
revision = "phase3_monitor_view_update"
down_revision = "fcb64f0fe213"
branch_labels = None
depends_on = None


def upgrade():
    # Update v_lot_receipt_stock to include supplier_item info
    op.execute("""
DROP VIEW IF EXISTS public.v_inventory_summary CASCADE;
DROP VIEW IF EXISTS public.v_lot_receipt_stock CASCADE;

-- v_lot_receipt_stock (B-Plan: Canonical stock view)
CREATE VIEW public.v_lot_receipt_stock AS
SELECT
    lr.id AS receipt_id,
    lm.id AS lot_master_id,
    lm.lot_number,
    lr.product_id,
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
    END AS days_to_expiry,
    
    -- Phase 3 Additions: Supplier Item & Customer Part No
    lr.supplier_item_id,
    si.maker_part_no,
    ci_primary.customer_part_no
    
FROM public.lot_receipts lr
JOIN public.lot_master lm ON lr.lot_master_id = lm.id
LEFT JOIN public.products p ON lr.product_id = p.id
LEFT JOIN public.warehouses w ON lr.warehouse_id = w.id
LEFT JOIN public.suppliers s ON lm.supplier_id = s.id
LEFT JOIN public.supplier_items si ON lr.supplier_item_id = si.id
LEFT JOIN public.customer_items ci_primary 
    ON ci_primary.supplier_item_id = lr.supplier_item_id 
    AND ci_primary.is_primary = TRUE

LEFT JOIN (
    SELECT 
        wl.lot_receipt_id, 
        SUM(wl.quantity) AS total_withdrawn
    FROM public.withdrawal_lines wl
    JOIN public.withdrawals wd ON wl.withdrawal_id = wd.id
    WHERE wd.cancelled_at IS NULL
    GROUP BY wl.lot_receipt_id
) wl_sum ON wl_sum.lot_receipt_id = lr.id
LEFT JOIN public.v_lot_allocations la ON lr.id = la.lot_id
LEFT JOIN public.v_lot_active_reservations lar ON lr.id = lar.lot_id
WHERE lr.status = 'active';

COMMENT ON VIEW public.v_lot_receipt_stock IS '在庫一覧（残量は集計で算出、current_quantityキャッシュ化対応準備済み）';

-- Recreate dependent view v_inventory_summary
CREATE VIEW public.v_inventory_summary AS
SELECT
  pw.product_id,
  pw.warehouse_id,
  COALESCE(agg.active_lot_count, 0) AS active_lot_count,
  COALESCE(agg.total_quantity, 0) AS total_quantity,
  COALESCE(agg.allocated_quantity, 0) AS allocated_quantity,
  COALESCE(agg.locked_quantity, 0) AS locked_quantity,
  COALESCE(agg.available_quantity, 0) AS available_quantity,
  COALESCE(agg.provisional_stock, 0) AS provisional_stock,
  COALESCE(agg.available_with_provisional, 0) AS available_with_provisional,
  COALESCE(agg.last_updated, pw.updated_at) AS last_updated,
  CASE
    WHEN COALESCE(agg.active_lot_count, 0) = 0 THEN 'no_lots'
    WHEN COALESCE(agg.available_quantity, 0) > 0 THEN 'in_stock'
    ELSE 'depleted_only'
  END AS inventory_state
FROM public.product_warehouse pw
LEFT JOIN (
  SELECT
    lrs.product_id,
    lrs.warehouse_id,
    COUNT(*) AS active_lot_count,
    SUM(lrs.remaining_quantity) AS total_quantity,
    SUM(lrs.reserved_quantity) AS allocated_quantity,
    SUM(lrs.locked_quantity) AS locked_quantity,
    SUM(lrs.available_quantity) AS available_quantity,
    COALESCE(SUM(ipl.planned_quantity), 0) AS provisional_stock,
    GREATEST(
      SUM(lrs.available_quantity) + COALESCE(SUM(ipl.planned_quantity), 0),
      0
    ) AS available_with_provisional,
    MAX(lrs.updated_at) AS last_updated
  FROM public.v_lot_receipt_stock lrs
  LEFT JOIN public.inbound_plan_lines ipl ON lrs.product_id = ipl.product_id
  LEFT JOIN public.inbound_plans ip ON ipl.inbound_plan_id = ip.id AND ip.status = 'planned'
  GROUP BY lrs.product_id, lrs.warehouse_id
) agg ON agg.product_id = pw.product_id AND agg.warehouse_id = pw.warehouse_id
WHERE pw.is_active = true;

COMMENT ON VIEW public.v_inventory_summary IS '在庫集計ビュー（product_warehouse起点、lot_receipts対応）';
    """)


def downgrade():
    # Revert to previous definition (without new columns)
    op.execute("""
DROP VIEW IF EXISTS public.v_inventory_summary CASCADE;
DROP VIEW IF EXISTS public.v_lot_receipt_stock CASCADE;

CREATE VIEW public.v_lot_receipt_stock AS
SELECT
    lr.id AS receipt_id,
    lm.id AS lot_master_id,
    lm.lot_number,
    lr.product_id,
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
FROM public.lot_receipts lr
JOIN public.lot_master lm ON lr.lot_master_id = lm.id
LEFT JOIN public.products p ON lr.product_id = p.id
LEFT JOIN public.warehouses w ON lr.warehouse_id = w.id
LEFT JOIN public.suppliers s ON lm.supplier_id = s.id
LEFT JOIN (
    SELECT 
        wl.lot_receipt_id, 
        SUM(wl.quantity) AS total_withdrawn
    FROM public.withdrawal_lines wl
    JOIN public.withdrawals wd ON wl.withdrawal_id = wd.id
    WHERE wd.cancelled_at IS NULL
    GROUP BY wl.lot_receipt_id
) wl_sum ON wl_sum.lot_receipt_id = lr.id
LEFT JOIN public.v_lot_allocations la ON lr.id = la.lot_id
LEFT JOIN public.v_lot_active_reservations lar ON lr.id = lar.lot_id
WHERE lr.status = 'active';

CREATE VIEW public.v_inventory_summary AS
SELECT
  pw.product_id,
  pw.warehouse_id,
  COALESCE(agg.active_lot_count, 0) AS active_lot_count,
  COALESCE(agg.total_quantity, 0) AS total_quantity,
  COALESCE(agg.allocated_quantity, 0) AS allocated_quantity,
  COALESCE(agg.locked_quantity, 0) AS locked_quantity,
  COALESCE(agg.available_quantity, 0) AS available_quantity,
  COALESCE(agg.provisional_stock, 0) AS provisional_stock,
  COALESCE(agg.available_with_provisional, 0) AS available_with_provisional,
  COALESCE(agg.last_updated, pw.updated_at) AS last_updated,
  CASE
    WHEN COALESCE(agg.active_lot_count, 0) = 0 THEN 'no_lots'
    WHEN COALESCE(agg.available_quantity, 0) > 0 THEN 'in_stock'
    ELSE 'depleted_only'
  END AS inventory_state
FROM public.product_warehouse pw
LEFT JOIN (
  SELECT
    lrs.product_id,
    lrs.warehouse_id,
    COUNT(*) AS active_lot_count,
    SUM(lrs.remaining_quantity) AS total_quantity,
    SUM(lrs.reserved_quantity) AS allocated_quantity,
    SUM(lrs.locked_quantity) AS locked_quantity,
    SUM(lrs.available_quantity) AS available_quantity,
    COALESCE(SUM(ipl.planned_quantity), 0) AS provisional_stock,
    GREATEST(
      SUM(lrs.available_quantity) + COALESCE(SUM(ipl.planned_quantity), 0),
      0
    ) AS available_with_provisional,
    MAX(lrs.updated_at) AS last_updated
  FROM public.v_lot_receipt_stock lrs
  LEFT JOIN public.inbound_plan_lines ipl ON lrs.product_id = ipl.product_id
  LEFT JOIN public.inbound_plans ip ON ipl.inbound_plan_id = ip.id AND ip.status = 'planned'
  GROUP BY lrs.product_id, lrs.warehouse_id
) agg ON agg.product_id = pw.product_id AND agg.warehouse_id = pw.warehouse_id
WHERE pw.is_active = true;
    """)
