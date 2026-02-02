"""remove_obsolete_customer_items_columns

Revision ID: b2cabaab67f5
Revises: 4c8a76985218
Create Date: 2026-02-02 09:49:28.103480

Phase1 cleanup: Remove obsolete columns from customer_items table.

After Phase1, customer_items only needs supplier_item_id to link to supplier_items.
The following fields are now obsolete:
- product_group_id (replaced by supplier_item_id)
- supplier_id (redundant, available via supplier_items)
- is_primary (no longer needed)

This migration also removes the associated indexes and constraints.
"""

import sqlalchemy as sa

from alembic import op


# revision identifiers, used by Alembic.
revision = "b2cabaab67f5"
down_revision = "4c8a76985218"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Remove obsolete columns from customer_items table."""
    print("\n" + "=" * 80)
    print("Phase1 Cleanup: Removing obsolete customer_items columns")
    print("=" * 80 + "\n")

    # Step 0: Drop dependent views
    print("Step 0/5: Dropping dependent views...")
    op.execute("DROP VIEW IF EXISTS v_order_line_details CASCADE")
    op.execute("DROP VIEW IF EXISTS v_lot_details CASCADE")
    print("✅ Dropped v_order_line_details and v_lot_details views\n")

    # Step 1: Drop indexes that depend on columns we're removing
    print("Step 1/5: Dropping obsolete indexes...")
    op.drop_index("idx_customer_items_is_primary_unique", table_name="customer_items")
    op.drop_index("idx_customer_items_product", table_name="customer_items")
    op.drop_index("idx_customer_items_supplier", table_name="customer_items")
    print("✅ Dropped 3 indexes\n")

    # Step 2: Drop foreign key constraints
    print("Step 2/5: Dropping foreign key constraints...")
    op.drop_constraint("customer_items_product_group_id_fkey", "customer_items", type_="foreignkey")
    op.drop_constraint("customer_items_supplier_id_fkey", "customer_items", type_="foreignkey")
    print("✅ Dropped 2 foreign key constraints\n")

    # Step 3: Drop obsolete columns
    print("Step 3/5: Dropping obsolete columns...")
    op.drop_column("customer_items", "product_group_id")
    op.drop_column("customer_items", "supplier_id")
    op.drop_column("customer_items", "is_primary")
    print("✅ Dropped 3 columns: product_group_id, supplier_id, is_primary\n")

    # Step 4: Recreate views without obsolete columns
    print("Step 4/5: Recreating views...")
    # Both views are recreated by a later migration (af2153ad0efc_restore_views)
    # We don't need to recreate them here
    print("⏭️  Views will be recreated by existing restore_views migration\n")

    print("Step 5/5: customer_items now only uses supplier_item_id")
    print("✅ Phase1 cleanup complete\n")
    print("=" * 80 + "\n")


def downgrade() -> None:
    """Restore removed columns (for rollback purposes)."""
    print("\n⚠️  Rolling back Phase1 cleanup\n")

    # Re-add columns
    op.add_column(
        "customer_items",
        sa.Column("is_primary", sa.Boolean(), server_default=sa.text("false"), nullable=False),
    )
    op.add_column("customer_items", sa.Column("supplier_id", sa.BigInteger(), nullable=True))
    op.add_column("customer_items", sa.Column("product_group_id", sa.BigInteger(), nullable=False))

    # Re-create foreign keys
    op.create_foreign_key(
        "customer_items_supplier_id_fkey",
        "customer_items",
        "suppliers",
        ["supplier_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_foreign_key(
        "customer_items_product_group_id_fkey",
        "customer_items",
        "supplier_items",
        ["product_group_id"],
        ["id"],
        ondelete="RESTRICT",
    )

    # Re-create indexes
    op.create_index("idx_customer_items_supplier", "customer_items", ["supplier_id"])
    op.create_index("idx_customer_items_product", "customer_items", ["product_group_id"])
    op.execute(
        """
        CREATE UNIQUE INDEX idx_customer_items_is_primary_unique
        ON customer_items (supplier_item_id)
        WHERE is_primary = true AND supplier_item_id IS NOT NULL
    """
    )

    print("✅ Rollback complete\n")
