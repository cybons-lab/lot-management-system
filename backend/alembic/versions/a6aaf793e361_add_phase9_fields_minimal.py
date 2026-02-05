"""add_phase9_fields_minimal

Phase 9 additions:
- lot_receipts.remarks (Text, nullable) - ロット備考
- allocation_suggestions.comment (Text, nullable) - 数量別コメント
- allocation_suggestions.manual_shipment_date (Date, nullable) - 手動出荷日

Revision ID: a6aaf793e361
Revises: 8d90d504f80e
Create Date: 2026-02-05 02:13:06.033979

"""

import sqlalchemy as sa

from alembic import op


# revision identifiers, used by Alembic.
revision = "a6aaf793e361"
down_revision = "8d90d504f80e"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Phase 9.1: Add remarks to lot_receipts
    op.add_column(
        "lot_receipts",
        sa.Column("remarks", sa.Text(), nullable=True, comment="備考（ロットに関する付加情報）"),
    )

    # Phase 9.2: Add comment to allocation_suggestions
    op.add_column(
        "allocation_suggestions",
        sa.Column("comment", sa.Text(), nullable=True, comment="数量別コメント"),
    )

    # Phase 9.3: Add manual_shipment_date to allocation_suggestions
    op.add_column(
        "allocation_suggestions",
        sa.Column("manual_shipment_date", sa.Date(), nullable=True, comment="手動設定の出荷日"),
    )


def downgrade() -> None:
    # Remove Phase 9 fields in reverse order
    op.drop_column("allocation_suggestions", "manual_shipment_date")
    op.drop_column("allocation_suggestions", "comment")
    op.drop_column("lot_receipts", "remarks")
