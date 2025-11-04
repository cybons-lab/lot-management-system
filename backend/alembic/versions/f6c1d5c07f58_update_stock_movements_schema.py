"""update stock_movements schema

Revision ID: f6c1d5c07f58
Revises: e4bc5d4fa1c4
Create Date: 2025-11-03 00:50:00
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "f6c1d5c07f58"
down_revision = "e4bc5d4fa1c4"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("stock_movements") as batch_op:
        batch_op.alter_column("lot_id", existing_type=sa.Integer(), nullable=True)
        batch_op.alter_column("movement_type", new_column_name="reason")
        batch_op.alter_column(
            "quantity",
            new_column_name="quantity_delta",
            existing_type=sa.Float(),
            type_=sa.Numeric(15, 4),
        )
        batch_op.drop_column("related_id")
        batch_op.add_column(sa.Column("product_id", sa.Text(), nullable=True))
        batch_op.add_column(sa.Column("warehouse_id", sa.Text(), nullable=True))
        batch_op.add_column(sa.Column("source_table", sa.String(length=50), nullable=True))
        batch_op.add_column(sa.Column("source_id", sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column("batch_id", sa.String(length=100), nullable=True))

    connection = op.get_bind()
    connection.execute(sa.text("UPDATE stock_movements SET reason = upper(reason)"))
    connection.execute(
        sa.text(
            "UPDATE stock_movements SET product_id = ("
            "SELECT product_code FROM lots WHERE lots.id = stock_movements.lot_id)"
            " WHERE lot_id IS NOT NULL"
        )
    )
    connection.execute(
        sa.text(
            "UPDATE stock_movements SET warehouse_id = ("
            "SELECT warehouse_id FROM lots WHERE lots.id = stock_movements.lot_id)"
            " WHERE lot_id IS NOT NULL"
        )
    )

    default_wh = connection.execute(
        sa.text("SELECT warehouse_code FROM warehouses ORDER BY warehouse_code LIMIT 1")
    ).scalar()
    if default_wh is None:
        connection.execute(
            sa.text(
                """
                INSERT INTO warehouses (warehouse_code, warehouse_name, created_by)
                VALUES ('WH-DEFAULT', 'デフォルト倉庫', 'system')
                """
            )
        )
        default_wh = "WH-DEFAULT"

    connection.execute(
        sa.text("UPDATE stock_movements SET warehouse_id = :code WHERE warehouse_id IS NULL"),
        {"code": default_wh},
    )

    connection.execute(
        sa.text("UPDATE stock_movements SET created_by = 'system' WHERE created_by IS NULL")
    )

    op.create_index(
        "idx_stock_movements_product_warehouse",
        "stock_movements",
        ["product_id", "warehouse_id"],
    )
    op.create_index(
        "idx_stock_movements_occurred_at",
        "stock_movements",
        ["occurred_at"],
    )

    with op.batch_alter_table("stock_movements") as batch_op:
        batch_op.alter_column("product_id", nullable=False)
        batch_op.alter_column("warehouse_id", nullable=False)
        batch_op.alter_column("reason", nullable=False)
        batch_op.alter_column("quantity_delta", nullable=False)
        batch_op.create_foreign_key(
            "fk_stock_movements_product",
            "products",
            ["product_id"],
            ["product_code"],
        )
        batch_op.create_foreign_key(
            "fk_stock_movements_warehouse",
            "warehouses",
            ["warehouse_id"],
            ["warehouse_code"],
        )


def downgrade():
    op.drop_index("idx_stock_movements_occurred_at", table_name="stock_movements")
    op.drop_index("idx_stock_movements_product_warehouse", table_name="stock_movements")

    with op.batch_alter_table("stock_movements") as batch_op:
        batch_op.drop_constraint(
            "fk_stock_movements_warehouse", type_="foreignkey"
        )
        batch_op.drop_constraint(
            "fk_stock_movements_product", type_="foreignkey"
        )
        batch_op.alter_column("quantity_delta", new_column_name="quantity", type_=sa.Float())
        batch_op.alter_column("reason", new_column_name="movement_type")
        batch_op.drop_column("batch_id")
        batch_op.drop_column("source_id")
        batch_op.drop_column("source_table")
        batch_op.drop_column("warehouse_id")
        batch_op.drop_column("product_id")
        batch_op.add_column(sa.Column("related_id", sa.Text(), nullable=True))
        batch_op.alter_column("lot_id", existing_type=sa.Integer(), nullable=False)
