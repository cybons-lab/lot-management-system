"""make_supplier_items_base_unit_not_null

Revision ID: 9d7943ef324a
Revises: products_to_product_groups
Create Date: 2026-01-28 23:52:36.159971

"""

import sqlalchemy as sa

from alembic import op


# revision identifiers, used by Alembic.
revision = "9d7943ef324a"
down_revision = "products_to_product_groups"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Set default value for existing NULL rows
    op.execute("UPDATE supplier_items SET base_unit = 'EA' WHERE base_unit IS NULL")

    # Make base_unit NOT NULL
    op.alter_column("supplier_items", "base_unit", existing_type=sa.String(20), nullable=False)


def downgrade() -> None:
    # Revert base_unit to nullable
    op.alter_column("supplier_items", "base_unit", existing_type=sa.String(20), nullable=True)
