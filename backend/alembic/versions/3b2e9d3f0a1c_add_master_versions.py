"""add_master_versions

Revision ID: 3b2e9d3f0a1c
Revises: 8c2f3e1a9d4b
Create Date: 2026-02-05 21:10:00

"""

import sqlalchemy as sa

from alembic import op


# revision identifiers, used by Alembic.
revision = "3b2e9d3f0a1c"
down_revision = "8c2f3e1a9d4b"
branch_labels = None
depends_on = None


def upgrade() -> None:
    tables = [
        "warehouses",
        "suppliers",
        "customers",
        "delivery_places",
        "customer_items",
        "product_mappings",
        "product_uom_conversions",
        "customer_item_jiku_mappings",
        "customer_item_delivery_settings",
        "warehouse_delivery_routes",
        "supplier_items",
        "makers",
        "shipping_master_curated",
        "shipping_master_raw",
        "user_supplier_assignments",
    ]

    for table in tables:
        op.add_column(
            table,
            sa.Column("version", sa.Integer(), server_default=sa.text("1"), nullable=False),
        )


def downgrade() -> None:
    tables = [
        "warehouses",
        "suppliers",
        "customers",
        "delivery_places",
        "customer_items",
        "product_mappings",
        "product_uom_conversions",
        "customer_item_jiku_mappings",
        "customer_item_delivery_settings",
        "warehouse_delivery_routes",
        "supplier_items",
        "makers",
        "shipping_master_curated",
        "shipping_master_raw",
        "user_supplier_assignments",
    ]

    for table in tables:
        op.drop_column(table, "version")
