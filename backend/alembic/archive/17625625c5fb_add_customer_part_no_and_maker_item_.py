"""add customer_part_no and maker_item_code to products

Revision ID: 17625625c5fb
Revises: d4e5f6g7h8i9
Create Date: 2025-12-15 10:00:53.866205

"""

import sqlalchemy as sa

from alembic import op


# revision identifiers, used by Alembic.
revision = "17625625c5fb"
down_revision = "d4e5f6g7h8i9"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add customer_part_no and maker_item_code columns to products table."""
    op.add_column(
        "products",
        sa.Column(
            "customer_part_no",
            sa.String(length=100),
            nullable=True,
            comment="先方品番（得意先の品番）",
        ),
    )
    op.add_column(
        "products",
        sa.Column(
            "maker_item_code",
            sa.String(length=100),
            nullable=True,
            comment="メーカー品番（仕入先の品番）",
        ),
    )


def downgrade() -> None:
    """Remove customer_part_no and maker_item_code columns from products table."""
    op.drop_column("products", "maker_item_code")
    op.drop_column("products", "customer_part_no")
