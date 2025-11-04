"""add base_unit to products

Revision ID: 93c1d055cc3f
Revises: 7f5c6f4e5b15
Create Date: 2025-11-03 00:10:00
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "93c1d055cc3f"
down_revision = "7f5c6f4e5b15"
branch_labels = None
depends_on = None


def upgrade():
    inspector = sa.inspect(op.get_bind())
    columns = {col["name"] for col in inspector.get_columns("products")}
    if "base_unit" not in columns:
        op.add_column(
            "products",
            sa.Column("base_unit", sa.String(length=10), nullable=False, server_default="EA"),
        )

    op.execute(
        "UPDATE products SET base_unit = 'KG' WHERE product_code LIKE 'LIQ%'"
    )
    op.execute(
        "UPDATE products SET base_unit = 'CAN' WHERE product_code LIKE 'CAN%'"
    )


def downgrade():
    op.drop_column("products", "base_unit")
