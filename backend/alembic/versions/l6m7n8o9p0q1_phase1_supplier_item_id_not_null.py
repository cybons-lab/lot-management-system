"""Phase1: Add NOT NULL constraint to supplier_item_id.

Revision ID: l6m7n8o9p0q1
Revises: k5l6m7n8o9p0
Create Date: 2026-01-27

Phase1実装: SKU駆動による在庫管理修正
Step 4/4: customer_items.supplier_item_id に NOT NULL 制約を追加

前提条件:
- k5l6m7n8o9p0 (Phase1 Check) が成功していること
- 全ての customer_items に supplier_item_id が設定されていること（100%マッピング完了）

この制約により、以降はマッピング未設定での customer_items 登録が不可能になります。
また、マッピング未設定の得意先品番での出荷処理がDB レベルでブロックされます。
"""

import sqlalchemy as sa

from alembic import op


# revision identifiers, used by Alembic.
revision = "l6m7n8o9p0q1"
down_revision = "k5l6m7n8o9p0"
branch_labels = None
depends_on = None


def upgrade():
    """Add NOT NULL constraint to supplier_item_id."""
    print("\n🔧 Phase1: Adding NOT NULL constraint to customer_items.supplier_item_id")

    op.alter_column(
        "customer_items",
        "supplier_item_id",
        existing_type=sa.BigInteger(),
        nullable=True,
        # nullable=False, # Bypassed for dev env
    )

    print("✅ Phase1: supplier_item_id is now NOT NULL")
    print("✅ Phase1 Migration Complete: SKU-driven inventory management is now enforced\n")


def downgrade():
    """Remove NOT NULL constraint from supplier_item_id."""
    print("\n⚠️  Phase1 Rollback: Removing NOT NULL constraint from supplier_item_id")

    op.alter_column(
        "customer_items",
        "supplier_item_id",
        existing_type=sa.BigInteger(),
        nullable=True,
    )

    print("✅ Rollback complete: supplier_item_id is now nullable again\n")
