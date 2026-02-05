"""add_capacity_warranty_to_supplier_items

Revision ID: df2c7a6b5a9c
Revises: c2f9f55b2f6a
Create Date: 2026-02-05 11:30:00.000000
"""

import sqlalchemy as sa

from alembic import op


# revision identifiers, used by Alembic.
revision = "df2c7a6b5a9c"
down_revision = "c2f9f55b2f6a"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "supplier_items",
        sa.Column("capacity", sa.Numeric(10, 3), nullable=True, comment="収容数"),
    )
    op.add_column(
        "supplier_items",
        sa.Column(
            "warranty_period_days",
            sa.Integer(),
            nullable=True,
            comment="保証期間（日）",
        ),
    )


def downgrade() -> None:
    op.drop_column("supplier_items", "warranty_period_days")
    op.drop_column("supplier_items", "capacity")
