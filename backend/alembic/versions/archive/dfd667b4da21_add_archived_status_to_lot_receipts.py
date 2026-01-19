"""add_archived_status_to_lot_receipts

Revision ID: dfd667b4da21
Revises: 36386d722bab
Create Date: 2026-01-18 19:41:15.364107

"""

import sqlalchemy as sa

from alembic import op


# revision identifiers, used by Alembic.
revision = "dfd667b4da21"
down_revision = "36386d722bab"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Drop the old constraint
    op.drop_constraint("chk_lots_status", "lot_receipts", type_="check")

    # Add the new constraint with 'archived' status included
    op.create_check_constraint(
        "chk_lots_status",
        "lot_receipts",
        "status IN ('active','depleted','expired','quarantine','locked','archived')",
    )


def downgrade() -> None:
    # Drop the new constraint
    op.drop_constraint("chk_lots_status", "lot_receipts", type_="check")

    # Restore the old constraint without 'archived'
    op.create_check_constraint(
        "chk_lots_status",
        "lot_receipts",
        "status IN ('active','depleted','expired','quarantine','locked')",
    )
