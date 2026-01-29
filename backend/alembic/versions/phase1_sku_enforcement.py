"""Phase1: SKU-driven inventory management enforcement

Revision ID: phase1_sku_enforcement
Revises: baseline_2026_01_27
Create Date: 2026-01-27

Phase1実装: SKU駆動による在庫管理修正

このマイグレーションは以下を実施します:
1. supplier_items.maker_part_no の NULL/空文字チェック → NOT NULL 制約追加
2. customer_items.supplier_item_id の NULL チェック → NOT NULL 制約追加

前提条件（100%マッピング完了が必須）:
- 全ての supplier_items に maker_part_no が設定されていること
- 全ての customer_items に supplier_item_id が設定されていること

実行前に必ずデータ監査を実施してください:
  docker compose exec backend python -m app.scripts.phase1_audit
"""

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
    # Step 3: Check customer_items.supplier_item_id
    # ========================================================================
    print("Step 3/4: Checking customer_items.supplier_item_id for NULL values...")

    result = conn.execute(
        sa.text("""
            SELECT
                ci.id,
                ci.customer_id,
                ci.customer_part_no,
                c.customer_name,
                ci.supplier_item_id,
                ci.valid_to
            FROM customer_items ci
            LEFT JOIN customers c ON ci.customer_id = c.id
            WHERE ci.supplier_item_id IS NULL
        """)
    )
    rows = result.fetchall()

    if rows:
        # Separate active and inactive records
        active_rows = []
        inactive_rows = []
        for row in rows:
            if row.valid_to is None or row.valid_to >= sa.func.current_date():
                active_rows.append(row)
            else:
                inactive_rows.append(row)

        error_details = []

        if active_rows:
            error_details.append(f"\n⚠️  Active records without mapping: {len(active_rows)}")
            for row in active_rows[:10]:
                error_details.append(
                    f"  - ID: {row.id}, customer: {row.customer_name}, "
                    f"customer_part_no: '{row.customer_part_no}'"
                )
            if len(active_rows) > 10:
                error_details.append(f"  ... and {len(active_rows) - 10} more active rows")

        if inactive_rows:
            error_details.append(f"\n⚠️  Inactive records without mapping: {len(inactive_rows)}")
            error_details.append("  (These should also be fixed or permanently deleted)")

        error_msg = (
            f"\n{'=' * 80}\n"
            f"❌ Phase1 Migration Error: Cannot proceed\n"
            f"{'=' * 80}\n\n"
            f"Found {len(rows)} customer_items without supplier_item_id mapping.\n"
            + "\n".join(error_details)
            + "\n\n"
            f"Action Required:\n"
            f"1. Complete all customer_items → supplier_items mappings\n"
            f"2. Use the 得意先品番マスタ UI to set supplier_item_id for all active records\n"
            f"3. For inactive records, either:\n"
            f"   a) Set proper mapping, or\n"
            f"   b) Permanently delete them (admin only)\n\n"
            f"4. Use this SQL to find all unmapped records:\n"
            f"   SELECT id, customer_id, customer_part_no, valid_to\n"
            f"   FROM customer_items WHERE supplier_item_id IS NULL;\n\n"
            f"5. Re-run migration after 100% mapping completion\n"
            f"{'=' * 80}\n"
        )
        raise Exception(error_msg)

    print("✅ All customer_items have supplier_item_id mapping\n")

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
