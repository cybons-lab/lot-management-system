"""add_delivery_date_to_ocr_edits

Revision ID: 271b5b7afd1d
Revises: 8a09ac586cc7
Create Date: 2026-01-23 16:33:38.638201

"""

import sqlalchemy as sa

from alembic import op


# revision identifiers, used by Alembic.
revision = "271b5b7afd1d"
down_revision = "8a09ac586cc7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add delivery_date column to ocr_result_edits table."""
    op.add_column("ocr_result_edits", sa.Column("delivery_date", sa.String(10), nullable=True))


def downgrade() -> None:
    """Remove delivery_date column from ocr_result_edits table."""
    op.drop_column("ocr_result_edits", "delivery_date")
