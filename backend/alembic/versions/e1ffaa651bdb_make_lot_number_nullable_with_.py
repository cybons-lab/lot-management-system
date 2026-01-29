"""make_lot_number_nullable_with_conditional_unique

Revision ID: e1ffaa651bdb
Revises: a9f36409b674
Create Date: 2026-01-29 20:11:55.154327

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'e1ffaa651bdb'
down_revision = 'a9f36409b674'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Make lot_master.lot_number nullable with conditional unique constraint.

    Changes:
    1. Drop existing unique constraint on (lot_number, product_group_id)
    2. Make lot_number column nullable
    3. Add partial unique index: unique on (lot_number, product_group_id) WHERE lot_number IS NOT NULL

    Rationale:
    - Allow lot_number to be NULL for temporary/未確定 lots
    - When lot_number IS NOT NULL, enforce uniqueness per product_group
    - Multiple NULL lot_numbers are allowed (they are identified by id/receipt_key)
    """
    # Step 1: Drop existing unique constraint
    op.drop_constraint('uq_lot_master_number_product', 'lot_master', type_='unique')

    # Step 2: Make lot_number nullable
    op.alter_column('lot_master', 'lot_number',
                    existing_type=sa.String(100),
                    nullable=True)

    # Step 3: Add partial unique index (enforces uniqueness only when lot_number IS NOT NULL)
    op.create_index(
        'idx_lot_master_number_product_group_unique',
        'lot_master',
        ['lot_number', 'product_group_id'],
        unique=True,
        postgresql_where=sa.text('lot_number IS NOT NULL')
    )


def downgrade() -> None:
    """Revert lot_number to NOT NULL with standard unique constraint."""
    # Step 1: Drop partial unique index
    op.drop_index('idx_lot_master_number_product_group_unique', 'lot_master')

    # Step 2: Make lot_number NOT NULL (may fail if NULL values exist)
    op.alter_column('lot_master', 'lot_number',
                    existing_type=sa.String(100),
                    nullable=False)

    # Step 3: Recreate original unique constraint
    op.create_unique_constraint('uq_lot_master_number_product', 'lot_master', ['lot_number', 'product_group_id'])
