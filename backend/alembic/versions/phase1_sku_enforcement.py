"""Phase1: SKU-driven inventory management enforcement

Revision ID: phase1_sku_enforcement
Revises: baseline_2026_01_27
Create Date: 2026-01-27

Phase1実装: SKU駆動による在庫管理修正

このマイグレーションは以下を実施します:
1. supplier_items.maker_part_no の NULL/空文字チェック → NOT NULL 制約追加
2. customer_items.supplier_item_id の自動マッピング（product_group_id経由）
3. customer_items.supplier_item_id の NOT NULL 制約追加

自動マッピング機能:
- supplier_item_id が NULL の customer_items を自動的にマッピング
- product_id が一致する supplier_items を選択（is_primary 優先）
- マッピング不可能なレコードがある場合はエラーで停止

前提条件:
- 全ての supplier_items に maker_part_no が設定されていること
- マッピング不可能な customer_items は事前に削除または修正しておくこと
"""

from datetime import date

import sqlalchemy as sa

from alembic import op


# revision identifiers, used by Alembic.
revision = "phase1_sku_enforcement"
down_revision = "4e9ab10f6031"
branch_labels = None
depends_on = None


def upgrade():
    """Phase1: Add NOT NULL constraints for SKU enforcement."""
    conn = op.get_bind()

    print("\n" + "=" * 80)
    print("Phase1 Migration: SKU-driven inventory management enforcement")
    print("=" * 80 + "\n")

    # ========================================================================
    # Step 1: Check supplier_items.maker_part_no
    # ========================================================================
    print("Step 1/4: Checking supplier_items.maker_part_no for NULL/empty values...")

    result = conn.execute(
        sa.text("""
            SELECT id, supplier_id, product_id, maker_part_no
            FROM supplier_items
            WHERE maker_part_no IS NULL OR maker_part_no = ''
        """)
    )
    rows = result.fetchall()

    if rows:
        error_details = []
        for row in rows[:10]:
            error_details.append(
                f"  - ID: {row.id}, supplier_id: {row.supplier_id}, "
                f"product_id: {row.product_id}, maker_part_no: '{row.maker_part_no}'"
            )

        error_msg = (
            f"\n{'=' * 80}\n"
            f"❌ Phase1 Migration Error: Cannot proceed\n"
            f"{'=' * 80}\n\n"
            f"Found {len(rows)} rows with NULL or empty maker_part_no in supplier_items.\n\n"
            f"Details (first 10):\n"
            + "\n".join(error_details)
            + (f"\n  ... and {len(rows) - 10} more rows" if len(rows) > 10 else "")
            + "\n\n"
            f"Action Required:\n"
            f"1. Fix the data by setting proper maker_part_no values\n"
            f"2. Use this SQL to find all affected rows:\n"
            f"   SELECT id, supplier_id, product_id FROM supplier_items\n"
            f"   WHERE maker_part_no IS NULL OR maker_part_no = '';\n\n"
            f"3. Re-run migration after fixing the data\n"
            f"{'=' * 80}\n"
        )
        raise Exception(error_msg)

    print("✅ All supplier_items have valid maker_part_no\n")

    # ========================================================================
    # Step 2: Add NOT NULL constraint to maker_part_no
    # ========================================================================
    print("Step 2/4: Adding NOT NULL constraint to supplier_items.maker_part_no...")

    op.alter_column(
        "supplier_items",
        "maker_part_no",
        existing_type=sa.String(100),
        nullable=False,
    )

    print("✅ supplier_items.maker_part_no is now NOT NULL\n")

    # ========================================================================
    # Step 3: Auto-map customer_items.supplier_item_id
    # ========================================================================
    print("Step 3/4: Auto-mapping customer_items.supplier_item_id...")

    # Check for unmapped records
    result = conn.execute(
        sa.text("""
            SELECT COUNT(*)
            FROM customer_items
            WHERE supplier_item_id IS NULL
        """)
    )
    unmapped_count = result.scalar()

    if unmapped_count > 0:
        print(f"Found {unmapped_count} unmapped customer_items. Auto-mapping...")

        # Auto-map based on product_id (prefer is_primary=true)
        # Note: At this point in migration history, the column is still named product_id
        # (products_to_product_groups migration renames it later)
        result = conn.execute(
            sa.text("""
                UPDATE customer_items ci
                SET supplier_item_id = (
                    SELECT si.id
                    FROM supplier_items si
                    WHERE si.product_id = ci.product_id
                    ORDER BY si.is_primary DESC, si.id ASC
                    LIMIT 1
                )
                WHERE ci.supplier_item_id IS NULL
                  AND ci.product_id IS NOT NULL
            """)
        )
        mapped_count = result.rowcount
        print(f"✅ Auto-mapped {mapped_count} customer_items via product_id")

        # Check if there are still unmapped records (no product_id match)
        result = conn.execute(
            sa.text("""
                SELECT
                    ci.id,
                    ci.customer_id,
                    ci.customer_part_no,
                    c.customer_name,
                    ci.product_id
                FROM customer_items ci
                LEFT JOIN customers c ON ci.customer_id = c.id
                WHERE ci.supplier_item_id IS NULL
            """)
        )
        still_unmapped = result.fetchall()

        if still_unmapped:
            error_details = [
                f"\n⚠️  Could not auto-map {len(still_unmapped)} customer_items (no matching supplier_items):"
            ]
            for row in still_unmapped[:10]:
                error_details.append(
                    f"  - ID: {row.id}, customer: {row.customer_name}, "
                    f"customer_part_no: '{row.customer_part_no}', product_id: {row.product_id}"
                )
            if len(still_unmapped) > 10:
                error_details.append(f"  ... and {len(still_unmapped) - 10} more rows")

            error_msg = (
                f"\n{'=' * 80}\n"
                f"❌ Phase1 Migration Error: Cannot proceed\n"
                f"{'=' * 80}\n\n"
                f"Auto-mapped {mapped_count} records, but {len(still_unmapped)} records "
                f"could not be mapped automatically.\n" + "\n".join(error_details) + "\n\n"
                f"Action Required:\n"
                f"1. Manually map these records via 得意先品番マスタ UI, or\n"
                f"2. Delete these records if they are obsolete\n\n"
                f"3. Re-run migration after fixing\n"
                f"{'=' * 80}\n"
            )
            raise Exception(error_msg)
    else:
        print("✅ All customer_items already have supplier_item_id mapping\n")

    # ========================================================================
    # Step 4: Add NOT NULL constraint to supplier_item_id
    # ========================================================================
    print("Step 4/4: Adding NOT NULL constraint to customer_items.supplier_item_id...")

    op.alter_column(
        "customer_items",
        "supplier_item_id",
        existing_type=sa.BigInteger(),
        nullable=False,
    )

    print("✅ customer_items.supplier_item_id is now NOT NULL\n")

    print("=" * 80)
    print("✅ Phase1 Migration Complete: SKU-driven inventory management enforced")
    print("=" * 80 + "\n")


def downgrade():
    """Rollback Phase1 constraints."""
    print("\n⚠️  Phase1 Rollback: Removing NOT NULL constraints\n")

    # Rollback customer_items.supplier_item_id
    op.alter_column(
        "customer_items",
        "supplier_item_id",
        existing_type=sa.BigInteger(),
        nullable=True,
    )
    print("✅ customer_items.supplier_item_id is now nullable")

    # Rollback supplier_items.maker_part_no
    op.alter_column(
        "supplier_items",
        "maker_part_no",
        existing_type=sa.String(100),
        nullable=True,
    )
    print("✅ supplier_items.maker_part_no is now nullable")

    print("\n✅ Phase1 Rollback Complete\n")
