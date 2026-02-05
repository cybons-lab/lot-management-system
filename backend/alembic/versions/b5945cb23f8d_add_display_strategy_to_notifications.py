"""add_display_strategy_to_notifications

Revision ID: b5945cb23f8d
Revises: 4b1a9c7d2e10
Create Date: 2026-02-05 13:50:24.683334

"""

import sqlalchemy as sa

from alembic import op


# revision identifiers, used by Alembic.
revision = "b5945cb23f8d"
down_revision = "4b1a9c7d2e10"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add display_strategy column to notifications table
    op.add_column(
        "notifications",
        sa.Column(
            "display_strategy",
            sa.String(20),
            nullable=False,
            server_default="immediate",
            comment="Toast display strategy: immediate=toast+center, deferred=center only, persistent=toast(long)+center",
        ),
    )

    # Add CHECK constraint for valid display_strategy values
    op.create_check_constraint(
        "check_display_strategy",
        "notifications",
        "display_strategy IN ('immediate', 'deferred', 'persistent')",
    )


def downgrade() -> None:
    # Drop CHECK constraint
    op.drop_constraint("check_display_strategy", "notifications", type_="check")

    # Drop display_strategy column
    op.drop_column("notifications", "display_strategy")
