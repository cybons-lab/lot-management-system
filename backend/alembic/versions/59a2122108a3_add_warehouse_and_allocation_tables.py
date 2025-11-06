"""add warehouse and allocation tables

Revision ID: 59a2122108a3
Revises: 1743593a6a5b
Create Date: 2025-11-02 20:39:31.062367

"""

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision = "59a2122108a3"
down_revision = "1743593a6a5b"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "warehouse",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("warehouse_code", sa.String(32), unique=True, nullable=False),
        sa.Column("warehouse_name", sa.String(128), nullable=False),
    )

    op.create_table(
        "order_line_warehouse_allocation",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("order_line_id", sa.Integer, sa.ForeignKey("order_lines.id"), nullable=False),
        sa.Column("warehouse_id", sa.Integer, sa.ForeignKey("warehouse.id"), nullable=False),
        sa.Column("quantity", sa.Float, nullable=False),
        sa.UniqueConstraint("order_line_id", "warehouse_id", name="uq_order_line_warehouse"),
    )


def downgrade() -> None:
    # 依存関係があるため、順序に注意（子→親の順で削除）
    op.drop_table("order_line_warehouse_allocation")
    op.drop_table("warehouse")
