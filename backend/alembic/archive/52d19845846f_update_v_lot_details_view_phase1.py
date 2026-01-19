"""update_v_lot_details_view_phase1

Revision ID: 52d19845846f
Revises: e69e24e713cc
Create Date: 2026-01-16 23:00:00.000000

"""

import sqlalchemy as sa

from alembic import op


# revision identifiers, used by Alembic.
revision = "52d19845846f"
down_revision = "e69e24e713cc"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
    DROP VIEW IF EXISTS public.v_lot_details CASCADE;
    
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
        
        -- Origin Tracking
        lr.origin_type,
        lr.origin_reference,

        -- Financial & Logistic
        lr.shipping_date,
        lr.cost_price,
        lr.sales_price,
        lr.tax_rate,

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
        
    COMMENT ON VIEW public.v_lot_details IS 'ロット詳細ビュー（Phase 1拡張対応: origin, shipping/cost/sales/tax追加）';
    """)


def downgrade() -> None:
    # Revert to previous definition (without new fields)
    # This is roughly the version from b5_refresh_views (or whatever was last)
    op.execute("""
    DROP VIEW IF EXISTS public.v_lot_details CASCADE;
    
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
        COALESCE(wl_sum.total_withdrawn, 0) AS withdrawn_quantity,
        GREATEST(lr.received_quantity - COALESCE(wl_sum.total_withdrawn, 0) - lr.locked_quantity, 0) AS remaining_quantity,
        GREATEST(lr.received_quantity - COALESCE(wl_sum.total_withdrawn, 0) - lr.locked_quantity, 0) AS current_quantity,
        COALESCE(la.allocated_quantity, 0) AS allocated_quantity,
        lr.locked_quantity,
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
        
    COMMENT ON VIEW public.v_lot_details IS 'ロット詳細ビュー（担当者情報含む、soft-delete対応、仮入庫対応）';
    """)
