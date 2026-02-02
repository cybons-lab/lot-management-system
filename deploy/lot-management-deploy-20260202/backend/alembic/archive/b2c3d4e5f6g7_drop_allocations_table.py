"""drop allocations table (P3 Phase 3)

Revision ID: b2c3d4e5f6g7
Revises: a1b2c3d4e5f6
Create Date: 2024-12-14

P3 Final: Remove allocations table after data migration.
IMPORTANT: Run migrate_allocations_to_reservations.py --execute BEFORE this migration!
"""

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op


# revision identifiers, used by Alembic.
revision = "b2c3d4e5f6g7"
down_revision = "a1b2c3d4e5f6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Drop allocations table and related objects.

    WARNING: Ensure all data has been migrated to lot_reservations first!
    """
    # Drop indexes first
    op.drop_index("idx_allocations_order_line", table_name="allocations")
    op.drop_index("idx_allocations_lot_id", table_name="allocations")
    op.drop_index("idx_allocations_inbound_plan_line", table_name="allocations")
    op.drop_index("idx_allocations_status", table_name="allocations")
    op.drop_index("idx_allocations_allocation_type", table_name="allocations")

    # Drop constraints
    op.drop_constraint("chk_allocations_status", "allocations", type_="check")
    op.drop_constraint("chk_allocation_type", "allocations", type_="check")

    # Drop the table
    op.drop_table("allocations")


def downgrade() -> None:
    """Recreate allocations table for rollback.

    Note: Data will NOT be restored - only the table schema.
    """
    op.create_table(
        "allocations",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("order_line_id", sa.BigInteger(), nullable=False),
        sa.Column("lot_id", sa.BigInteger(), nullable=True),
        sa.Column("inbound_plan_line_id", sa.BigInteger(), nullable=True),
        sa.Column("allocated_quantity", sa.Numeric(15, 3), nullable=False),
        sa.Column(
            "allocation_type",
            sa.String(10),
            server_default=sa.text("'soft'"),
            nullable=False,
        ),
        sa.Column(
            "status",
            sa.String(20),
            server_default=sa.text("'allocated'"),
            nullable=False,
        ),
        sa.Column("confirmed_at", sa.DateTime(), nullable=True),
        sa.Column("confirmed_by", sa.String(100), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.func.current_timestamp(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            server_default=sa.func.current_timestamp(),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(
            ["order_line_id"],
            ["order_lines.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["lot_id"],
            ["lots.id"],
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["inbound_plan_line_id"],
            ["inbound_plan_lines.id"],
            ondelete="CASCADE",
        ),
        sa.CheckConstraint(
            "status IN ('allocated', 'provisional', 'shipped', 'cancelled')",
            name="chk_allocations_status",
        ),
        sa.CheckConstraint(
            "allocation_type IN ('soft', 'hard')",
            name="chk_allocation_type",
        ),
    )

    # Recreate indexes
    op.create_index("idx_allocations_order_line", "allocations", ["order_line_id"])
    op.create_index("idx_allocations_lot_id", "allocations", ["lot_id"])
    op.create_index("idx_allocations_inbound_plan_line", "allocations", ["inbound_plan_line_id"])
    op.create_index("idx_allocations_status", "allocations", ["status"])
    op.create_index("idx_allocations_allocation_type", "allocations", ["allocation_type"])
