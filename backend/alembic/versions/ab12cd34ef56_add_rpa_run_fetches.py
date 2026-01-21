"""Add rpa run fetches table.

Revision ID: ab12cd34ef56
Revises: f6b7c8d9e0f1
Create Date: 2026-02-12 00:00:00.000000
"""

import sqlalchemy as sa

from alembic import op


# revision identifiers, used by Alembic.
revision = "ab12cd34ef56"
down_revision = "f6b7c8d9e0f1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "rpa_run_fetches",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column(
            "rpa_type",
            sa.String(length=50),
            server_default="material_delivery_note",
            nullable=False,
        ),
        sa.Column("start_date", sa.Date(), nullable=True),
        sa.Column("end_date", sa.Date(), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("item_count", sa.Integer(), nullable=True),
        sa.Column("run_created", sa.Integer(), nullable=True),
        sa.Column("run_updated", sa.Integer(), nullable=True),
        sa.Column("message", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
    )
    op.create_index("idx_rpa_run_fetches_created_at", "rpa_run_fetches", ["created_at"])


def downgrade() -> None:
    op.drop_index("idx_rpa_run_fetches_created_at", table_name="rpa_run_fetches")
    op.drop_table("rpa_run_fetches")
