"""fix_v_inventory_summary_lot_count

Revision ID: 783df7fbb1a5
Revises: 2a9b62dd46a0
Create Date: 2026-01-17 21:40:43.093340

"""

import sqlalchemy as sa

from alembic import op


# revision identifiers, used by Alembic.
revision = "783df7fbb1a5"
down_revision = "2a9b62dd46a0"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Fix v_inventory_summary to correctly count lots without duplication from inbound_plan_lines join."""
    op.execute("DROP VIEW IF EXISTS v_inventory_summary CASCADE;")

    op.execute("""
    CREATE VIEW v_inventory_summary AS
    SELECT
        pw.product_id,
        pw.warehouse_id,
        COALESCE(agg.active_lot_count, 0) AS active_lot_count,
        COALESCE(agg.total_quantity, 0) AS total_quantity,
        COALESCE(agg.allocated_quantity, 0) AS allocated_quantity,
        COALESCE(agg.locked_quantity, 0) AS locked_quantity,
        COALESCE(agg.available_quantity, 0) AS available_quantity,
        COALESCE(prov.provisional_stock, 0) AS provisional_stock,
        COALESCE(agg.available_quantity, 0) + COALESCE(prov.provisional_stock, 0) AS available_with_provisional,
        COALESCE(agg.last_updated::timestamp, pw.updated_at) AS last_updated,
        CASE
            WHEN COALESCE(agg.active_lot_count, 0) = 0 THEN 'no_lots'
            WHEN COALESCE(agg.available_quantity, 0) > 0 THEN 'in_stock'
            ELSE 'depleted_only'
        END AS inventory_state
    FROM product_warehouse pw
    LEFT JOIN (
        SELECT
            lr.product_id,
            lr.warehouse_id,
            COUNT(*) FILTER (WHERE lr.status = 'active') AS active_lot_count,
            SUM(lr.received_quantity) FILTER (WHERE lr.status = 'active') AS total_quantity,
            SUM(COALESCE(la.allocated_quantity, 0)) FILTER (WHERE lr.status = 'active') AS allocated_quantity,
            SUM(lr.locked_quantity) FILTER (WHERE lr.status = 'active') AS locked_quantity,
            GREATEST(
                SUM(lr.received_quantity) FILTER (WHERE lr.status = 'active') -
                SUM(COALESCE(la.allocated_quantity, 0)) FILTER (WHERE lr.status = 'active') -
                SUM(lr.locked_quantity) FILTER (WHERE lr.status = 'active'),
                0
            ) AS available_quantity,
            MAX(lr.updated_at) AS last_updated
        FROM lot_receipts lr
        LEFT JOIN v_lot_allocations la ON lr.id = la.lot_id
        GROUP BY lr.product_id, lr.warehouse_id
    ) agg ON agg.product_id = pw.product_id AND agg.warehouse_id = pw.warehouse_id
    LEFT JOIN (
        SELECT
            ipl.product_id,
            SUM(ipl.planned_quantity) AS provisional_stock
        FROM inbound_plan_lines ipl
        JOIN inbound_plans ip ON ipl.inbound_plan_id = ip.id AND ip.status = 'planned'
        GROUP BY ipl.product_id
    ) prov ON prov.product_id = pw.product_id
    WHERE pw.is_active = true;
    """)


def downgrade() -> None:
    """Revert to original v_inventory_summary with duplication issue."""
    op.execute("DROP VIEW IF EXISTS v_inventory_summary CASCADE;")

    op.execute("""
    CREATE VIEW v_inventory_summary AS
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
        COALESCE(agg.last_updated::timestamp, pw.updated_at) AS last_updated,
        CASE
            WHEN COALESCE(agg.active_lot_count, 0) = 0 THEN 'no_lots'
            WHEN COALESCE(agg.available_quantity, 0) > 0 THEN 'in_stock'
            ELSE 'depleted_only'
        END AS inventory_state
    FROM product_warehouse pw
    LEFT JOIN (
        SELECT
            lr.product_id,
            lr.warehouse_id,
            COUNT(*) FILTER (WHERE lr.status = 'active') AS active_lot_count,
            SUM(lr.received_quantity) FILTER (WHERE lr.status = 'active') AS total_quantity,
            SUM(COALESCE(la.allocated_quantity, 0)) FILTER (WHERE lr.status = 'active') AS allocated_quantity,
            SUM(lr.locked_quantity) FILTER (WHERE lr.status = 'active') AS locked_quantity,
            GREATEST(
                SUM(lr.received_quantity) FILTER (WHERE lr.status = 'active') -
                SUM(COALESCE(la.allocated_quantity, 0)) FILTER (WHERE lr.status = 'active') -
                SUM(lr.locked_quantity) FILTER (WHERE lr.status = 'active'),
                0
            ) AS available_quantity,
            COALESCE(SUM(ipl.planned_quantity), 0) AS provisional_stock,
            GREATEST(
                SUM(lr.received_quantity) FILTER (WHERE lr.status = 'active') -
                SUM(COALESCE(la.allocated_quantity, 0)) FILTER (WHERE lr.status = 'active') -
                SUM(lr.locked_quantity) FILTER (WHERE lr.status = 'active') +
                COALESCE(SUM(ipl.planned_quantity), 0),
                0
            ) AS available_with_provisional,
            MAX(lr.updated_at) AS last_updated
        FROM lot_receipts lr
        LEFT JOIN v_lot_allocations la ON lr.id = la.lot_id
        LEFT JOIN inbound_plan_lines ipl ON lr.product_id = ipl.product_id
        LEFT JOIN inbound_plans ip ON ipl.inbound_plan_id = ip.id AND ip.status = 'planned'
        GROUP BY lr.product_id, lr.warehouse_id
    ) agg ON agg.product_id = pw.product_id AND agg.warehouse_id = pw.warehouse_id
    WHERE pw.is_active = true;
    """)
