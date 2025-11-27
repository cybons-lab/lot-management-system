"""add_provisional_stock_to_inventory_view

Revision ID: f3e7b6fd7de7
Revises: 000000000000
Create Date: 2025-11-27 17:05:44.252257

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'f3e7b6fd7de7'
down_revision = '000000000000'  # Correct baseline
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add provisional_stock and available_with_provisional columns to v_inventory_summary view."""
    # Drop existing view
    op.execute("DROP VIEW IF EXISTS v_inventory_summary CASCADE")

    # Recreate view with provisional stock columns
    op.execute("""
        CREATE VIEW v_inventory_summary AS
        SELECT
            l.product_id,
            l.warehouse_id,
            SUM(l.current_quantity) AS total_quantity,
            SUM(l.allocated_quantity) AS allocated_quantity,
            (SUM(l.current_quantity) - SUM(l.allocated_quantity)) AS available_quantity,
            COALESCE(SUM(ipl.planned_quantity), 0) AS provisional_stock,
            (SUM(l.current_quantity) - SUM(l.allocated_quantity) + COALESCE(SUM(ipl.planned_quantity), 0)) AS available_with_provisional,
            MAX(l.updated_at) AS last_updated
        FROM lots l
        LEFT JOIN inbound_plan_lines ipl ON l.product_id = ipl.product_id
        LEFT JOIN inbound_plans ip ON ipl.inbound_plan_id = ip.id AND ip.status = 'planned'
        WHERE l.status = 'active'
        GROUP BY l.product_id, l.warehouse_id
    """)

    op.execute("COMMENT ON VIEW v_inventory_summary IS '在庫集計ビュー（仮在庫含む）'")


def downgrade() -> None:
    """Revert v_inventory_summary to original version without provisional stock."""
    # Drop modified view
    op.execute("DROP VIEW IF EXISTS v_inventory_summary CASCADE")

    # Recreate original view
    op.execute("""
        CREATE VIEW v_inventory_summary AS
        SELECT
            l.product_id,
            l.warehouse_id,
            SUM(l.current_quantity) AS total_quantity,
            SUM(l.allocated_quantity) AS allocated_quantity,
            (SUM(l.current_quantity) - SUM(l.allocated_quantity)) AS available_quantity,
            MAX(l.updated_at) AS last_updated
        FROM lots l
        WHERE l.status = 'active'
        GROUP BY l.product_id, l.warehouse_id
    """)

    op.execute("COMMENT ON VIEW v_inventory_summary IS '在庫集計ビュー'")

