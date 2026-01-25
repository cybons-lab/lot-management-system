"""make_supplier_items_product_id_nullable_and_add_attributes

Revision ID: 8319618fc680
Revises: 975743e7c919
Create Date: 2026-01-25 13:58:33.821556

"""

import sqlalchemy as sa

from alembic import op


# revision identifiers, used by Alembic.
revision = "8319618fc680"
down_revision = "975743e7c919"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Product ID nullable (Allow standalone operation)
    op.alter_column("supplier_items", "product_id", nullable=True)

    # 2. Add physical attributes (Nullable for now, Phase 2-2 will backfill)
    op.add_column(
        "supplier_items",
        sa.Column("base_unit", sa.String(20), nullable=True, comment="基本単位（在庫単位）"),
    )
    op.add_column(
        "supplier_items",
        sa.Column("net_weight", sa.Numeric(10, 3), nullable=True, comment="正味重量"),
    )
    op.add_column(
        "supplier_items", sa.Column("weight_unit", sa.String(20), nullable=True, comment="重量単位")
    )


def downgrade() -> None:
    # 2. Drop physical attributes
    op.drop_column("supplier_items", "weight_unit")
    op.drop_column("supplier_items", "net_weight")
    op.drop_column("supplier_items", "base_unit")

    # 1. Product ID NOT NULL (Revert)
    # WARNING: This might fail if records with NULL product_id were added.
    op.execute(
        "DELETE FROM supplier_items WHERE product_id IS NULL"
    )  # Ensure consistency before revert
    op.alter_column("supplier_items", "product_id", nullable=False)
