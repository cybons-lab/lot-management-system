"""Add smartread_pad_runs table

Revision ID: c8d9e0f1a2b3
Revises: e50bd306f303
Create Date: 2026-01-22 15:00:00.000000

PAD互換フローの実行記録テーブルを追加。
工程追跡（step）とheartbeat監視でバックグラウンド処理を管理する。

See: docs/smartread/pad_runner_implementation_plan.md
"""

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

from alembic import op


# revision identifiers, used by Alembic.
revision = "c8d9e0f1a2b3"
down_revision = "e50bd306f303"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "smartread_pad_runs",
        # Primary key
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("run_id", sa.String(length=36), nullable=False),
        sa.Column("config_id", sa.BigInteger(), nullable=False),
        # 状態管理
        sa.Column(
            "status",
            sa.String(length=20),
            server_default=sa.text("'RUNNING'"),
            nullable=False,
        ),
        sa.Column(
            "step",
            sa.String(length=30),
            server_default=sa.text("'CREATED'"),
            nullable=False,
        ),
        # SmartRead API のID
        sa.Column("task_id", sa.String(length=255), nullable=True),
        sa.Column("export_id", sa.String(length=255), nullable=True),
        # 入力情報
        sa.Column("filenames", JSONB(), nullable=True),
        # 結果
        sa.Column("wide_data_count", sa.Integer(), nullable=False, default=0),
        sa.Column("long_data_count", sa.Integer(), nullable=False, default=0),
        sa.Column("error_message", sa.Text(), nullable=True),
        # タイムスタンプ
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.Column(
            "heartbeat_at",
            sa.DateTime(),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        # リトライ管理
        sa.Column("retry_count", sa.Integer(), nullable=False, default=0),
        sa.Column("max_retries", sa.Integer(), nullable=False, default=3),
        # Constraints
        sa.ForeignKeyConstraint(
            ["config_id"], ["smartread_configs.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    # Index for run_id (unique)
    op.create_index(
        "ix_smartread_pad_runs_run_id",
        "smartread_pad_runs",
        ["run_id"],
        unique=True,
    )

    # Index for config_id + status (for listing running jobs)
    op.create_index(
        "ix_smartread_pad_runs_config_status",
        "smartread_pad_runs",
        ["config_id", "status"],
    )


def downgrade() -> None:
    op.drop_index("ix_smartread_pad_runs_config_status", table_name="smartread_pad_runs")
    op.drop_index("ix_smartread_pad_runs_run_id", table_name="smartread_pad_runs")
    op.drop_table("smartread_pad_runs")
