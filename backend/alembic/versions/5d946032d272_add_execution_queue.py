"""add_execution_queue

Revision ID: 5d946032d272
Revises: 4f7c1b2d9eaa
Create Date: 2026-02-08 08:58:35.254969

"""

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op


# revision identifiers, used by Alembic.
revision = "5d946032d272"
down_revision = "4f7c1b2d9eaa"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "execution_queue",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("resource_type", sa.String(length=50), nullable=False),
        sa.Column("resource_id", sa.String(length=100), nullable=False),
        sa.Column(
            "status", sa.String(length=20), server_default=sa.text("'pending'"), nullable=False
        ),
        sa.Column("requested_by_user_id", sa.BigInteger(), nullable=False),
        sa.Column(
            "parameters",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'{}'"),
            nullable=False,
        ),
        sa.Column("priority", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("position", sa.Integer(), nullable=True),
        sa.Column("started_at", sa.DateTime(), nullable=True),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        sa.Column("heartbeat_at", sa.DateTime(), nullable=True),
        sa.Column("timeout_seconds", sa.Integer(), server_default=sa.text("300"), nullable=False),
        sa.Column("result_message", sa.Text(), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False
        ),
        sa.ForeignKeyConstraint(
            ["requested_by_user_id"],
            ["users.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    with op.batch_alter_table("execution_queue", schema=None) as batch_op:
        batch_op.create_index("ix_execution_queue_created", ["status", "created_at"], unique=False)
        batch_op.create_index(
            "ix_execution_queue_lookup", ["resource_type", "resource_id", "status"], unique=False
        )
        batch_op.create_index(
            "ix_execution_queue_running_unique",
            ["resource_type", "resource_id"],
            unique=True,
            postgresql_where=sa.text("status = 'running'"),
        )


def downgrade() -> None:
    with op.batch_alter_table("execution_queue", schema=None) as batch_op:
        batch_op.drop_index(
            "ix_execution_queue_running_unique", postgresql_where=sa.text("status = 'running'")
        )
        batch_op.drop_index("ix_execution_queue_lookup")
        batch_op.drop_index("ix_execution_queue_created")

    op.drop_table("execution_queue")
