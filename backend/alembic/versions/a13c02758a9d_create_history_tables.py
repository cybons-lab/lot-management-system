"""create history tables

Revision ID: a13c02758a9d
Revises: f6c1d5c07f58
Create Date: 2025-11-03 01:00:00
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "a13c02758a9d"
down_revision = "f6c1d5c07f58"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "orders_history",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("order_id", sa.Integer(), nullable=False),
        sa.Column("order_no", sa.String(length=50), nullable=False),
        sa.Column("customer_code", sa.Text(), nullable=False),
        sa.Column("order_date", sa.DateTime(), nullable=False),
        sa.Column("due_date", sa.DateTime(), nullable=True),
        sa.Column("remarks", sa.Text(), nullable=True),
        sa.Column("valid_from", sa.DateTime(), nullable=False),
        sa.Column("valid_to", sa.DateTime(), nullable=True),
        sa.Column("changed_by", sa.String(length=50), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("created_by", sa.String(length=50), nullable=True),
        sa.Column("updated_by", sa.String(length=50), nullable=True),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.Column("revision", sa.Integer(), nullable=False, server_default="1"),
    )
    op.create_index(
        "idx_orders_history_order_valid",
        "orders_history",
        ["order_id", "valid_from"],
    )

    op.create_table(
        "lots_history",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("lot_id", sa.Integer(), nullable=False),
        sa.Column("lot_number", sa.Text(), nullable=False),
        sa.Column("product_code", sa.Text(), nullable=False),
        sa.Column("warehouse_id", sa.Text(), nullable=False),
        sa.Column("quantity_total", sa.Numeric(15, 4), nullable=False),
        sa.Column("quantity_available", sa.Numeric(15, 4), nullable=False),
        sa.Column("valid_from", sa.DateTime(), nullable=False),
        sa.Column("valid_to", sa.DateTime(), nullable=True),
        sa.Column("changed_by", sa.String(length=50), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("created_by", sa.String(length=50), nullable=True),
        sa.Column("updated_by", sa.String(length=50), nullable=True),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.Column("revision", sa.Integer(), nullable=False, server_default="1"),
    )
    op.create_index(
        "idx_lots_history_lot_valid",
        "lots_history",
        ["lot_id", "valid_from"],
    )

    op.create_table(
        "allocations_history",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("allocation_id", sa.Integer(), nullable=False),
        sa.Column("order_line_id", sa.Integer(), nullable=False),
        sa.Column("lot_id", sa.Integer(), nullable=False),
        sa.Column("allocated_qty", sa.Numeric(15, 4), nullable=False),
        sa.Column("valid_from", sa.DateTime(), nullable=False),
        sa.Column("valid_to", sa.DateTime(), nullable=True),
        sa.Column("changed_by", sa.String(length=50), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("created_by", sa.String(length=50), nullable=True),
        sa.Column("updated_by", sa.String(length=50), nullable=True),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.Column("revision", sa.Integer(), nullable=False, server_default="1"),
    )
    op.create_index(
        "idx_allocations_history_alloc_valid",
        "allocations_history",
        ["allocation_id", "valid_from"],
    )


def downgrade():
    op.drop_index("idx_allocations_history_alloc_valid", table_name="allocations_history")
    op.drop_table("allocations_history")
    op.drop_index("idx_lots_history_lot_valid", table_name="lots_history")
    op.drop_table("lots_history")
    op.drop_index("idx_orders_history_order_valid", table_name="orders_history")
    op.drop_table("orders_history")
