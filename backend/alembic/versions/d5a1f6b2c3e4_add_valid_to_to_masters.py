"""Add valid_to column to master tables for soft delete.

Revision ID: d5a1f6b2c3e4
Revises: c842f0821023
Create Date: 2025-12-11

This migration adds the valid_to column to all master tables to support
soft delete functionality. The default value is '9999-12-31' (indefinitely valid).
"""

from datetime import date

import sqlalchemy as sa

from alembic import op


# revision identifiers, used by Alembic.
revision = "d5a1f6b2c3e4"
down_revision = "c842f0821023"
branch_labels = None
depends_on = None

# Default value for valid_to (indefinitely valid)
DEFAULT_VALID_TO = date(9999, 12, 31)


def upgrade() -> None:
    """Add valid_to column to master tables."""
    # List of tables to add valid_to column
    tables = [
        "suppliers",
        "customers",
        "warehouses",
        "products",
        "delivery_places",
        "customer_items",
        "product_uom_conversions",
    ]

    for table in tables:
        op.add_column(
            table,
            sa.Column(
                "valid_to",
                sa.Date(),
                nullable=False,
                server_default=sa.text("'9999-12-31'"),
            ),
        )
        # Add index for efficient filtering
        op.create_index(
            f"idx_{table}_valid_to",
            table,
            ["valid_to"],
        )

    # Special handling for product_mappings: migrate is_active to valid_to
    # First add valid_to column
    op.add_column(
        "product_mappings",
        sa.Column(
            "valid_to",
            sa.Date(),
            nullable=False,
            server_default=sa.text("'9999-12-31'"),
        ),
    )

    # Migrate is_active=False to valid_to=today
    op.execute(
        """
        UPDATE product_mappings
        SET valid_to = CURRENT_DATE
        WHERE is_active = FALSE
        """
    )

    # Drop is_active column
    op.drop_column("product_mappings", "is_active")

    # Add index
    op.create_index(
        "idx_product_mappings_valid_to",
        "product_mappings",
        ["valid_to"],
    )

    # Also add to supplier_products if it exists
    # Check if table exists first
    connection = op.get_bind()
    inspector = sa.inspect(connection)
    if "supplier_products" in inspector.get_table_names():
        op.add_column(
            "supplier_products",
            sa.Column(
                "valid_to",
                sa.Date(),
                nullable=False,
                server_default=sa.text("'9999-12-31'"),
            ),
        )
        op.create_index(
            "idx_supplier_products_valid_to",
            "supplier_products",
            ["valid_to"],
        )


def downgrade() -> None:
    """Remove valid_to column from master tables."""
    # List of tables to remove valid_to column
    tables = [
        "suppliers",
        "customers",
        "warehouses",
        "products",
        "delivery_places",
        "customer_items",
        "product_uom_conversions",
    ]

    for table in tables:
        op.drop_index(f"idx_{table}_valid_to", table_name=table)
        op.drop_column(table, "valid_to")

    # Special handling for product_mappings: restore is_active
    op.drop_index("idx_product_mappings_valid_to", table_name="product_mappings")

    # Add is_active column back
    op.add_column(
        "product_mappings",
        sa.Column(
            "is_active",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
        ),
    )

    # Migrate valid_to < today to is_active=False
    op.execute(
        """
        UPDATE product_mappings
        SET is_active = FALSE
        WHERE valid_to < CURRENT_DATE
        """
    )

    op.drop_column("product_mappings", "valid_to")

    # Handle supplier_products
    connection = op.get_bind()
    inspector = sa.inspect(connection)
    if "supplier_products" in inspector.get_table_names():
        op.drop_index("idx_supplier_products_valid_to", table_name="supplier_products")
        op.drop_column("supplier_products", "valid_to")
