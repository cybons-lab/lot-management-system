"""add_short_name_to_delivery_places

Revision ID: 8821aca11e53
Revises: e4c1a2b3c4d5
Create Date: 2026-01-19 21:18:43.009977

"""

import sqlalchemy as sa

from alembic import op


# revision identifiers, used by Alembic.
revision = "8821aca11e53"
down_revision = "e4c1a2b3c4d5"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("delivery_places", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column(
                "short_name",
                sa.String(length=50),
                nullable=True,
                comment="短縮表示名（UI省スペース用）",
            )
        )


def downgrade() -> None:
    with op.batch_alter_table("delivery_places", schema=None) as batch_op:
        batch_op.drop_column("short_name")
