"""fix v_inventory_summary status

Revision ID: c1bde3065827
Revises: 5de742979df0
Create Date: 2026-01-18 20:46:38.950028

"""

import sqlalchemy as sa

from alembic import op


# revision identifiers, used by Alembic.
revision = "c1bde3065827"
down_revision = "5de742979df0"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Remove "WHERE l.status = 'active'" from v_inventory_summary to include all lots (archived, depleted, etc.)
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
        -- WHERE l.status = 'active' was removed here
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
    # Revert to usage of WHERE l.status = 'active'
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
