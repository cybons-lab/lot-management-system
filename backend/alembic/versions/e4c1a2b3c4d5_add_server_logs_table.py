"""Add server_logs table and request_id to system_client_logs.

Revision ID: e4c1a2b3c4d5
Revises: d1922e5e679c
Create Date: 2026-02-01 00:00:00.000000
"""

import sqlalchemy as sa

from alembic import op


# revision identifiers, used by Alembic.
revision = "e4c1a2b3c4d5"
down_revision = "d1922e5e679c"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "server_logs",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("level", sa.String(length=20), nullable=False),
        sa.Column("logger", sa.String(length=255), nullable=False),
        sa.Column("event", sa.Text(), nullable=True),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("request_id", sa.String(length=64), nullable=True),
        sa.Column("user_id", sa.BigInteger(), nullable=True),
        sa.Column("username", sa.String(length=255), nullable=True),
        sa.Column("method", sa.String(length=16), nullable=True),
        sa.Column("path", sa.Text(), nullable=True),
        sa.Column("extra", sa.JSON(), nullable=True),
    )
    op.create_index("idx_server_logs_created_at", "server_logs", ["created_at"])
    op.create_index("idx_server_logs_level", "server_logs", ["level"])
    op.create_index("idx_server_logs_request_id", "server_logs", ["request_id"])

    op.add_column("system_client_logs", sa.Column("request_id", sa.String(length=64)))
    op.create_index("idx_system_client_logs_request_id", "system_client_logs", ["request_id"])


def downgrade() -> None:
    op.drop_index("idx_system_client_logs_request_id", table_name="system_client_logs")
    op.drop_column("system_client_logs", "request_id")

    op.drop_index("idx_server_logs_request_id", table_name="server_logs")
    op.drop_index("idx_server_logs_level", table_name="server_logs")
    op.drop_index("idx_server_logs_created_at", table_name="server_logs")
    op.drop_table("server_logs")
