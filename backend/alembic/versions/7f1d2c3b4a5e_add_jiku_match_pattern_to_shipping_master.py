"""add_jiku_match_pattern_to_shipping_master

Revision ID: 7f1d2c3b4a5e
Revises: phase1_final_cleanup
Create Date: 2026-02-06
"""

import sqlalchemy as sa

from alembic import op


revision = "7f1d2c3b4a5e"
down_revision = "phase1_final_cleanup"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "shipping_master_raw",
        sa.Column("jiku_match_pattern", sa.String(length=100), nullable=True),
    )
    op.add_column(
        "shipping_master_curated",
        sa.Column("jiku_match_pattern", sa.String(length=100), nullable=True),
    )
    op.add_column(
        "delivery_places",
        sa.Column("jiku_match_pattern", sa.String(length=100), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("delivery_places", "jiku_match_pattern")
    op.drop_column("shipping_master_curated", "jiku_match_pattern")
    op.drop_column("shipping_master_raw", "jiku_match_pattern")
