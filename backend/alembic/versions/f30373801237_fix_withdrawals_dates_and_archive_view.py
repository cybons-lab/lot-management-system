"""fix withdrawals dates and archive view

Revision ID: f30373801237
Revises: c1bde3065827
Create Date: 2026-01-18 21:05:00.000000

"""

import sqlalchemy as sa

from alembic import op


# revision identifiers, used by Alembic.
revision = "f30373801237"
down_revision = "c1bde3065827"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Modify withdrawals table: set ship_date to NULLABLE
    op.alter_column("withdrawals", "ship_date", existing_type=sa.DATE(), nullable=True)

    # 2. Update v_inventory_summary: Separate active vs archived counts
    # active_lot_count: Only 'active' status
    # total_quantity, active_quantity: Only for 'active' lots
    # archived_lot_count: Only 'archived' status

    op.execute("DROP VIEW IF EXISTS v_inventory_summary CASCADE;")
    op.execute("""
    CREATE VIEW v_inventory_summary AS
    WITH lot_agg AS (
        SELECT
            l.product_id,
            l.warehouse_id,
            -- Active lots count
            COUNT(l.id) FILTER (WHERE l.status = 'active' AND (l.received_quantity - l.consumed_quantity) > 0) AS active_lot_count,
            -- Archived lots count
            COUNT(l.id) FILTER (WHERE l.status = 'archived') AS archived_lot_count,
            
            -- Total quantity (Active only)
            SUM(GREATEST(l.received_quantity - l.consumed_quantity, 0)) FILTER (WHERE l.status = 'active') AS total_quantity,
            
            -- Allocated quantity (All statuses, as allocation might persist until shipped/cancelled)
            SUM(COALESCE(la.allocated_quantity, 0)) AS allocated_quantity,
            
            -- Locked quantity (All statuses)
            SUM(l.locked_quantity) AS locked_quantity,
            
            MAX(l.updated_at) AS last_updated
        FROM lot_receipts l
        LEFT JOIN v_lot_allocations la ON l.id = la.lot_id
        -- We include ALL statuses here, then filter in aggregation
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
        la.archived_lot_count, -- New column
        COALESCE(la.total_quantity, 0) AS total_quantity,
        
        la.allocated_quantity,
        la.locked_quantity,
        
        -- Available = Total (Active Only) - Locked - Allocated
        GREATEST(COALESCE(la.total_quantity, 0) - la.locked_quantity - la.allocated_quantity, 0) AS available_quantity,
        
        COALESCE(pa.provisional_stock, 0) AS provisional_stock,
        
        -- Available + Provisional
        GREATEST(COALESCE(la.total_quantity, 0) - la.locked_quantity - la.allocated_quantity + COALESCE(pa.provisional_stock, 0), 0) AS available_with_provisional,
        
        la.last_updated,
        
        CASE
            WHEN la.active_lot_count = 0 THEN 'no_lots'::character varying
            WHEN GREATEST(COALESCE(la.total_quantity, 0) - la.locked_quantity - la.allocated_quantity, 0) > 0 THEN 'in_stock'::character varying
            ELSE 'depleted_only'::character varying
        END AS inventory_state
    FROM lot_agg la
    LEFT JOIN plan_agg pa ON la.product_id = pa.product_id;
    """)


def downgrade() -> None:
    # 1. Revert withdrawals table: set ship_date to NOT NULL
    # NOTE: This implies data migration if there are NULLs, but for rollback we assume safety or manual fix.
    op.alter_column("withdrawals", "ship_date", existing_type=sa.DATE(), nullable=False)

    # 2. Revert v_inventory_summary to previous version (from c1bde3065827)
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
