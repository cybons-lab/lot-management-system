"""add_product_group_id_foreign_keys_to_supplier_items

Revision ID: a9f36409b674
Revises: a5ec9cd27093
Create Date: 2026-01-29 09:36:32.069879

"""

import sqlalchemy as sa

from alembic import op


# revision identifiers, used by Alembic.
revision = "a9f36409b674"
down_revision = "a5ec9cd27093"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add foreign key constraints from product_group_id columns to supplier_items.id."""

    # List of tables that have product_group_id and need FK to supplier_items
    tables_with_product_group_id = [
        "forecast_current",
        "lot_receipt",
        "order_lines",
        "inbound_plan_lines",
        "stock_movements",
        "order_groups",
        "customer_items",
        "product_mappings",
        "uom_conversions",
        "missing_mappings",
    ]

    for table_name in tables_with_product_group_id:
        # Check if column exists before adding FK
        op.execute(f"""
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = '{table_name}' AND column_name = 'product_group_id'
                ) THEN
                    ALTER TABLE {table_name}
                    ADD CONSTRAINT {table_name}_product_group_id_fkey
                    FOREIGN KEY (product_group_id) REFERENCES supplier_items(id) ON DELETE RESTRICT;
                END IF;
            END $$;
        """)


def downgrade() -> None:
    """Remove foreign key constraints from product_group_id columns."""

    tables_with_product_group_id = [
        "forecast_current",
        "lot_receipt",
        "order_lines",
        "inbound_plan_lines",
        "stock_movements",
        "order_groups",
        "customer_items",
        "product_mappings",
        "uom_conversions",
        "missing_mappings",
    ]

    for table_name in tables_with_product_group_id:
        op.execute(
            f"ALTER TABLE {table_name} DROP CONSTRAINT IF EXISTS {table_name}_product_group_id_fkey"
        )
