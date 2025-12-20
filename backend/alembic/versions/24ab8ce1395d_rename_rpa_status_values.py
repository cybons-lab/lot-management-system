"""rename_rpa_status_values

Revision ID: 24ab8ce1395d
Revises: d2aec7a236f4
Create Date: 2025-12-20 13:05:16.421973

"""

import sqlalchemy as sa

from alembic import op


# revision identifiers, used by Alembic.
revision = "24ab8ce1395d"
down_revision = "d2aec7a236f4"
branch_labels = None
depends_on = None


# New allowed status values
NEW_STATUS_VALUES = [
    "step1_done",
    "step2_confirmed",
    "step3_running",
    "step3_done",
    "step4_checking",
    "step4_ng_retry",
    "step4_review",
    "done",
    "cancelled",
]

# Old allowed status values (for downgrade)
OLD_STATUS_VALUES = [
    "downloaded",
    "ready_for_step2",
    "step2_running",
    "step3_done_waiting_external",
    "ready_for_step4_check",
    "step4_check_running",
    "ready_for_step4_review",
    "done",
    "cancelled",
]

# Status value mapping: old -> new
STATUS_MAPPING = {
    "downloaded": "step1_done",
    "draft": "step1_done",
    "ready_for_step2": "step2_confirmed",
    "step2_running": "step3_running",
    "step3_done_waiting_external": "step3_done",
    "ready_for_step4_check": "step4_checking",
    "step4_check_running": "step4_checking",
    "ready_for_step4_review": "step4_review",
}

# Reverse mapping for downgrade
REVERSE_MAPPING = {
    "step1_done": "downloaded",
    "step2_confirmed": "ready_for_step2",
    "step3_running": "step2_running",
    "step3_done": "step3_done_waiting_external",
    "step4_checking": "ready_for_step4_check",
    "step4_ng_retry": "ready_for_step4_check",
    "step4_review": "ready_for_step4_review",
}


def upgrade() -> None:
    # 1. Drop the old check constraint
    op.drop_constraint("chk_rpa_runs_status", "rpa_runs", type_="check")

    # 2. Update existing status values
    for old_status, new_status in STATUS_MAPPING.items():
        op.execute(
            sa.text(f"UPDATE rpa_runs SET status = '{new_status}' WHERE status = '{old_status}'")
        )

    # 3. Create new check constraint with new values
    op.create_check_constraint(
        "chk_rpa_runs_status",
        "rpa_runs",
        sa.column("status").in_(NEW_STATUS_VALUES),
    )

    # 4. Update default value for new rows
    op.alter_column("rpa_runs", "status", server_default="step1_done")


def downgrade() -> None:
    # 1. Drop the new check constraint
    op.drop_constraint("chk_rpa_runs_status", "rpa_runs", type_="check")

    # 2. Revert status values
    for new_status, old_status in REVERSE_MAPPING.items():
        op.execute(
            sa.text(f"UPDATE rpa_runs SET status = '{old_status}' WHERE status = '{new_status}'")
        )

    # 3. Recreate old check constraint
    op.create_check_constraint(
        "chk_rpa_runs_status",
        "rpa_runs",
        sa.column("status").in_(OLD_STATUS_VALUES),
    )

    # 4. Revert default value
    op.alter_column("rpa_runs", "status", server_default="downloaded")
