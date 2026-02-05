"""add_order_no_to_lot_master

Revision ID: 2d9f9a0b6b1c
Revises: df2c7a6b5a9c
Create Date: 2026-02-05 12:05:00.000000
"""

import sqlalchemy as sa

from alembic import op


# revision identifiers, used by Alembic.
revision = "2d9f9a0b6b1c"
down_revision = "df2c7a6b5a9c"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "lot_master",
        sa.Column("order_no", sa.String(length=100), nullable=True, comment="発注NO（手入力）"),
    )


def downgrade() -> None:
    op.drop_column("lot_master", "order_no")
