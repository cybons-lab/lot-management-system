"""enforce non-empty jiku_code on delivery_places

Revision ID: 4f7c1b2d9eaa
Revises: baseline_2026_02_06
Create Date: 2026-02-07 15:20:00
"""

import sqlalchemy as sa

from alembic import op


# revision identifiers, used by Alembic.
revision = "4f7c1b2d9eaa"
down_revision = "baseline_2026_02_06"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Backfill legacy blank/null values to deterministic non-empty values.
    # Keep format checks out of DB constraints per business request.
    op.execute(
        sa.text(
            """
            UPDATE delivery_places
            SET jiku_code = 'M' || id::text
            WHERE jiku_code IS NULL OR btrim(jiku_code) = ''
            """
        )
    )

    # Ensure omitted inserts do not become empty string.
    op.alter_column(
        "delivery_places",
        "jiku_code",
        existing_type=sa.String(length=50),
        server_default=sa.text("'A000'"),
        existing_nullable=False,
    )

    # Only enforce non-empty/non-whitespace (not strict pattern).
    op.create_check_constraint(
        "ck_delivery_places_jiku_code_not_blank",
        "delivery_places",
        "btrim(jiku_code) <> ''",
    )


def downgrade() -> None:
    op.drop_constraint(
        "ck_delivery_places_jiku_code_not_blank",
        "delivery_places",
        type_="check",
    )
    op.alter_column(
        "delivery_places",
        "jiku_code",
        existing_type=sa.String(length=50),
        server_default=sa.text("''"),
        existing_nullable=False,
    )
