"""fix inventory views consistency

Revision ID: b77dcffc2d98
Revises: 783df7fbb1a5
Create Date: 2026-01-18 00:15:40.299720

"""

import sqlalchemy as sa

from alembic import op


# revision identifiers, used by Alembic.
revision = "b77dcffc2d98"
down_revision = "783df7fbb1a5"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Update v_lot_details to calculate current_quantity from received - consumed
    # This fixes the inconsistency where physical current_quantity (lots table) is stale
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
        -- Corrected: Current = Received - Consumed (Physical on-hand, including locked)
        GREATEST(lr.received_quantity - lr.consumed_quantity, 0::numeric) AS remaining_quantity,
        GREATEST(lr.received_quantity - lr.consumed_quantity, 0::numeric) AS current_quantity,
        COALESCE(la.allocated_quantity, 0::numeric) AS allocated_quantity,
        COALESCE(lres.reserved_quantity_active, 0::numeric) AS reserved_quantity_active,
        lr.locked_quantity,
        -- Corrected: Available = Current - Locked - Allocated
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

    # 2. Update v_inventory_summary to use calculated sums and fix Cartesian product
    op.execute("DROP VIEW IF EXISTS v_inventory_summary CASCADE;")
    op.execute("""
    CREATE VIEW v_inventory_summary AS
    WITH lot_agg AS (
        SELECT
            l.product_id,
            l.warehouse_id,
            COUNT(l.id) FILTER (WHERE l.status = 'active' AND (l.received_quantity - l.consumed_quantity) > 0) AS active_lot_count,
            -- Total = Sum of (Received - Consumed)
            SUM(GREATEST(l.received_quantity - l.consumed_quantity, 0)) AS total_quantity,
            SUM(COALESCE(la.allocated_quantity, 0)) AS allocated_quantity,
            SUM(l.locked_quantity) AS locked_quantity,
            MAX(l.updated_at) AS last_updated
        FROM lot_receipts l
        LEFT JOIN v_lot_allocations la ON l.id = la.lot_id
        WHERE l.status = 'active'
        GROUP BY l.product_id, l.warehouse_id
    ),
    plan_agg AS (
        SELECT
            ipl.product_id,
            SUM(ipl.planned_quantity) AS provisional_stock
        FROM inbound_plan_lines ipl
        JOIN inbound_plans ip ON ipl.inbound_plan_id = ip.id
        WHERE ip.status = 'planned'
        GROUP BY ipl.product_id
    )
    SELECT
        la.product_id,
        la.warehouse_id,
        la.active_lot_count,
        la.total_quantity,
        la.allocated_quantity,
        la.locked_quantity,
        -- Available = Total - Locked - Allocated
        GREATEST(la.total_quantity - la.locked_quantity - la.allocated_quantity, 0) AS available_quantity,
        COALESCE(pa.provisional_stock, 0) AS provisional_stock,
        -- Available + Provisional
        GREATEST(la.total_quantity - la.locked_quantity - la.allocated_quantity + COALESCE(pa.provisional_stock, 0), 0) AS available_with_provisional,
        la.last_updated,
        CASE
            WHEN la.active_lot_count = 0 THEN 'no_lots'::character varying
            WHEN GREATEST(la.total_quantity - la.locked_quantity - la.allocated_quantity, 0) > 0 THEN 'in_stock'::character varying
            ELSE 'depleted_only'::character varying
        END AS inventory_state
    FROM lot_agg la
    LEFT JOIN plan_agg pa ON la.product_id = pa.product_id;
    """)


def downgrade() -> None:
    # Revert v_inventory_summary (Note: Reverting to version with potential Cartesian bug for fidelity)
    op.execute("DROP VIEW IF EXISTS v_inventory_summary CASCADE;")
    op.execute("""
    CREATE VIEW v_inventory_summary AS
    SELECT
        l.product_id,
        l.warehouse_id,
        COUNT(l.id) FILTER (WHERE l.status = 'active' AND l.remaining_quantity > 0) AS active_lot_count,
        SUM(l.remaining_quantity) AS total_quantity,
        SUM(COALESCE(la.allocated_quantity, 0)) AS allocated_quantity,
        SUM(l.locked_quantity) AS locked_quantity,
        GREATEST(SUM(l.remaining_quantity) - SUM(COALESCE(la.allocated_quantity, 0)) - SUM(l.locked_quantity), 0) AS available_quantity,
        COALESCE(SUM(ipl.planned_quantity), 0) AS provisional_stock,
        GREATEST(SUM(l.remaining_quantity) - SUM(COALESCE(la.allocated_quantity, 0)) - SUM(l.locked_quantity) + COALESCE(SUM(ipl.planned_quantity), 0), 0) AS available_with_provisional,
        MAX(l.updated_at) AS last_updated,
        'no_lots'::character varying AS inventory_state
    FROM lot_receipts l
    LEFT JOIN v_lot_allocations la ON l.id = la.lot_id
    LEFT JOIN inbound_plan_lines ipl ON l.product_id = ipl.product_id
    LEFT JOIN inbound_plans ip ON ipl.inbound_plan_id = ip.id AND ip.status = 'planned'
    WHERE l.status = 'active'
    GROUP BY l.product_id, l.warehouse_id;
    """)

    # Revert v_lot_details
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
        -- Revert: Use physical columns
        lr.remaining_quantity,
        lr.remaining_quantity AS current_quantity,
        COALESCE(la.allocated_quantity, 0::numeric) AS allocated_quantity,
        COALESCE(lres.reserved_quantity_active, 0::numeric) AS reserved_quantity_active,
        lr.locked_quantity,
        -- Revert: Available uses physical remaining
        GREATEST(lr.remaining_quantity - lr.locked_quantity - COALESCE(la.allocated_quantity, 0::numeric), 0::numeric) AS available_quantity,
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
