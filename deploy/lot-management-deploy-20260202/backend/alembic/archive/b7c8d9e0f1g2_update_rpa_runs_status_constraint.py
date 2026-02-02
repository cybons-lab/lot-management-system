"""update rpa_runs_status constraint to add downloaded

Revision ID: b7c8d9e0f1g2
Revises: 58a60869c7e1
Create Date: 2025-12-19 19:40:00.000000

"""

import sqlalchemy as sa

from alembic import op


# revision identifiers, used by Alembic.
revision = "b7c8d9e0f1g2"
down_revision = "58a60869c7e1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Drop the old constraint
    op.drop_constraint("chk_rpa_runs_status", "rpa_runs", type_="check")

    # Create the new constraint with 'downloaded' added
    op.create_check_constraint(
        "chk_rpa_runs_status",
        "rpa_runs",
        "status IN ('draft', 'downloaded', 'ready_for_step2', 'step2_running', 'done', 'cancelled')",
    )


def downgrade() -> None:
    # Revert back to old constraint
    op.drop_constraint("chk_rpa_runs_status", "rpa_runs", type_="check")

    op.create_check_constraint(
        "chk_rpa_runs_status",
        "rpa_runs",
        "status IN ('draft', 'ready_for_step2', 'step2_running', 'done', 'cancelled')",
    )
