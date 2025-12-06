"""add_product_suppliers_table

Revision ID: 3bf031f4ed27
Revises: dc3dc1f66431
Create Date: 2025-12-06 15:04:38.238324

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '3bf031f4ed27'
down_revision = 'dc3dc1f66431'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create product_suppliers table
    op.create_table(
        'product_suppliers',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('product_id', sa.BigInteger(), nullable=False),
        sa.Column('supplier_id', sa.BigInteger(), nullable=False),
        sa.Column('is_primary', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('lead_time_days', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['product_id'], ['products.id'], name='fk_product_suppliers_product'),
        sa.ForeignKeyConstraint(['supplier_id'], ['suppliers.id'], name='fk_product_suppliers_supplier'),
        sa.UniqueConstraint('product_id', 'supplier_id', name='uq_product_supplier'),
    )

    # Create index for is_primary lookup
    op.create_index(
        'ix_product_suppliers_product_id',
        'product_suppliers',
        ['product_id']
    )
    op.create_index(
        'ix_product_suppliers_supplier_id',
        'product_suppliers',
        ['supplier_id']
    )

    # Create partial unique index for primary supplier (only one primary per product)
    op.execute("""
        CREATE UNIQUE INDEX uq_product_primary_supplier
        ON product_suppliers (product_id)
        WHERE is_primary = true;
    """)

    # Populate product_suppliers from existing lots data
    # For each product-supplier pair, determine is_primary based on highest stock quantity
    op.execute("""
        WITH product_supplier_stock AS (
            SELECT 
                product_id,
                supplier_id,
                SUM(current_quantity) as total_stock,
                ROW_NUMBER() OVER (
                    PARTITION BY product_id 
                    ORDER BY SUM(current_quantity) DESC
                ) as rank
            FROM lots
            WHERE product_id IS NOT NULL AND supplier_id IS NOT NULL
            GROUP BY product_id, supplier_id
        )
        INSERT INTO product_suppliers (product_id, supplier_id, is_primary, created_at, updated_at)
        SELECT 
            product_id,
            supplier_id,
            (rank = 1) as is_primary,
            NOW(),
            NOW()
        FROM product_supplier_stock
        ON CONFLICT (product_id, supplier_id) DO NOTHING;
    """)


def downgrade() -> None:
    op.drop_index('uq_product_primary_supplier', table_name='product_suppliers')
    op.drop_index('ix_product_suppliers_supplier_id', table_name='product_suppliers')
    op.drop_index('ix_product_suppliers_product_id', table_name='product_suppliers')
    op.drop_table('product_suppliers')
