"""Phase 5: B-Plan - Refresh database views for lot_receipts.

Updates all views that reference the old 'lots' table to use 'lot_receipts'.
Also creates new v_lot_receipt_stock view for inventory with computed remaining quantity.

Revision ID: b5_refresh_views
Revises: b4_data_migration
Create Date: 2026-01-15
"""

import sqlalchemy as sa

from alembic import op


# revision identifiers, used by Alembic.
revision = "b5_refresh_views"
down_revision = "b4_data_migration"
branch_labels = None
depends_on = None


VIEWS_SQL = """
-- ============================================================
-- B-Plan Views: Updated for lot_receipts (formerly lots)
-- ============================================================

-- 1. Drop existing views (CASCADE for dependencies)
DROP VIEW IF EXISTS public.v_lot_receipt_stock CASCADE;
DROP VIEW IF EXISTS public.v_candidate_lots_by_order_line CASCADE;
DROP VIEW IF EXISTS public.v_lot_details CASCADE;
DROP VIEW IF EXISTS public.v_inventory_summary CASCADE;
DROP VIEW IF EXISTS public.v_lot_available_qty CASCADE;
DROP VIEW IF EXISTS public.v_lot_current_stock CASCADE;
DROP VIEW IF EXISTS public.v_lot_allocations CASCADE;

-- 2. Recreate v_lot_allocations
CREATE VIEW public.v_lot_allocations AS
SELECT
    lot_id,
    SUM(reserved_qty) as allocated_quantity
FROM public.lot_reservations
WHERE status IN ('active', 'confirmed')
GROUP BY lot_id;

-- 3. Recreate v_lot_current_stock (for backward compatibility)
CREATE VIEW public.v_lot_current_stock AS
SELECT
    lr.id AS lot_id,
    lr.product_id,
    lr.warehouse_id,
    lr.received_quantity AS current_quantity,
    lr.updated_at AS last_updated
FROM public.lot_receipts lr
WHERE lr.received_quantity > 0;

-- 4. Create v_lot_available_qty with computed remaining
CREATE VIEW public.v_lot_available_qty AS
SELECT 
    lr.id AS lot_id,
    lr.product_id,
    lr.warehouse_id,
    GREATEST(
        lr.received_quantity 
        - COALESCE(wl_sum.total_withdrawn, 0) 
        - COALESCE(la.allocated_quantity, 0) 
        - lr.locked_quantity, 
        0
    ) AS available_qty,
    lr.received_date AS receipt_date,
    lr.expiry_date,
    lr.status AS lot_status
FROM public.lot_receipts lr
LEFT JOIN public.v_lot_allocations la ON lr.id = la.lot_id
LEFT JOIN (
    SELECT wl.lot_receipt_id, SUM(wl.quantity) AS total_withdrawn
    FROM public.withdrawal_lines wl
    JOIN public.withdrawals wd ON wl.withdrawal_id = wd.id
    WHERE wd.cancelled_at IS NULL
    GROUP BY wl.lot_receipt_id
) wl_sum ON wl_sum.lot_receipt_id = lr.id
WHERE 
    lr.status = 'active'
    AND (lr.expiry_date IS NULL OR lr.expiry_date >= CURRENT_DATE)
    AND (lr.received_quantity - COALESCE(wl_sum.total_withdrawn, 0) - COALESCE(la.allocated_quantity, 0) - lr.locked_quantity) > 0;

-- 5. Create v_inventory_summary with lot_receipts
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
    lr.product_id,
    lr.warehouse_id,
    COUNT(*) FILTER (WHERE lr.status = 'active') AS active_lot_count,
    SUM(lr.received_quantity) FILTER (WHERE lr.status = 'active') AS total_quantity,
    SUM(COALESCE(la.allocated_quantity, 0)) FILTER (WHERE lr.status = 'active') AS allocated_quantity,
    SUM(lr.locked_quantity) FILTER (WHERE lr.status = 'active') AS locked_quantity,
    GREATEST(
      SUM(lr.received_quantity) FILTER (WHERE lr.status = 'active')
      - SUM(COALESCE(la.allocated_quantity, 0)) FILTER (WHERE lr.status = 'active')
      - SUM(lr.locked_quantity) FILTER (WHERE lr.status = 'active'),
      0
    ) AS available_quantity,
    COALESCE(SUM(ipl.planned_quantity), 0) AS provisional_stock,
    GREATEST(
      SUM(lr.received_quantity) FILTER (WHERE lr.status = 'active')
      - SUM(COALESCE(la.allocated_quantity, 0)) FILTER (WHERE lr.status = 'active')
      - SUM(lr.locked_quantity) FILTER (WHERE lr.status = 'active')
      + COALESCE(SUM(ipl.planned_quantity), 0),
      0
    ) AS available_with_provisional,
    MAX(lr.updated_at) AS last_updated
  FROM public.lot_receipts lr
  LEFT JOIN public.v_lot_allocations la ON lr.id = la.lot_id
  LEFT JOIN public.inbound_plan_lines ipl ON lr.product_id = ipl.product_id
  LEFT JOIN public.inbound_plans ip ON ipl.inbound_plan_id = ip.id AND ip.status = 'planned'
  GROUP BY lr.product_id, lr.warehouse_id
) agg ON agg.product_id = pw.product_id AND agg.warehouse_id = pw.warehouse_id
WHERE pw.is_active = true;

COMMENT ON VIEW public.v_inventory_summary IS '在庫集計ビュー（product_warehouse起点、lot_receipts対応）';

-- 6. Create v_lot_details with lot_master join
CREATE VIEW public.v_lot_details AS
SELECT
    lr.id AS lot_id,
    lm.lot_number,
    lr.product_id,
    COALESCE(p.maker_part_code, '') AS maker_part_code,
    COALESCE(p.product_name, '[削除済み製品]') AS product_name,
    lr.warehouse_id,
    COALESCE(w.warehouse_code, '') AS warehouse_code,
    COALESCE(w.warehouse_name, '[削除済み倉庫]') AS warehouse_name,
    COALESCE(w.short_name, LEFT(w.warehouse_name, 10)) AS warehouse_short_name,
    lm.supplier_id,
    COALESCE(s.supplier_code, '') AS supplier_code,
    COALESCE(s.supplier_name, '[削除済み仕入先]') AS supplier_name,
    COALESCE(s.short_name, LEFT(s.supplier_name, 10)) AS supplier_short_name,
    lr.received_date,
    lr.expiry_date,
    lr.received_quantity,
    -- Computed: withdrawn quantity
    COALESCE(wl_sum.total_withdrawn, 0) AS withdrawn_quantity,
    -- Computed: remaining quantity
    GREATEST(lr.received_quantity - COALESCE(wl_sum.total_withdrawn, 0) - lr.locked_quantity, 0) AS remaining_quantity,
    GREATEST(lr.received_quantity - COALESCE(wl_sum.total_withdrawn, 0) - lr.locked_quantity, 0) AS current_quantity,
    -- Allocated quantity from reservations
    COALESCE(la.allocated_quantity, 0) AS allocated_quantity,
    lr.locked_quantity,
    -- Computed: available quantity
    GREATEST(
        lr.received_quantity - COALESCE(wl_sum.total_withdrawn, 0) 
        - lr.locked_quantity - COALESCE(la.allocated_quantity, 0),
        0
    ) AS available_quantity,
    lr.unit,
    lr.status,
    lr.lock_reason,
    CASE WHEN lr.expiry_date IS NOT NULL THEN CAST((lr.expiry_date - CURRENT_DATE) AS INTEGER) ELSE NULL END AS days_to_expiry,
    lr.temporary_lot_key,
    lr.receipt_key,
    lr.lot_master_id,
    usa_primary.user_id AS primary_user_id,
    u_primary.username AS primary_username,
    u_primary.display_name AS primary_user_display_name,
    CASE WHEN p.valid_to IS NOT NULL AND p.valid_to <= CURRENT_DATE THEN TRUE ELSE FALSE END AS product_deleted,
    CASE WHEN w.valid_to IS NOT NULL AND w.valid_to <= CURRENT_DATE THEN TRUE ELSE FALSE END AS warehouse_deleted,
    CASE WHEN s.valid_to IS NOT NULL AND s.valid_to <= CURRENT_DATE THEN TRUE ELSE FALSE END AS supplier_deleted,
    lr.created_at,
    lr.updated_at
FROM public.lot_receipts lr
JOIN public.lot_master lm ON lr.lot_master_id = lm.id
LEFT JOIN public.v_lot_allocations la ON lr.id = la.lot_id
LEFT JOIN public.products p ON lr.product_id = p.id
LEFT JOIN public.warehouses w ON lr.warehouse_id = w.id
LEFT JOIN public.suppliers s ON lm.supplier_id = s.id
LEFT JOIN (
    SELECT wl.lot_receipt_id, SUM(wl.quantity) AS total_withdrawn
    FROM public.withdrawal_lines wl
    JOIN public.withdrawals wd ON wl.withdrawal_id = wd.id
    WHERE wd.cancelled_at IS NULL
    GROUP BY wl.lot_receipt_id
) wl_sum ON wl_sum.lot_receipt_id = lr.id
LEFT JOIN public.user_supplier_assignments usa_primary
    ON usa_primary.supplier_id = lm.supplier_id
    AND usa_primary.is_primary = TRUE
LEFT JOIN public.users u_primary
    ON u_primary.id = usa_primary.user_id;

COMMENT ON VIEW public.v_lot_details IS 'ロット詳細ビュー（lot_receipts対応、残量は集計で算出）';

-- 7. Recreate v_candidate_lots_by_order_line
CREATE VIEW public.v_candidate_lots_by_order_line AS
SELECT 
    c.order_line_id,
    l.lot_id,
    l.product_id,
    l.warehouse_id,
    l.available_qty,
    l.receipt_date,
    l.expiry_date
FROM public.v_order_line_context c
JOIN public.v_customer_daily_products f 
    ON f.customer_id = c.customer_id 
    AND f.product_id = c.product_id
JOIN public.v_lot_available_qty l 
    ON l.product_id = c.product_id 
    AND l.available_qty > 0
ORDER BY 
    c.order_line_id, 
    l.expiry_date, 
    l.receipt_date, 
    l.lot_id;

-- 8. Create new v_lot_receipt_stock view (canonical stock view)
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
    COALESCE(res_sum.total_reserved, 0) AS reserved_quantity,
    GREATEST(
        lr.received_quantity - COALESCE(wl_sum.total_withdrawn, 0) 
        - lr.locked_quantity - COALESCE(res_sum.total_reserved, 0),
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
LEFT JOIN (
    SELECT 
        lot_id, 
        SUM(reserved_qty) AS total_reserved
    FROM public.lot_reservations
    WHERE status IN ('active', 'confirmed')
    GROUP BY lot_id
) res_sum ON res_sum.lot_id = lr.id
WHERE lr.status = 'active';

COMMENT ON VIEW public.v_lot_receipt_stock IS '在庫一覧（残量は集計で算出、current_quantityキャッシュ化対応準備済み）';
"""


# SQL to drop B-Plan views and restore old ones
DOWNGRADE_SQL = """
-- Drop B-Plan views
DROP VIEW IF EXISTS public.v_lot_receipt_stock CASCADE;
DROP VIEW IF EXISTS public.v_candidate_lots_by_order_line CASCADE;
DROP VIEW IF EXISTS public.v_lot_details CASCADE;
DROP VIEW IF EXISTS public.v_inventory_summary CASCADE;
DROP VIEW IF EXISTS public.v_lot_available_qty CASCADE;
DROP VIEW IF EXISTS public.v_lot_current_stock CASCADE;
DROP VIEW IF EXISTS public.v_lot_allocations CASCADE;
"""


def upgrade() -> None:
    op.execute(sa.text(VIEWS_SQL))


def downgrade() -> None:
    op.execute(sa.text(DOWNGRADE_SQL))
    # Note: To fully restore old views, run the original create_views.sql
    # after renaming lot_receipts back to lots in b3 downgrade
