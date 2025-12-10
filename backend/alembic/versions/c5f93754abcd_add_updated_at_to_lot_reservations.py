"""add_updated_at_to_lot_reservations

Revision ID: c5f93754abcd
Revises: b402f0660f64
Create Date: 2025-12-10 16:50:00.000000

"""

import sqlalchemy as sa

from alembic import op


# revision identifiers, used by Alembic.
revision = "c5f93754abcd"
down_revision = "b402f0660f64"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add updated_at column to lot_reservations table."""
    op.add_column(
        "lot_reservations",
        sa.Column("updated_at", sa.DateTime(), nullable=True, comment="Timestamp of last update"),
    )
    # Optionally update existing records to have updated_at = created_at
    op.execute("UPDATE lot_reservations SET updated_at = created_at WHERE updated_at IS NULL")


def downgrade() -> None:
    """Remove updated_at column from lot_reservations table."""
    op.drop_column("lot_reservations", "updated_at")
