"""add withdrawal cancellation fields

Revision ID: w1x2y3z4a5b6
Revises: 348d4e9f7602
Create Date: 2026-01-11 10:00:00.000000

出庫（Withdrawal）の取消機能に必要なフィールドを追加。
- cancelled_at: 取消日時
- cancelled_by: 取消実行者（User FK）
- cancel_reason: 取消理由（Enum値）
- cancel_note: 取消メモ
"""

import sqlalchemy as sa

from alembic import op


# revision identifiers, used by Alembic.
revision = "w1x2y3z4a5b6"
down_revision = "348d4e9f7602"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 出庫テーブルに取消関連フィールドを追加
    with op.batch_alter_table("withdrawals", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column(
                "cancelled_at",
                sa.DateTime(),
                nullable=True,
                comment="取消日時",
            )
        )
        batch_op.add_column(
            sa.Column(
                "cancelled_by",
                sa.BigInteger(),
                nullable=True,
                comment="取消実行者ユーザーID",
            )
        )
        batch_op.add_column(
            sa.Column(
                "cancel_reason",
                sa.String(length=50),
                nullable=True,
                comment="取消理由",
            )
        )
        batch_op.add_column(
            sa.Column(
                "cancel_note",
                sa.Text(),
                nullable=True,
                comment="取消メモ",
            )
        )
        # cancelled_by の外部キー制約を追加
        batch_op.create_foreign_key(
            "fk_withdrawals_cancelled_by_users",
            "users",
            ["cancelled_by"],
            ["id"],
            ondelete="RESTRICT",
        )
        # 取消済み出庫を効率的に検索するためのインデックス
        batch_op.create_index(
            "idx_withdrawals_cancelled_at",
            ["cancelled_at"],
            postgresql_where=sa.text("cancelled_at IS NOT NULL"),
        )


def downgrade() -> None:
    with op.batch_alter_table("withdrawals", schema=None) as batch_op:
        batch_op.drop_index(
            "idx_withdrawals_cancelled_at",
            postgresql_where=sa.text("cancelled_at IS NOT NULL"),
        )
        batch_op.drop_constraint("fk_withdrawals_cancelled_by_users", type_="foreignkey")
        batch_op.drop_column("cancel_note")
        batch_op.drop_column("cancel_reason")
        batch_op.drop_column("cancelled_by")
        batch_op.drop_column("cancelled_at")
