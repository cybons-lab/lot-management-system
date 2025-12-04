"""Add allocation_type, confirmed_at, confirmed_by columns to allocations table.

Supports Hard Allocation feature by distinguishing 'soft' (provisional)
and 'hard' (confirmed) allocations.

Revision ID: add_allocation_type
Revises: add_customer_contact_fields
Create Date: 2025-12-04
"""

import sqlalchemy as sa

from alembic import op


revision = "add_allocation_type"
down_revision = "add_customer_contact_fields"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add allocation_type, confirmed_at, confirmed_by columns."""
    # Add allocation_type column as nullable first
    op.add_column(
        "allocations",
        sa.Column(
            "allocation_type",
            sa.String(10),
            nullable=True,
            comment="Allocation type: soft (provisional) or hard (confirmed)",
        ),
    )

    # Set default for existing records
    op.execute("UPDATE allocations SET allocation_type = 'soft' WHERE allocation_type IS NULL")

    # Make column NOT NULL
    op.alter_column(
        "allocations",
        "allocation_type",
        nullable=False,
        server_default=sa.text("'soft'"),
    )

    # Add CHECK constraint
    op.create_check_constraint(
        "chk_allocation_type",
        "allocations",
        "allocation_type IN ('soft', 'hard')",
    )

    # Add index for filtering by allocation_type
    op.create_index(
        "idx_allocations_allocation_type",
        "allocations",
        ["allocation_type"],
    )

    # Add confirmed_at column (for hard allocation confirmation timestamp)
    op.add_column(
        "allocations",
        sa.Column(
            "confirmed_at",
            sa.DateTime(),
            nullable=True,
            comment="Hard allocation confirmation timestamp",
        ),
    )

    # Add confirmed_by column (for user who confirmed the allocation)
    op.add_column(
        "allocations",
        sa.Column(
            "confirmed_by",
            sa.String(100),
            nullable=True,
            comment="User who confirmed the allocation",
        ),
    )


def downgrade() -> None:
    """Remove allocation_type, confirmed_at, confirmed_by columns."""
    op.drop_column("allocations", "confirmed_by")
    op.drop_column("allocations", "confirmed_at")
    op.drop_index("idx_allocations_allocation_type", table_name="allocations")
    op.drop_constraint("chk_allocation_type", "allocations", type_="check")
    op.drop_column("allocations", "allocation_type")
