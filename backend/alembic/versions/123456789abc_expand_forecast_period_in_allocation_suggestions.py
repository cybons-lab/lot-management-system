"""expand_forecast_period_in_allocation_suggestions

Revision ID: 123456789abc
Revises: e218bf23049b
Create Date: 2026-01-27 00:10:00.000000

"""

from collections.abc import Sequence
from typing import Union

import sqlalchemy as sa

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "123456789abc"
down_revision: str | None = "85aaf971a93f"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Expand forecast_period column to 20 characters to support "YYYY-MM-DD"
    op.alter_column(
        "allocation_suggestions",
        "forecast_period",
        existing_type=sa.String(length=7),
        type_=sa.String(length=20),
        existing_nullable=False,
    )


def downgrade() -> None:
    # Revert to 7 characters (Warning: Data truncation may occur if longer values exist)
    # In practice, reverting this should check for data length, but for simple downgrade:
    op.alter_column(
        "allocation_suggestions",
        "forecast_period",
        existing_type=sa.String(length=20),
        type_=sa.String(length=7),
        existing_nullable=False,
    )
