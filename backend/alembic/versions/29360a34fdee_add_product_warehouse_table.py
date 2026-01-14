"""add_product_warehouse_table

Revision ID: 29360a34fdee
Revises: 9decff574dcb
Create Date: 2026-01-15 08:23:29.032189

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '29360a34fdee'
down_revision = '9decff574dcb'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Create product_warehouse table
    op.create_table(
        'product_warehouse',
        sa.Column('product_id', sa.BigInteger(), nullable=False),
        sa.Column('warehouse_id', sa.BigInteger(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('product_id', 'warehouse_id'),
        sa.ForeignKeyConstraint(['product_id'], ['products.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['warehouse_id'], ['warehouses.id'], ondelete='CASCADE'),
    )
    
    # 2. Create indexes for performance
    op.create_index('idx_product_warehouse_active', 'product_warehouse', ['is_active'], postgresql_where=sa.text('is_active = true'))
    op.create_index('idx_lots_pw', 'lots', ['product_id', 'warehouse_id'])
    op.create_index('idx_lots_active_pw', 'lots', ['product_id', 'warehouse_id'], postgresql_where=sa.text("status = 'active'"))
    
    # 3. Populate from existing lots
    op.execute("""
        INSERT INTO product_warehouse (product_id, warehouse_id)
        SELECT DISTINCT product_id, warehouse_id FROM lots
        ON CONFLICT DO NOTHING;
    """)


def downgrade() -> None:
    op.drop_index('idx_lots_active_pw', table_name='lots')
    op.drop_index('idx_lots_pw', table_name='lots')
    op.drop_index('idx_product_warehouse_active', table_name='product_warehouse')
    op.drop_table('product_warehouse')
