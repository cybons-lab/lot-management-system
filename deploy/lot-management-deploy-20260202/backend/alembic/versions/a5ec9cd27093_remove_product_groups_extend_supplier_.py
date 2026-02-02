"""remove_product_groups_extend_supplier_items

商品構成マスタ（product_groups）を削除し、必要な項目をsupplier_itemsに統合。
2コード体系への移行を完了。

Revision ID: a5ec9cd27093
Revises: 9d7943ef324a
Create Date: 2026-01-29 08:22:11.145994

"""

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op


# revision identifiers, used by Alembic.
revision = "a5ec9cd27093"
down_revision = "9d7943ef324a"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """
    1. supplier_itemsに新カラム追加（単位変換、消費期限、ロット管理）
    2. display_nameとbase_unitをNOT NULLに変更
    3. product_group_id、is_primaryカラムを削除
    4. 関連インデックスを削除
    5. product_groupsテーブルを削除
    """
    # Step 1: Add new columns to supplier_items
    op.add_column(
        "supplier_items",
        sa.Column(
            "internal_unit",
            sa.String(20),
            nullable=True,
            comment="社内単位/引当単位（例: CAN）",
        ),
    )
    op.add_column(
        "supplier_items",
        sa.Column(
            "external_unit",
            sa.String(20),
            nullable=True,
            comment="外部単位/表示単位（例: KG）",
        ),
    )
    op.add_column(
        "supplier_items",
        sa.Column(
            "qty_per_internal_unit",
            sa.Numeric(10, 4),
            nullable=True,
            comment="内部単位あたりの数量（例: 1 CAN = 20.0 KG）",
        ),
    )
    op.add_column(
        "supplier_items",
        sa.Column(
            "consumption_limit_days",
            sa.Integer,
            nullable=True,
            comment="消費期限日数",
        ),
    )
    op.add_column(
        "supplier_items",
        sa.Column(
            "requires_lot_number",
            sa.Boolean,
            nullable=False,
            server_default=sa.text("true"),
            comment="ロット番号管理が必要",
        ),
    )

    # Step 2: Make display_name NOT NULL (set default for existing NULL values)
    op.execute("UPDATE supplier_items SET display_name = maker_part_no WHERE display_name IS NULL")
    op.alter_column(
        "supplier_items",
        "display_name",
        existing_type=sa.String(200),
        nullable=False,
    )

    # Step 3: Drop product_group_id foreign key constraint if exists
    op.execute(
        """
        DO $$ BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.table_constraints
                WHERE constraint_name = 'supplier_items_product_group_id_fkey'
                AND table_name = 'supplier_items'
            ) THEN
                ALTER TABLE supplier_items DROP CONSTRAINT supplier_items_product_group_id_fkey;
            END IF;
        END $$;
        """
    )

    # Step 4: Drop indexes related to product_group_id and is_primary if they exist
    op.execute("DROP INDEX IF EXISTS idx_supplier_items_product_group")
    op.execute("DROP INDEX IF EXISTS idx_supplier_items_is_primary")

    # Step 5: Drop product_group_id and is_primary columns if they exist
    op.execute("ALTER TABLE supplier_items DROP COLUMN IF EXISTS product_group_id")
    op.execute("ALTER TABLE supplier_items DROP COLUMN IF EXISTS is_primary")

    # Step 6: Drop all foreign keys that reference product_groups
    # This is required before we can drop the table
    op.execute(
        """
        DO $$
        DECLARE
            r RECORD;
        BEGIN
            -- Find all foreign key constraints that reference product_groups
            FOR r IN (
                SELECT tc.constraint_name, tc.table_name
                FROM information_schema.table_constraints tc
                JOIN information_schema.constraint_column_usage ccu
                    ON tc.constraint_name = ccu.constraint_name
                WHERE tc.constraint_type = 'FOREIGN KEY'
                  AND ccu.table_name = 'product_groups'
            ) LOOP
                EXECUTE 'ALTER TABLE ' || quote_ident(r.table_name) ||
                        ' DROP CONSTRAINT IF EXISTS ' || quote_ident(r.constraint_name);
            END LOOP;
        END $$;
        """
    )

    # Step 7: Drop product_groups table (CASCADE to handle any remaining dependencies)
    op.execute("DROP TABLE IF EXISTS product_groups CASCADE")


def downgrade() -> None:
    """
    Downgrade is not supported for this migration as it involves data loss.
    To revert, restore from backup.
    """
    raise NotImplementedError(
        "Downgrade not supported for product_groups removal. Restore from backup if needed."
    )
