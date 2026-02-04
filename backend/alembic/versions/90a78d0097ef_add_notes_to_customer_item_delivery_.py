"""add_notes_to_customer_item_delivery_settings

Page-level notes for Excel View (メーカー品番 × 先方品番 × 納入先)

Revision ID: 90a78d0097ef
Revises: a6aaf793e361
Create Date: 2026-02-05 02:23:42.260924

"""

import sqlalchemy as sa

from alembic import op


# revision identifiers, used by Alembic.
revision = "90a78d0097ef"
down_revision = "a6aaf793e361"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add notes field for page-level memos
    op.add_column(
        "customer_item_delivery_settings",
        sa.Column("notes", sa.Text(), nullable=True, comment="Excel View ページ全体のメモ"),
    )


def downgrade() -> None:
    # Remove notes field
    op.drop_column("customer_item_delivery_settings", "notes")
