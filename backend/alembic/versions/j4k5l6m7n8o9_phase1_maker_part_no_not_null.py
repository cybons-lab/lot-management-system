"""Phase1: Add NOT NULL constraint to maker_part_no.

Revision ID: j4k5l6m7n8o9
Revises: i3j4k5l6m7n8
Create Date: 2026-01-27

Phase1実装: SKU駆動による在庫管理修正
Step 2/4: supplier_items.maker_part_no に NOT NULL 制約を追加

前提条件:
- i3j4k5l6m7n8 (Phase1 Check) が成功していること
- 全ての supplier_items に maker_part_no が設定されていること

この制約により、以降は maker_part_no なしでの supplier_items 登録が不可能になります。
"""

import sqlalchemy as sa

from alembic import op


# revision identifiers, used by Alembic.
revision = "j4k5l6m7n8o9"
down_revision = "i3j4k5l6m7n8"
branch_labels = None
depends_on = None


def upgrade():
    """Add NOT NULL constraint to maker_part_no."""
    print("\n🔧 Phase1: Adding NOT NULL constraint to supplier_items.maker_part_no")

    op.alter_column(
        "supplier_items",
        "maker_part_no",
        existing_type=sa.String(100),
        nullable=False,
    )

    print("✅ Phase1: maker_part_no is now NOT NULL\n")


def downgrade():
    """Remove NOT NULL constraint from maker_part_no."""
    print("\n⚠️  Phase1 Rollback: Removing NOT NULL constraint from maker_part_no")

    op.alter_column(
        "supplier_items",
        "maker_part_no",
        existing_type=sa.String(100),
        nullable=True,
    )

    print("✅ Rollback complete: maker_part_no is now nullable again\n")
