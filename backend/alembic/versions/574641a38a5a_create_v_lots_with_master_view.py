"""create_v_lots_with_master_view

Revision ID: 574641a38a5a
Revises: e1b30f786a89
Create Date: 2025-11-24 13:32:48.527785

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '574641a38a5a'
down_revision = 'e1b30f786a89'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create read-only view for lots joined with products and suppliers
    op.execute("""
        CREATE VIEW v_lots_with_master AS
        SELECT
            l.id,
            l.lot_number,
            l.product_id,
            p.maker_part_code AS product_code,
            p.product_name,
            l.supplier_id,
            s.supplier_name,
            l.warehouse_id,
            l.current_quantity,
            l.allocated_quantity,
            l.unit,
            l.received_date,
            l.expiry_date,
            l.status,
            l.lock_reason,
            l.inspection_status,
            l.inspection_date,
            l.inspection_cert_number,
            l.expected_lot_id,
            l.version_id,
            l.created_at,
            l.updated_at
        FROM lots l
        INNER JOIN products p ON p.id = l.product_id
        INNER JOIN suppliers s ON s.id = l.supplier_id
    """)


def downgrade() -> None:
    # Drop the view
    op.execute("DROP VIEW IF EXISTS v_lots_with_master")
