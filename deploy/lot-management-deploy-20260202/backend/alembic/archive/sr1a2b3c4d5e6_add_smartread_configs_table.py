"""add_smartread_configs_table

Revision ID: sr1a2b3c4d5e6
Revises: 6acff7fc6740
Create Date: 2026-01-14 10:00:00.000000

"""

import sqlalchemy as sa

from alembic import op


# revision identifiers, used by Alembic.
revision = "sr1a2b3c4d5e6"
down_revision = "6acff7fc6740"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "smartread_configs",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        # API接続設定
        sa.Column("endpoint", sa.Text(), nullable=False),
        sa.Column("api_key", sa.Text(), nullable=False),
        # リクエスト設定
        sa.Column("request_type", sa.String(length=50), nullable=False, server_default="sync"),
        sa.Column("template_ids", sa.Text(), nullable=True),
        # エクスポート設定
        sa.Column("export_type", sa.String(length=20), nullable=False, server_default="json"),
        sa.Column("aggregation_type", sa.String(length=50), nullable=True),
        # ディレクトリ設定
        sa.Column("watch_dir", sa.Text(), nullable=True),
        sa.Column("export_dir", sa.Text(), nullable=True),
        sa.Column(
            "input_exts", sa.String(length=100), nullable=True, server_default="pdf,png,jpg,jpeg"
        ),
        # メタ情報
        sa.Column("name", sa.String(length=100), nullable=False, server_default="default"),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
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
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("smartread_configs")
