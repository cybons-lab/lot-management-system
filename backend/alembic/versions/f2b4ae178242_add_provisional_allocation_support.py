"""add_provisional_allocation_support

Revision ID: f2b4ae178242
Revises: f3e7b6fd7de7
Create Date: 2025-11-27 17:15:21.139040

"""
import sqlalchemy as sa

from alembic import op


# revision identifiers, used by Alembic.
revision = 'f2b4ae178242'
down_revision = 'f3e7b6fd7de7'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add provisional allocation support to allocations table."""
    # 1. Add inbound_plan_line_id column (nullable, for provisional allocations)
    op.add_column(
        "allocations",
        sa.Column(
            "inbound_plan_line_id",
            sa.BigInteger(),
            nullable=True,
        ),
    )

    # 2. Add foreign key constraint for inbound_plan_line_id
    op.create_foreign_key(
        "fk_allocations_inbound_plan_line",
        "allocations",
        "inbound_plan_lines",
        ["inbound_plan_line_id"],
        ["id"],
        ondelete="CASCADE",
    )

    # 3. Modify lot_id to be nullable (for provisional allocations)
    op.alter_column(
        "allocations",
        "lot_id",
        existing_type=sa.BigInteger(),
        nullable=True,
    )

    # 4. Drop old status check constraint
    op.drop_constraint("chk_allocations_status", "allocations", type_="check")

    # 5. Create new status check constraint with 'provisional'
    op.create_check_constraint(
        "chk_allocations_status",
        "allocations",
        "status IN ('allocated', 'provisional', 'shipped', 'cancelled')",
    )

    # 6. Create index on inbound_plan_line_id
    op.create_index(
        "idx_allocations_inbound_plan_line",
        "allocations",
        ["inbound_plan_line_id"],
    )


def downgrade() -> None:
    """Revert provisional allocation support."""
    # 1. Drop index
    op.drop_index("idx_allocations_inbound_plan_line", table_name="allocations")

    # 2. Drop new check constraint
    op.drop_constraint("chk_allocations_status", "allocations", type_="check")

    # 3. Recreate old check constraint
    op.create_check_constraint(
        "chk_allocations_status",
        "allocations",
        "status IN ('allocated', 'shipped', 'cancelled')",
    )

    # 4. Make lot_id NOT NULL again (this will fail if provisional allocations exist)
    op.alter_column(
        "allocations",
        "lot_id",
        existing_type=sa.BigInteger(),
        nullable=False,
    )

    # 5. Drop foreign key constraint
    op.drop_constraint("fk_allocations_inbound_plan_line", "allocations", type_="foreignkey")

    # 6. Drop inbound_plan_line_id column
    op.drop_column("allocations", "inbound_plan_line_id")
