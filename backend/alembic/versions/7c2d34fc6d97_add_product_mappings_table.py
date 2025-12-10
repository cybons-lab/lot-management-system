"""add_product_mappings_table

Revision ID: 7c2d34fc6d97
Revises: ae8f3cf3a85b
Create Date: 2025-12-10 22:09:48.639668

"""

import sqlalchemy as sa

from alembic import op


# revision identifiers, used by Alembic.
revision = "7c2d34fc6d97"
down_revision = "ae8f3cf3a85b"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Create product_mappings table
    op.create_table(
        "product_mappings",
        sa.Column("id", sa.BigInteger(), primary_key=True),
        sa.Column(
            "customer_id",
            sa.BigInteger(),
            sa.ForeignKey("customers.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("customer_part_code", sa.String(100), nullable=False),
        sa.Column(
            "supplier_id",
            sa.BigInteger(),
            sa.ForeignKey("suppliers.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "product_id",
            sa.BigInteger(),
            sa.ForeignKey("products.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("base_unit", sa.String(20), nullable=False),
        sa.Column("pack_unit", sa.String(20), nullable=True),
        sa.Column("pack_quantity", sa.Integer(), nullable=True),
        sa.Column("special_instructions", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column(
            "created_at", sa.DateTime(), nullable=False, server_default=sa.func.current_timestamp()
        ),
        sa.Column(
            "updated_at", sa.DateTime(), nullable=False, server_default=sa.func.current_timestamp()
        ),
        sa.UniqueConstraint(
            "customer_id",
            "customer_part_code",
            "supplier_id",
            name="uq_product_mappings_cust_part_supp",
        ),
    )
    op.create_index("idx_product_mappings_customer", "product_mappings", ["customer_id"])
    op.create_index("idx_product_mappings_supplier", "product_mappings", ["supplier_id"])
    op.create_index("idx_product_mappings_product", "product_mappings", ["product_id"])

    # 2. Migrate data from customer_items to product_mappings
    op.execute("""
        INSERT INTO product_mappings (customer_id, customer_part_code, supplier_id, product_id, base_unit, pack_unit, pack_quantity, special_instructions)
        SELECT customer_id, external_product_code, supplier_id, product_id, base_unit, pack_unit, pack_quantity, special_instructions
        FROM customer_items
        WHERE supplier_id IS NOT NULL
    """)

    # 3. Populate product_suppliers from product_mappings
    op.execute("""
        INSERT INTO product_suppliers (product_id, supplier_id, is_primary, created_at, updated_at)
        SELECT DISTINCT product_id, supplier_id, FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        FROM product_mappings
        ON CONFLICT (product_id, supplier_id) DO NOTHING
    """)


def downgrade() -> None:
    # Remove data from product_suppliers that was migrated
    op.execute("""
        DELETE FROM product_suppliers
        WHERE (product_id, supplier_id) IN (
            SELECT DISTINCT product_id, supplier_id FROM product_mappings
        )
    """)

    # Drop product_mappings table
    op.drop_index("idx_product_mappings_product", "product_mappings")
    op.drop_index("idx_product_mappings_supplier", "product_mappings")
    op.drop_index("idx_product_mappings_customer", "product_mappings")
    op.drop_table("product_mappings")
