"""Phase1: Check maker_part_no nulls before NOT NULL constraint.

Revision ID: i3j4k5l6m7n8
Revises: h2i3j4k5l6m7
Create Date: 2026-01-27

Phase1実装: SKU駆動による在庫管理修正
Step 1/4: supplier_items.maker_part_no の NULL/空文字チェック

このMigrationは supplier_items.maker_part_no に NOT NULL 制約を追加する前に、
既存データに NULL または空文字が含まれていないかをチェックします。

データに問題がある場合は Exception を raise してマイグレーションを中断します。
"""

import sqlalchemy as sa

from alembic import op


# revision identifiers, used by Alembic.
revision = "i3j4k5l6m7n8"
down_revision = "h2i3j4k5l6m7"
branch_labels = None
depends_on = None


def upgrade():
    """Check for NULL or empty maker_part_no values."""
    conn = op.get_bind()
    result = conn.execute(
        sa.text("""
            SELECT id, supplier_id, product_id, maker_part_no
            FROM supplier_items
            WHERE maker_part_no IS NULL OR maker_part_no = ''
        """)
    )
    rows = result.fetchall()

    if rows:
        # Format detailed error message with row information
        error_details = []
        for row in rows[:10]:  # Show first 10 rows
            error_details.append(
                f"  - ID: {row.id}, supplier_id: {row.supplier_id}, "
                f"product_id: {row.product_id}, maker_part_no: '{row.maker_part_no}'"
            )

        error_msg = (
            f"\n{'='*80}\n"
            f"Phase1 Migration Error: Cannot proceed with maker_part_no NOT NULL constraint\n"
            f"{'='*80}\n\n"
            f"Found {len(rows)} rows with NULL or empty maker_part_no in supplier_items table.\n\n"
            f"Details (showing first 10):\n"
            + "\n".join(error_details)
            + (f"\n  ... and {len(rows) - 10} more rows" if len(rows) > 10 else "")
            + "\n\n"
            f"Action Required:\n"
            f"1. Fix the data by setting proper maker_part_no values\n"
            f"2. Use the following SQL to find all affected rows:\n"
            f"   SELECT id, supplier_id, product_id FROM supplier_items\n"
            f"   WHERE maker_part_no IS NULL OR maker_part_no = '';\n\n"
            f"3. Re-run migration after fixing the data\n"
            f"{'='*80}\n"
        )
        raise Exception(error_msg)

    print("\n✅ Phase1 Check: All supplier_items have valid maker_part_no\n")


def downgrade():
    """No downgrade needed for a check-only migration."""
    pass
