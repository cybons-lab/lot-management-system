"""Supplier/Customer items migration - ProductSupplier integration

Revision ID: g1h2i3j4k5l6
Revises: eaa941fd2224
Create Date: 2026-01-24

This migration:
1. Renames product_suppliers → supplier_items and extends with maker_part_no
2. Adds supplier_item_id to lot_receipts (SSOT for supplier item reference)
3. Migrates customer_items to surrogate key (id BIGSERIAL)
4. Renames external_product_code → customer_part_no
5. Adds supplier_item_id and is_primary to customer_items
6. Updates related table FK references
"""

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op


# revision identifiers, used by Alembic.
revision = "g1h2i3j4k5l6"
down_revision = "eaa941fd2224"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ==========================================================
    # Step 1: Rename product_suppliers → supplier_items and extend
    # ==========================================================

    # 1-1: Rename table
    op.rename_table("product_suppliers", "supplier_items")

    # 1-2: Add maker_part_no column (nullable first for data migration)
    op.add_column(
        "supplier_items",
        sa.Column("maker_part_no", sa.String(100), nullable=True),
    )

    # 1-3: Backfill maker_part_no from products.maker_part_code
    op.execute("""
        UPDATE supplier_items si
        SET maker_part_no = p.maker_part_code
        FROM products p
        WHERE si.product_id = p.id
    """)

    # 1-4: Set default for any NULL values and make NOT NULL
    op.execute("""
        UPDATE supplier_items
        SET maker_part_no = 'UNKNOWN'
        WHERE maker_part_no IS NULL
    """)
    op.alter_column("supplier_items", "maker_part_no", nullable=False)

    # 1-5: Drop old unique constraint and add new one
    op.drop_constraint("uq_product_supplier", "supplier_items", type_="unique")
    op.create_unique_constraint(
        "uq_supplier_items_supplier_maker",
        "supplier_items",
        ["supplier_id", "maker_part_no"],
    )

    # 1-6: Add optional columns
    op.add_column(
        "supplier_items",
        sa.Column("display_name", sa.String(200), nullable=True),
    )
    op.add_column(
        "supplier_items",
        sa.Column("notes", sa.Text, nullable=True),
    )

    # 1-7: Create index for maker_part_no
    op.create_index(
        "idx_supplier_items_maker_part",
        "supplier_items",
        ["maker_part_no"],
    )

    # 1-8: Rename existing indexes
    op.execute(
        "ALTER INDEX IF EXISTS idx_product_suppliers_valid_to RENAME TO idx_supplier_items_valid_to"
    )
    op.execute(
        "ALTER INDEX IF EXISTS uq_product_primary_supplier RENAME TO idx_supplier_items_is_primary"
    )

    # ==========================================================
    # Step 2: Add supplier_item_id to lot_receipts
    # ==========================================================

    op.add_column(
        "lot_receipts",
        sa.Column(
            "supplier_item_id",
            sa.BigInteger,
            sa.ForeignKey("supplier_items.id", ondelete="SET NULL"),
            nullable=True,
            comment="仕入先品目ID (SSOT)",
        ),
    )
    op.create_index(
        "idx_lot_receipts_supplier_item",
        "lot_receipts",
        ["supplier_item_id"],
    )

    # Backfill supplier_item_id from product_id + supplier_id
    op.execute("""
        UPDATE lot_receipts lr
        SET supplier_item_id = si.id
        FROM supplier_items si
        WHERE lr.product_id = si.product_id
          AND lr.supplier_id = si.supplier_id
    """)

    # ==========================================================
    # Step 3: Migrate customer_items to surrogate key
    # ==========================================================

    # 3-1: Add id column (BIGSERIAL)
    # First, create sequence and add column
    op.execute("CREATE SEQUENCE IF NOT EXISTS customer_items_id_seq")
    op.add_column(
        "customer_items",
        sa.Column(
            "id",
            sa.BigInteger,
            nullable=True,
        ),
    )
    # Populate id values
    op.execute("UPDATE customer_items SET id = nextval('customer_items_id_seq')")
    op.alter_column("customer_items", "id", nullable=False)

    # 3-2: Rename external_product_code → customer_part_no
    op.alter_column(
        "customer_items",
        "external_product_code",
        new_column_name="customer_part_no",
    )

    # 3-3: Add supplier_item_id and is_primary columns
    op.add_column(
        "customer_items",
        sa.Column(
            "supplier_item_id",
            sa.BigInteger,
            sa.ForeignKey("supplier_items.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    op.add_column(
        "customer_items",
        sa.Column(
            "is_primary",
            sa.Boolean,
            server_default=sa.text("false"),
            nullable=False,
        ),
    )
    op.create_index(
        "idx_customer_items_supplier_item",
        "customer_items",
        ["supplier_item_id"],
    )

    # ==========================================================
    # Step 3-4: Update related tables' FK references
    # ==========================================================

    # --- customer_item_delivery_settings ---
    op.add_column(
        "customer_item_delivery_settings",
        sa.Column("customer_item_id", sa.BigInteger, nullable=True),
    )

    # Backfill customer_item_id
    op.execute("""
        UPDATE customer_item_delivery_settings cids
        SET customer_item_id = ci.id
        FROM customer_items ci
        WHERE cids.customer_id = ci.customer_id
          AND cids.external_product_code = ci.customer_part_no
    """)

    # --- customer_item_jiku_mappings ---
    op.add_column(
        "customer_item_jiku_mappings",
        sa.Column("customer_item_id", sa.BigInteger, nullable=True),
    )

    # Backfill customer_item_id
    op.execute("""
        UPDATE customer_item_jiku_mappings cijm
        SET customer_item_id = ci.id
        FROM customer_items ci
        WHERE cijm.customer_id = ci.customer_id
          AND cijm.external_product_code = ci.customer_part_no
    """)

    # ==========================================================
    # Step 3-5: Drop old PK and create new PK
    # ==========================================================

    # Drop old FK constraints first
    op.drop_constraint(
        "fk_customer_item_delivery_settings_customer_item",
        "customer_item_delivery_settings",
        type_="foreignkey",
    )
    op.drop_constraint(
        "fk_customer_item_jiku_mappings_customer_item",
        "customer_item_jiku_mappings",
        type_="foreignkey",
    )

    # Drop old PK
    op.drop_constraint("customer_items_pkey", "customer_items", type_="primary")

    # Create new PK
    op.create_primary_key("customer_items_pkey", "customer_items", ["id"])

    # Set sequence ownership
    op.execute("ALTER SEQUENCE customer_items_id_seq OWNED BY customer_items.id")
    op.execute(
        "ALTER TABLE customer_items ALTER COLUMN id SET DEFAULT nextval('customer_items_id_seq')"
    )

    # ==========================================================
    # Step 3-6: Add business key UNIQUE constraint
    # ==========================================================

    op.create_unique_constraint(
        "uq_customer_items_customer_part",
        "customer_items",
        ["customer_id", "customer_part_no"],
    )

    # 3-7: is_primary partial unique index
    op.create_index(
        "idx_customer_items_is_primary_unique",
        "customer_items",
        ["supplier_item_id"],
        unique=True,
        postgresql_where=sa.text("is_primary = true AND supplier_item_id IS NOT NULL"),
    )

    # ==========================================================
    # Step 3-8: Update related tables' new FK
    # ==========================================================

    # customer_item_delivery_settings: make customer_item_id NOT NULL and add FK
    # Handle orphan records first
    op.execute("""
        DELETE FROM customer_item_delivery_settings
        WHERE customer_item_id IS NULL
    """)
    op.alter_column("customer_item_delivery_settings", "customer_item_id", nullable=False)
    op.create_foreign_key(
        "fk_cids_customer_item",
        "customer_item_delivery_settings",
        "customer_items",
        ["customer_item_id"],
        ["id"],
        ondelete="CASCADE",
    )

    # Drop old columns (after FK is established)
    op.drop_index("idx_cids_customer_item", "customer_item_delivery_settings")
    op.drop_constraint(
        "uq_customer_item_delivery_settings",
        "customer_item_delivery_settings",
        type_="unique",
    )
    op.drop_column("customer_item_delivery_settings", "customer_id")
    op.drop_column("customer_item_delivery_settings", "external_product_code")

    # Create new unique constraint
    op.create_unique_constraint(
        "uq_customer_item_delivery_settings",
        "customer_item_delivery_settings",
        ["customer_item_id", "delivery_place_id", "jiku_code"],
    )

    # customer_item_jiku_mappings: make customer_item_id NOT NULL and add FK
    # Handle orphan records first
    op.execute("""
        DELETE FROM customer_item_jiku_mappings
        WHERE customer_item_id IS NULL
    """)
    op.alter_column("customer_item_jiku_mappings", "customer_item_id", nullable=False)
    op.create_foreign_key(
        "fk_cijm_customer_item",
        "customer_item_jiku_mappings",
        "customer_items",
        ["customer_item_id"],
        ["id"],
        ondelete="CASCADE",
    )

    # Drop view that depends on old columns
    op.execute("DROP VIEW IF EXISTS v_customer_item_jiku_mappings")

    # Drop old columns and constraints
    op.drop_constraint(
        "uq_customer_item_jiku",
        "customer_item_jiku_mappings",
        type_="unique",
    )
    op.drop_column("customer_item_jiku_mappings", "customer_id")
    op.drop_column("customer_item_jiku_mappings", "external_product_code")

    # Create new unique constraint
    op.create_unique_constraint(
        "uq_customer_item_jiku",
        "customer_item_jiku_mappings",
        ["customer_item_id", "jiku_code"],
    )

    # Recreate v_customer_item_jiku_mappings with new schema
    op.execute("""
        CREATE VIEW v_customer_item_jiku_mappings AS
        SELECT
            cijm.id,
            ci.customer_id,
            COALESCE(c.customer_code, '') AS customer_code,
            COALESCE(c.customer_name, '[削除済み得意先]') AS customer_name,
            ci.customer_part_no AS external_product_code,
            cijm.jiku_code,
            cijm.delivery_place_id,
            COALESCE(dp.delivery_place_code, '') AS delivery_place_code,
            COALESCE(dp.delivery_place_name, '[削除済み納入先]') AS delivery_place_name,
            cijm.is_default,
            cijm.created_at,
            CASE WHEN c.valid_to IS NOT NULL AND c.valid_to <= CURRENT_DATE THEN true ELSE false END AS customer_deleted,
            CASE WHEN dp.valid_to IS NOT NULL AND dp.valid_to <= CURRENT_DATE THEN true ELSE false END AS delivery_place_deleted
        FROM customer_item_jiku_mappings cijm
        JOIN customer_items ci ON cijm.customer_item_id = ci.id
        LEFT JOIN customers c ON ci.customer_id = c.id
        LEFT JOIN delivery_places dp ON cijm.delivery_place_id = dp.id
    """)

    # ==========================================================
    # Step 4: Rename RPA columns for consistency
    # ==========================================================

    # 4-1: Rename rpa_run_items.external_product_code → customer_part_no
    op.alter_column(
        "rpa_run_items",
        "external_product_code",
        new_column_name="customer_part_no",
    )

    # 4-2: Rename rpa_run_items.complement_external_product_code → complement_customer_part_no
    op.alter_column(
        "rpa_run_items",
        "complement_external_product_code",
        new_column_name="complement_customer_part_no",
    )

    # 4-3: Update index name if exists
    op.execute("""
        ALTER INDEX IF EXISTS idx_rri_complement_master
        RENAME TO idx_rri_complement_master_old
    """)
    op.create_index(
        "idx_rri_complement_master",
        "rpa_run_items",
        ["complement_customer_id", "complement_customer_part_no"],
    )
    op.execute("DROP INDEX IF EXISTS idx_rri_complement_master_old")


def downgrade() -> None:
    # ==========================================================
    # Reverse Step 4: Restore RPA column names
    # ==========================================================

    # Restore index
    op.drop_index("idx_rri_complement_master", "rpa_run_items")
    op.create_index(
        "idx_rri_complement_master",
        "rpa_run_items",
        ["complement_customer_id", "complement_external_product_code"],
    )

    # Rename columns back
    op.alter_column(
        "rpa_run_items",
        "complement_customer_part_no",
        new_column_name="complement_external_product_code",
    )
    op.alter_column(
        "rpa_run_items",
        "customer_part_no",
        new_column_name="external_product_code",
    )

    # ==========================================================
    # Reverse Step 3-8: Restore related tables' old FK
    # ==========================================================

    # customer_item_jiku_mappings
    op.drop_constraint("uq_customer_item_jiku", "customer_item_jiku_mappings", type_="unique")
    op.add_column(
        "customer_item_jiku_mappings",
        sa.Column("customer_id", sa.BigInteger, nullable=True),
    )
    op.add_column(
        "customer_item_jiku_mappings",
        sa.Column("external_product_code", sa.String(100), nullable=True),
    )

    # Backfill old columns
    op.execute("""
        UPDATE customer_item_jiku_mappings cijm
        SET customer_id = ci.customer_id,
            external_product_code = ci.customer_part_no
        FROM customer_items ci
        WHERE cijm.customer_item_id = ci.id
    """)

    op.alter_column("customer_item_jiku_mappings", "customer_id", nullable=False)
    op.alter_column("customer_item_jiku_mappings", "external_product_code", nullable=False)

    op.drop_constraint("fk_cijm_customer_item", "customer_item_jiku_mappings", type_="foreignkey")
    op.drop_column("customer_item_jiku_mappings", "customer_item_id")

    op.create_unique_constraint(
        "uq_customer_item_jiku",
        "customer_item_jiku_mappings",
        ["customer_id", "external_product_code", "jiku_code"],
    )

    # customer_item_delivery_settings
    op.drop_constraint(
        "uq_customer_item_delivery_settings", "customer_item_delivery_settings", type_="unique"
    )
    op.add_column(
        "customer_item_delivery_settings",
        sa.Column("customer_id", sa.BigInteger, nullable=True),
    )
    op.add_column(
        "customer_item_delivery_settings",
        sa.Column("external_product_code", sa.String(100), nullable=True),
    )

    # Backfill old columns
    op.execute("""
        UPDATE customer_item_delivery_settings cids
        SET customer_id = ci.customer_id,
            external_product_code = ci.customer_part_no
        FROM customer_items ci
        WHERE cids.customer_item_id = ci.id
    """)

    op.alter_column("customer_item_delivery_settings", "customer_id", nullable=False)
    op.alter_column("customer_item_delivery_settings", "external_product_code", nullable=False)

    op.drop_constraint(
        "fk_cids_customer_item", "customer_item_delivery_settings", type_="foreignkey"
    )
    op.drop_column("customer_item_delivery_settings", "customer_item_id")

    op.create_unique_constraint(
        "uq_customer_item_delivery_settings",
        "customer_item_delivery_settings",
        ["customer_id", "external_product_code", "delivery_place_id", "jiku_code"],
    )
    op.create_index(
        "idx_cids_customer_item",
        "customer_item_delivery_settings",
        ["customer_id", "external_product_code"],
    )

    # ==========================================================
    # Reverse Step 3-7, 3-6, 3-5
    # ==========================================================

    op.drop_index("idx_customer_items_is_primary_unique", "customer_items")
    op.drop_constraint("uq_customer_items_customer_part", "customer_items", type_="unique")

    # Recreate old FK constraints
    op.create_foreign_key(
        "fk_customer_item_delivery_settings_customer_item",
        "customer_item_delivery_settings",
        "customer_items",
        ["customer_id", "external_product_code"],
        ["customer_id", "customer_part_no"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "fk_customer_item_jiku_mappings_customer_item",
        "customer_item_jiku_mappings",
        "customer_items",
        ["customer_id", "external_product_code"],
        ["customer_id", "customer_part_no"],
        ondelete="CASCADE",
    )

    # Restore old PK
    op.drop_constraint("customer_items_pkey", "customer_items", type_="primary")
    op.create_primary_key(
        "customer_items_pkey",
        "customer_items",
        ["customer_id", "customer_part_no"],
    )

    # ==========================================================
    # Reverse Step 3-3, 3-2, 3-1
    # ==========================================================

    op.drop_index("idx_customer_items_supplier_item", "customer_items")
    op.drop_column("customer_items", "is_primary")
    op.drop_column("customer_items", "supplier_item_id")

    op.alter_column(
        "customer_items",
        "customer_part_no",
        new_column_name="external_product_code",
    )

    op.drop_column("customer_items", "id")
    op.execute("DROP SEQUENCE IF EXISTS customer_items_id_seq")

    # ==========================================================
    # Reverse Step 2: Remove supplier_item_id from lot_receipts
    # ==========================================================

    op.drop_index("idx_lot_receipts_supplier_item", "lot_receipts")
    op.drop_column("lot_receipts", "supplier_item_id")

    # ==========================================================
    # Reverse Step 1: Rename supplier_items → product_suppliers
    # ==========================================================

    op.execute(
        "ALTER INDEX IF EXISTS idx_supplier_items_valid_to RENAME TO idx_product_suppliers_valid_to"
    )
    op.execute(
        "ALTER INDEX IF EXISTS idx_supplier_items_is_primary RENAME TO uq_product_primary_supplier"
    )
    op.drop_index("idx_supplier_items_maker_part", "supplier_items")
    op.drop_column("supplier_items", "notes")
    op.drop_column("supplier_items", "display_name")
    op.drop_constraint("uq_supplier_items_supplier_maker", "supplier_items", type_="unique")
    op.drop_column("supplier_items", "maker_part_no")
    op.create_unique_constraint(
        "uq_product_supplier",
        "supplier_items",
        ["product_id", "supplier_id"],
    )
    op.rename_table("supplier_items", "product_suppliers")
