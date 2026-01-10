"""Add on_hold status for order_lines.

Revision ID: p1q2r3s4t5u6
Revises: o2p3q4r5s6t7
Create Date: 2026-01-10 11:55:00.000000

"""

from alembic import op

# revision identifiers, used by Alembic.
revision = "p1q2r3s4t5u6"
down_revision = "o2p3q4r5s6t7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add on_hold status to order_lines and orders."""
    # Drop old constraint
    op.drop_constraint("chk_order_lines_status", "order_lines", type_="check")

    # Add new constraint with on_hold
    op.create_check_constraint(
        "chk_order_lines_status",
        "order_lines",
        "status IN ('pending', 'allocated', 'shipped', 'completed', 'cancelled', 'on_hold')",
    )

    # Also update orders.status constraint if exists
    # Orders table may have status enum: open, part_allocated, allocated, shipped, closed
    # Add on_hold to orders as well
    try:
        op.drop_constraint("chk_orders_status", "orders", type_="check")
        op.create_check_constraint(
            "chk_orders_status",
            "orders",
            "status IN ('open', 'part_allocated', 'allocated', 'shipped', 'closed', 'on_hold')",
        )
    except Exception:
        # Constraint might not exist, safe to skip
        pass


def downgrade() -> None:
    """Remove on_hold status from order_lines and orders."""
    # First, update any on_hold records to cancelled
    op.execute(
        "UPDATE order_lines SET status = 'cancelled' WHERE status = 'on_hold'"
    )
    op.execute(
        "UPDATE orders SET status = 'closed' WHERE status = 'on_hold'"
    )

    # Drop new constraint
    op.drop_constraint("chk_order_lines_status", "order_lines", type_="check")

    # Restore old constraint
    op.create_check_constraint(
        "chk_order_lines_status",
        "order_lines",
        "status IN ('pending', 'allocated', 'shipped', 'completed', 'cancelled')",
    )

    try:
        op.drop_constraint("chk_orders_status", "orders", type_="check")
        op.create_check_constraint(
            "chk_orders_status",
            "orders",
            "status IN ('open', 'part_allocated', 'allocated', 'shipped', 'closed')",
        )
    except Exception:
        pass
