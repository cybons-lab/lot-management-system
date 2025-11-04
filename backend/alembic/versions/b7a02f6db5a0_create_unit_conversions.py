"""create unit_conversions table

Revision ID: b7a02f6db5a0
Revises: 93c1d055cc3f
Create Date: 2025-11-03 00:20:00
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "b7a02f6db5a0"
down_revision = "93c1d055cc3f"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "unit_conversions",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("product_id", sa.Text(), nullable=False),
        sa.Column("from_unit", sa.String(length=10), nullable=False),
        sa.Column("to_unit", sa.String(length=10), nullable=False),
        sa.Column("factor", sa.Numeric(10, 4), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("created_by", sa.String(length=50), nullable=True),
        sa.Column("updated_by", sa.String(length=50), nullable=True),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.Column("revision", sa.Integer(), nullable=False, server_default="1"),
        sa.ForeignKeyConstraint(["product_id"], ["products.product_code"]),
        sa.UniqueConstraint("product_id", "from_unit", "to_unit", name="uq_product_units"),
    )

    op.execute(
        """
        INSERT INTO unit_conversions (product_id, from_unit, to_unit, factor, created_by)
        SELECT product_code, 'CAN', 'KG', 4.0, 'system'
        FROM products
        WHERE base_unit = 'KG' AND product_code LIKE 'CAN%'
        """
    )


def downgrade():
    op.drop_table("unit_conversions")
