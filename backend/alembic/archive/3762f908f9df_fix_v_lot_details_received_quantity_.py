"""fix v_lot_details received_quantity alias

Revision ID: 3762f908f9df
Revises: 26bb6924c845
Create Date: 2026-01-16 08:39:58.386403

"""

import sqlalchemy as sa

from alembic import op


# revision identifiers, used by Alembic.
revision = "3762f908f9df"
down_revision = "26bb6924c845"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Fix the schema mismatch in v_lot_details by aliasing received_quantity as current_quantity
    op.execute("""
    DROP VIEW IF EXISTS public.v_lot_details CASCADE;
    CREATE VIEW public.v_lot_details AS
    SELECT
        lr.id AS lot_id,
        lr.lot_number,
        lr.product_id,
        COALESCE(p.maker_part_code, '') AS maker_part_code,
        COALESCE(p.product_name, '[削除済み製品]') AS product_name,
        lr.warehouse_id,
        COALESCE(w.warehouse_code, '') AS warehouse_code,
        COALESCE(w.warehouse_name, '[削除済み倉庫]') AS warehouse_name,
        lr.supplier_id,
        COALESCE(s.supplier_code, '') AS supplier_code,
        COALESCE(s.supplier_name, '[削除済み仕入先]') AS supplier_name,
        lr.received_date,
        lr.expiry_date,
        lr.received_quantity AS current_quantity, -- Fix: alias for SQLAlchemy model
        COALESCE(la.allocated_quantity, 0) AS allocated_quantity,
        lr.locked_quantity,
        GREATEST(lr.received_quantity - COALESCE(la.allocated_quantity, 0) - lr.locked_quantity, 0) AS available_quantity,
        lr.unit,
        lr.status,
        lr.lock_reason,
        CASE WHEN lr.expiry_date IS NOT NULL THEN CAST((lr.expiry_date - CURRENT_DATE) AS INTEGER) ELSE NULL END AS days_to_expiry,
        -- 仮入庫識別キー（UUID）
        lr.temporary_lot_key,
        -- 担当者情報を追加
        usa_primary.user_id AS primary_user_id,
        u_primary.username AS primary_username,
        u_primary.display_name AS primary_user_display_name,
        -- 論理削除フラグ（マスタの状態確認用）
        CASE WHEN p.valid_to IS NOT NULL AND p.valid_to <= CURRENT_DATE THEN TRUE ELSE FALSE END AS product_deleted,
        CASE WHEN w.valid_to IS NOT NULL AND w.valid_to <= CURRENT_DATE THEN TRUE ELSE FALSE END AS warehouse_deleted,
        CASE WHEN s.valid_to IS NOT NULL AND s.valid_to <= CURRENT_DATE THEN TRUE ELSE FALSE END AS supplier_deleted,
        lr.created_at,
        lr.updated_at
    FROM public.lot_receipts lr
    LEFT JOIN public.v_lot_allocations la ON lr.id = la.lot_id
    LEFT JOIN public.products p ON lr.product_id = p.id
    LEFT JOIN public.warehouses w ON lr.warehouse_id = w.id
    LEFT JOIN public.suppliers s ON lr.supplier_id = s.id
    -- 主担当者を結合
    LEFT JOIN public.user_supplier_assignments usa_primary
        ON usa_primary.supplier_id = lr.supplier_id
        AND usa_primary.is_primary = TRUE
    LEFT JOIN public.users u_primary
        ON u_primary.id = usa_primary.user_id;

    COMMENT ON VIEW public.v_lot_details IS 'ロット詳細ビュー（担当者情報含む、soft-delete対応、仮入庫対応） - Fix: added current_quantity alias';
    """)


def downgrade() -> None:
    # Revert to the state without the alias if needed, but usually view fixes are kept
    pass
