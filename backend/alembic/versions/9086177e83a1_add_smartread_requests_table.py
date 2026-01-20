"""add_smartread_requests_table

Revision ID: 9086177e83a1
Revises: 8821aca11e53
Create Date: 2026-01-20 11:47:44.429899

"""

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op


# revision identifiers, used by Alembic.
revision = "9086177e83a1"
down_revision = "8821aca11e53"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # smartread_requests テーブル作成
    op.create_table(
        "smartread_requests",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("request_id", sa.String(length=255), nullable=False),
        sa.Column("task_id_ref", sa.BigInteger(), nullable=True),
        sa.Column("task_id", sa.String(length=255), nullable=False),
        sa.Column("task_date", sa.Date(), nullable=False),
        sa.Column("config_id", sa.BigInteger(), nullable=False),
        sa.Column("filename", sa.String(length=500), nullable=True),
        sa.Column("num_of_pages", sa.Integer(), nullable=True),
        sa.Column(
            "submitted_at",
            sa.DateTime(),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.Column(
            "state",
            sa.String(length=50),
            server_default=sa.text("'PENDING'"),
            nullable=False,
        ),
        sa.Column("result_json", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["config_id"], ["smartread_configs.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["task_id_ref"], ["smartread_tasks.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("request_id"),
    )

    # インデックス作成
    op.create_index(
        "idx_smartread_requests_task_date",
        "smartread_requests",
        ["task_date"],
        unique=False,
    )
    op.create_index(
        "idx_smartread_requests_state",
        "smartread_requests",
        ["state"],
        unique=False,
    )
    op.create_index(
        "idx_smartread_requests_config_date",
        "smartread_requests",
        ["config_id", "task_date"],
        unique=False,
    )

    # smartread_long_data に request_id_ref カラム追加
    op.add_column(
        "smartread_long_data",
        sa.Column("request_id_ref", sa.BigInteger(), nullable=True),
    )
    op.create_foreign_key(
        "fk_smartread_long_data_request_id",
        "smartread_long_data",
        "smartread_requests",
        ["request_id_ref"],
        ["id"],
        ondelete="SET NULL",
    )

    # smartread_wide_data に request_id_ref カラム追加
    op.add_column(
        "smartread_wide_data",
        sa.Column("request_id_ref", sa.BigInteger(), nullable=True),
    )
    op.alter_column(
        "smartread_wide_data",
        "export_id",
        existing_type=sa.VARCHAR(length=255),
        nullable=True,
    )
    op.create_foreign_key(
        "fk_smartread_wide_data_request_id",
        "smartread_wide_data",
        "smartread_requests",
        ["request_id_ref"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    # smartread_wide_data から request_id_ref を削除
    op.drop_constraint(
        "fk_smartread_wide_data_request_id", "smartread_wide_data", type_="foreignkey"
    )
    op.alter_column(
        "smartread_wide_data",
        "export_id",
        existing_type=sa.VARCHAR(length=255),
        nullable=False,
    )
    op.drop_column("smartread_wide_data", "request_id_ref")

    # smartread_long_data から request_id_ref を削除
    op.drop_constraint(
        "fk_smartread_long_data_request_id", "smartread_long_data", type_="foreignkey"
    )
    op.drop_column("smartread_long_data", "request_id_ref")

    # インデックス削除
    op.drop_index("idx_smartread_requests_config_date", table_name="smartread_requests")
    op.drop_index("idx_smartread_requests_state", table_name="smartread_requests")
    op.drop_index("idx_smartread_requests_task_date", table_name="smartread_requests")

    # smartread_requests テーブル削除
    op.drop_table("smartread_requests")
