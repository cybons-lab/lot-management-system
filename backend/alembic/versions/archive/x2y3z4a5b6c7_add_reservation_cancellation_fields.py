"""add reservation cancellation fields

Revision ID: x2y3z4a5b6c7
Revises: w1x2y3z4a5b6
Create Date: 2026-01-11 11:00:00.000000

LotReservation（予約）の取消機能に必要なフィールドを追加。
- cancel_reason: 取消理由
- cancel_note: 取消メモ
- cancelled_by: 取消実行者
"""

import sqlalchemy as sa

from alembic import op


# revision identifiers, used by Alembic.
revision = "x2y3z4a5b6c7"
down_revision = "w1x2y3z4a5b6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # lot_reservationsテーブルに取消関連フィールドを追加
    with op.batch_alter_table("lot_reservations", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column(
                "cancel_reason",
                sa.String(length=50),
                nullable=True,
                comment="Reason for cancellation (input_error, wrong_quantity, etc.)",
            )
        )
        batch_op.add_column(
            sa.Column(
                "cancel_note",
                sa.String(length=500),
                nullable=True,
                comment="Additional notes for cancellation",
            )
        )
        batch_op.add_column(
            sa.Column(
                "cancelled_by",
                sa.String(length=50),
                nullable=True,
                comment="User who cancelled the reservation",
            )
        )


def downgrade() -> None:
    with op.batch_alter_table("lot_reservations", schema=None) as batch_op:
        batch_op.drop_column("cancelled_by")
        batch_op.drop_column("cancel_note")
        batch_op.drop_column("cancel_reason")
