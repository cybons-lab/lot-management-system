"""Add lock and result tracking columns to rpa_run_items.

Revision ID: b7a1c2d3e4f5
Revises: 9972b886f379
Create Date: 2026-02-08 00:00:00.000000
"""

import sqlalchemy as sa

from alembic import op


# revision identifiers, used by Alembic.
revision = "b7a1c2d3e4f5"
down_revision = "9972b886f379"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("rpa_run_items", sa.Column("locked_until", sa.DateTime(), nullable=True))
    op.add_column("rpa_run_items", sa.Column("locked_by", sa.String(length=100), nullable=True))
    op.add_column("rpa_run_items", sa.Column("result_pdf_path", sa.String(length=255), nullable=True))
    op.add_column("rpa_run_items", sa.Column("result_message", sa.Text(), nullable=True))
    op.add_column("rpa_run_items", sa.Column("last_error_code", sa.String(length=50), nullable=True))
    op.add_column("rpa_run_items", sa.Column("last_error_message", sa.Text(), nullable=True))
    op.add_column(
        "rpa_run_items",
        sa.Column("last_error_screenshot_path", sa.String(length=255), nullable=True),
    )
    op.create_index(
        "idx_rpa_run_items_locked_until",
        "rpa_run_items",
        ["locked_until"],
    )


def downgrade() -> None:
    op.drop_index("idx_rpa_run_items_locked_until", table_name="rpa_run_items")
    op.drop_column("rpa_run_items", "last_error_screenshot_path")
    op.drop_column("rpa_run_items", "last_error_message")
    op.drop_column("rpa_run_items", "last_error_code")
    op.drop_column("rpa_run_items", "result_message")
    op.drop_column("rpa_run_items", "result_pdf_path")
    op.drop_column("rpa_run_items", "locked_by")
    op.drop_column("rpa_run_items", "locked_until")
