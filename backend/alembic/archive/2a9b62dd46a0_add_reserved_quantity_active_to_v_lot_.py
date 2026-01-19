"""add_reserved_quantity_active_to_v_lot_details

Revision ID: 2a9b62dd46a0
Revises: 6ea7f2902c6a
Create Date: 2026-01-17 21:30:10.046303

"""

import sqlalchemy as sa

from alembic import op


# revision identifiers, used by Alembic.
revision = "2a9b62dd46a0"
down_revision = "6ea7f2902c6a"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add reserved_quantity_active to v_lot_details view."""
    # Drop the view first to avoid column ordering issues
    op.execute("DROP VIEW IF EXISTS v_lot_details CASCADE;")

    # Recreate the view with reserved_quantity_active
    op.execute("""
    CREATE VIEW v_lot_details AS
    SELECT
        lr.id AS lot_id,
        lm.lot_number,
        lr.product_id,
        COALESCE(p.maker_part_code, ''::character varying) AS maker_part_code,
        COALESCE(p.product_name, '[削除済み製品]'::character varying) AS product_name,
        lr.warehouse_id,
        COALESCE(w.warehouse_code, ''::character varying) AS warehouse_code,
        COALESCE(w.warehouse_name, '[削除済み倉庫]'::character varying) AS warehouse_name,
        COALESCE(w.short_name, "left"(w.warehouse_name::text, 10)::character varying) AS warehouse_short_name,
        lm.supplier_id,
        COALESCE(s.supplier_code, ''::character varying) AS supplier_code,
        COALESCE(s.supplier_name, '[削除済み仕入先]'::character varying) AS supplier_name,
        COALESCE(s.short_name, "left"(s.supplier_name::text, 10)::character varying) AS supplier_short_name,
        lr.received_date,
        lr.expiry_date,
        lr.received_quantity,
        lr.consumed_quantity AS withdrawn_quantity,
        GREATEST(lr.received_quantity - lr.consumed_quantity - lr.locked_quantity, 0::numeric) AS remaining_quantity,
        GREATEST(lr.received_quantity - lr.consumed_quantity - lr.locked_quantity, 0::numeric) AS current_quantity,
        COALESCE(la.allocated_quantity, 0::numeric) AS allocated_quantity,
        COALESCE(lres.reserved_quantity_active, 0::numeric) AS reserved_quantity_active,
        lr.locked_quantity,
        GREATEST(lr.received_quantity - lr.consumed_quantity - lr.locked_quantity - COALESCE(la.allocated_quantity, 0::numeric), 0::numeric) AS available_quantity,
        lr.unit,
        lr.status,
        lr.lock_reason,
        CASE
            WHEN lr.expiry_date IS NOT NULL THEN lr.expiry_date - CURRENT_DATE
            ELSE NULL::integer
        END AS days_to_expiry,
        'not_required'::character varying AS inspection_status,
        NULL::date AS inspection_date,
        NULL::character varying AS inspection_cert_number,
        lr.temporary_lot_key,
        lr.receipt_key,
        lr.lot_master_id,
        lr.origin_type,
        lr.origin_reference,
        lr.shipping_date,
        lr.cost_price,
        lr.sales_price,
        lr.tax_rate,
        usa_primary.user_id AS primary_user_id,
        u_primary.username AS primary_username,
        u_primary.display_name AS primary_user_display_name,
        CASE
            WHEN p.valid_to IS NOT NULL AND p.valid_to <= CURRENT_DATE THEN true
            ELSE false
        END AS product_deleted,
        CASE
            WHEN w.valid_to IS NOT NULL AND w.valid_to <= CURRENT_DATE THEN true
            ELSE false
        END AS warehouse_deleted,
        CASE
            WHEN s.valid_to IS NOT NULL AND s.valid_to <= CURRENT_DATE THEN true
            ELSE false
        END AS supplier_deleted,
        lr.created_at,
        lr.updated_at
    FROM lot_receipts lr
        JOIN lot_master lm ON lr.lot_master_id = lm.id
        LEFT JOIN v_lot_allocations la ON lr.id = la.lot_id
        LEFT JOIN (
            SELECT
                lot_id,
                SUM(reserved_qty) AS reserved_quantity_active
            FROM lot_reservations
            WHERE status = 'active'
            GROUP BY lot_id
        ) lres ON lr.id = lres.lot_id
        LEFT JOIN products p ON lr.product_id = p.id
        LEFT JOIN warehouses w ON lr.warehouse_id = w.id
        LEFT JOIN suppliers s ON lm.supplier_id = s.id
        LEFT JOIN user_supplier_assignments usa_primary ON usa_primary.supplier_id = lm.supplier_id AND usa_primary.is_primary = true
        LEFT JOIN users u_primary ON u_primary.id = usa_primary.user_id;
    """)


def downgrade() -> None:
    """Remove reserved_quantity_active from v_lot_details view."""
    op.execute("DROP VIEW IF EXISTS v_lot_details CASCADE;")

    op.execute("""
    CREATE VIEW v_lot_details AS
    SELECT
        lr.id AS lot_id,
        lm.lot_number,
        lr.product_id,
        COALESCE(p.maker_part_code, ''::character varying) AS maker_part_code,
        COALESCE(p.product_name, '[削除済み製品]'::character varying) AS product_name,
        lr.warehouse_id,
        COALESCE(w.warehouse_code, ''::character varying) AS warehouse_code,
        COALESCE(w.warehouse_name, '[削除済み倉庫]'::character varying) AS warehouse_name,
        COALESCE(w.short_name, "left"(w.warehouse_name::text, 10)::character varying) AS warehouse_short_name,
        lm.supplier_id,
        COALESCE(s.supplier_code, ''::character varying) AS supplier_code,
        COALESCE(s.supplier_name, '[削除済み仕入先]'::character varying) AS supplier_name,
        COALESCE(s.short_name, "left"(s.supplier_name::text, 10)::character varying) AS supplier_short_name,
        lr.received_date,
        lr.expiry_date,
        lr.received_quantity,
        lr.consumed_quantity AS withdrawn_quantity,
        GREATEST(lr.received_quantity - lr.consumed_quantity - lr.locked_quantity, 0::numeric) AS remaining_quantity,
        GREATEST(lr.received_quantity - lr.consumed_quantity - lr.locked_quantity, 0::numeric) AS current_quantity,
        COALESCE(la.allocated_quantity, 0::numeric) AS allocated_quantity,
        lr.locked_quantity,
        GREATEST(lr.received_quantity - lr.consumed_quantity - lr.locked_quantity - COALESCE(la.allocated_quantity, 0::numeric), 0::numeric) AS available_quantity,
        lr.unit,
        lr.status,
        lr.lock_reason,
        CASE
            WHEN lr.expiry_date IS NOT NULL THEN lr.expiry_date - CURRENT_DATE
            ELSE NULL::integer
        END AS days_to_expiry,
        'not_required'::character varying AS inspection_status,
        NULL::date AS inspection_date,
        NULL::character varying AS inspection_cert_number,
        lr.temporary_lot_key,
        lr.receipt_key,
        lr.lot_master_id,
        lr.origin_type,
        lr.origin_reference,
        lr.shipping_date,
        lr.cost_price,
        lr.sales_price,
        lr.tax_rate,
        usa_primary.user_id AS primary_user_id,
        u_primary.username AS primary_username,
        u_primary.display_name AS primary_user_display_name,
        CASE
            WHEN p.valid_to IS NOT NULL AND p.valid_to <= CURRENT_DATE THEN true
            ELSE false
        END AS product_deleted,
        CASE
            WHEN w.valid_to IS NOT NULL AND w.valid_to <= CURRENT_DATE THEN true
            ELSE false
        END AS warehouse_deleted,
        CASE
            WHEN s.valid_to IS NOT NULL AND s.valid_to <= CURRENT_DATE THEN true
            ELSE false
        END AS supplier_deleted,
        lr.created_at,
        lr.updated_at
    FROM lot_receipts lr
        JOIN lot_master lm ON lr.lot_master_id = lm.id
        LEFT JOIN v_lot_allocations la ON lr.id = la.lot_id
        LEFT JOIN products p ON lr.product_id = p.id
        LEFT JOIN warehouses w ON lr.warehouse_id = w.id
        LEFT JOIN suppliers s ON lm.supplier_id = s.id
        LEFT JOIN user_supplier_assignments usa_primary ON usa_primary.supplier_id = lm.supplier_id AND usa_primary.is_primary = true
        LEFT JOIN users u_primary ON u_primary.id = usa_primary.user_id;
    """)
