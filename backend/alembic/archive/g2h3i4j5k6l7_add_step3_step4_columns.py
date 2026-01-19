"""Add lock_flag, item_no, lot_no to rpa_run_items.

Revision ID: g2h3i4j5k6l7
Revises: f0b8334e2d44
Create Date: 2025-12-21

"""

import sqlalchemy as sa

from alembic import op


# revision identifiers, used by Alembic.
revision = "g2h3i4j5k6l7"
down_revision = "f0b8334e2d44"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add new columns for Step3/Step4 workflow."""
    # lock_flag: 編集ロック（Step3実行開始時にON）
    op.add_column(
        "rpa_run_items",
        sa.Column("lock_flag", sa.Boolean(), server_default=sa.text("false"), nullable=False),
    )
    # item_no: アイテムNo（CSVから取得）
    op.add_column(
        "rpa_run_items",
        sa.Column("item_no", sa.String(length=100), nullable=True),
    )
    # lot_no: ロットNo（Step4で入力）
    op.add_column(
        "rpa_run_items",
        sa.Column("lot_no", sa.String(length=100), nullable=True),
    )


def downgrade() -> None:
    """Remove the new columns."""
    op.drop_column("rpa_run_items", "lot_no")
    op.drop_column("rpa_run_items", "item_no")
    op.drop_column("rpa_run_items", "lock_flag")
