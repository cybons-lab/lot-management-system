"""change origin_type default to adhoc

Revision ID: 20241209_origin_adhoc
Revises: 20241209_cids
Create Date: 2025-12-09 21:02:00.000000

"""

import sqlalchemy as sa

from alembic import op


# revision identifiers, used by Alembic.
revision = "20241209_origin_adhoc"
down_revision = "20241209_cids"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Change origin_type default from 'order' to 'adhoc'.

    Note: This only affects new rows. Existing data is not modified.
    """
    op.alter_column(
        "lots",
        "origin_type",
        server_default=sa.text("'adhoc'"),
        existing_type=sa.String(20),
        existing_nullable=False,
    )


def downgrade() -> None:
    """Revert origin_type default back to 'order'."""
    op.alter_column(
        "lots",
        "origin_type",
        server_default=sa.text("'order'"),
        existing_type=sa.String(20),
        existing_nullable=False,
    )
