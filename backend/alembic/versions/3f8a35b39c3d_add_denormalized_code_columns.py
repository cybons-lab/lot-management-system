"""Add denormalized code columns for key relationships

Revision ID: 3f8a35b39c3d
Revises: 952dcae456fb
Create Date: 2025-11-09 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "3f8a35b39c3d"
down_revision = "952dcae456fb"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("orders", sa.Column("customer_code", sa.Text(), nullable=True))
    op.add_column("order_lines", sa.Column("product_code", sa.Text(), nullable=True))
    op.add_column("lots", sa.Column("product_code", sa.Text(), nullable=True))
    op.add_column("lots", sa.Column("supplier_code", sa.Text(), nullable=True))
    op.add_column("lots", sa.Column("warehouse_code", sa.Text(), nullable=True))

    op.execute(
        """
        UPDATE orders AS o
        SET customer_code = c.customer_code
        FROM customers AS c
        WHERE o.customer_id = c.id;
        """
    )
    op.execute(
        """
        UPDATE order_lines AS ol
        SET product_code = p.product_code
        FROM products AS p
        WHERE ol.product_id = p.id;
        """
    )
    op.execute(
        """
        -- products 由来の product_code は INNER に相当（必須前提）
        -- supplier_code / warehouse_code は NULL 許容で相関サブクエリにする
        UPDATE lots AS l
        SET
        product_code   = p.product_code,
        supplier_code  = (
            SELECT s.supplier_code
            FROM suppliers AS s
            WHERE s.id = l.supplier_id
        ),
        warehouse_code = (
            SELECT w.warehouse_code
            FROM warehouses AS w
            WHERE w.id = l.warehouse_id
        )
        FROM products AS p
        WHERE l.product_id = p.id;
        """
    )

    op.create_index("ix_orders_customer_code", "orders", ["customer_code"])
    op.create_index("ix_order_lines_product_code", "order_lines", ["product_code"])
    op.create_index("ix_lots_product_code", "lots", ["product_code"])
    op.create_index("ix_lots_supplier_code", "lots", ["supplier_code"])
    op.create_index("ix_lots_warehouse_code", "lots", ["warehouse_code"])


def downgrade() -> None:
    op.drop_index("ix_lots_warehouse_code", table_name="lots")
    op.drop_index("ix_lots_supplier_code", table_name="lots")
    op.drop_index("ix_lots_product_code", table_name="lots")
    op.drop_index("ix_order_lines_product_code", table_name="order_lines")
    op.drop_index("ix_orders_customer_code", table_name="orders")

    op.drop_column("lots", "warehouse_code")
    op.drop_column("lots", "supplier_code")
    op.drop_column("lots", "product_code")
    op.drop_column("order_lines", "product_code")
    op.drop_column("orders", "customer_code")
