"""Update order status constraint to support part_allocated

Revision ID: update_order_status_20251111
Revises: add_seed_snapshots_table
Create Date: 2025-11-11 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'update_order_status_20251111'
down_revision = 'add_seed_snapshots'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """
    Update orders.status constraint to allow:
    - draft
    - open
    - part_allocated (NEW)
    - allocated
    - shipped
    - closed
    - cancelled (NEW)
    """
    # Drop the old constraint
    op.drop_constraint('ck_orders_status', 'orders', type_='check')

    # Add the new constraint with extended values
    op.create_check_constraint(
        'ck_orders_status',
        'orders',
        sa.text(
            "status IN ('draft', 'open', 'part_allocated', 'allocated', 'shipped', 'closed', 'cancelled')"
        )
    )

    # Also update the orders_models.py CheckConstraint to match
    # Note: This migration updates the DB, the model file should be updated separately


def downgrade() -> None:
    """Revert to the old constraint (draft|confirmed|shipped|closed)."""
    # Drop the new constraint
    op.drop_constraint('ck_orders_status', 'orders', type_='check')

    # Restore the old constraint
    op.create_check_constraint(
        'ck_orders_status',
        'orders',
        sa.text("status IN ('draft', 'confirmed', 'shipped', 'closed')")
    )
