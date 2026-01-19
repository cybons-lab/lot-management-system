"""add warehouse_delivery_routes table and warehouse default lead time

Revision ID: m1n2o3p4q5r6
Revises: l8m9n0o1p2q3
Create Date: 2025-12-22 14:32:00.000000

"""

import sqlalchemy as sa

from alembic import op


# revision identifiers, used by Alembic.
revision = "m1n2o3p4q5r6"
down_revision = "l8m9n0o1p2q3"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add default_transport_lead_time_days column to warehouses
    op.add_column(
        "warehouses",
        sa.Column(
            "default_transport_lead_time_days",
            sa.Integer(),
            nullable=True,
            comment="デフォルト輸送リードタイム（日）",
        ),
    )

    # Create warehouse_delivery_routes table
    op.create_table(
        "warehouse_delivery_routes",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("warehouse_id", sa.BigInteger(), nullable=False),
        sa.Column("delivery_place_id", sa.BigInteger(), nullable=False),
        sa.Column(
            "product_id",
            sa.BigInteger(),
            nullable=True,
            comment="品番（NULLの場合は経路デフォルト）",
        ),
        sa.Column(
            "transport_lead_time_days",
            sa.Integer(),
            nullable=False,
            comment="輸送リードタイム（日）",
        ),
        sa.Column(
            "is_active",
            sa.Boolean(),
            server_default=sa.text("true"),
            nullable=False,
            comment="有効フラグ",
        ),
        sa.Column("notes", sa.Text(), nullable=True, comment="備考"),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["warehouse_id"], ["warehouses.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["delivery_place_id"], ["delivery_places.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["product_id"], ["products.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    # Create unique constraint for warehouse + delivery_place + product
    # Using partial unique index for NULL product_id case
    op.create_index(
        "idx_wdr_warehouse",
        "warehouse_delivery_routes",
        ["warehouse_id"],
        unique=False,
    )
    op.create_index(
        "idx_wdr_delivery_place",
        "warehouse_delivery_routes",
        ["delivery_place_id"],
        unique=False,
    )
    op.create_index(
        "idx_wdr_product",
        "warehouse_delivery_routes",
        ["product_id"],
        unique=False,
    )
    op.create_index(
        "idx_wdr_active",
        "warehouse_delivery_routes",
        ["is_active"],
        unique=False,
    )

    # Unique constraint for non-null product_id
    op.create_index(
        "uq_wdr_warehouse_delivery_product",
        "warehouse_delivery_routes",
        ["warehouse_id", "delivery_place_id", "product_id"],
        unique=True,
        postgresql_where=sa.text("product_id IS NOT NULL"),
    )

    # Unique constraint for null product_id (route default)
    op.create_index(
        "uq_wdr_warehouse_delivery_default",
        "warehouse_delivery_routes",
        ["warehouse_id", "delivery_place_id"],
        unique=True,
        postgresql_where=sa.text("product_id IS NULL"),
    )


def downgrade() -> None:
    op.drop_index("uq_wdr_warehouse_delivery_default", table_name="warehouse_delivery_routes")
    op.drop_index("uq_wdr_warehouse_delivery_product", table_name="warehouse_delivery_routes")
    op.drop_index("idx_wdr_active", table_name="warehouse_delivery_routes")
    op.drop_index("idx_wdr_product", table_name="warehouse_delivery_routes")
    op.drop_index("idx_wdr_delivery_place", table_name="warehouse_delivery_routes")
    op.drop_index("idx_wdr_warehouse", table_name="warehouse_delivery_routes")
    op.drop_table("warehouse_delivery_routes")
    op.drop_column("warehouses", "default_transport_lead_time_days")
