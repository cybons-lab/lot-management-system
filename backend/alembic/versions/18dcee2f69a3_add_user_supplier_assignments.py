"""add_user_supplier_assignments

Revision ID: 18dcee2f69a3
Revises: 19cf5314f970
Create Date: 2025-11-27 17:57:08.409943

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '18dcee2f69a3'
down_revision = '19cf5314f970'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add user_supplier_assignments table."""
    op.create_table(
        'user_supplier_assignments',
        sa.Column('id', sa.BigInteger(), nullable=False),
        sa.Column('user_id', sa.BigInteger(), nullable=False),
        sa.Column('supplier_id', sa.BigInteger(), nullable=False),
        sa.Column('is_primary', sa.Boolean(), server_default=sa.text('FALSE'), nullable=False),
        sa.Column('assigned_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['supplier_id'], ['suppliers.id'], name='fk_user_supplier_assignments_supplier', ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], name='fk_user_supplier_assignments_user', ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'supplier_id', name='uq_user_supplier_assignments_user_supplier')
    )
    
    # Indexes
    op.create_index('idx_user_supplier_assignments_user', 'user_supplier_assignments', ['user_id'])
    op.create_index('idx_user_supplier_assignments_supplier', 'user_supplier_assignments', ['supplier_id'])
    op.create_index('idx_user_supplier_assignments_primary', 'user_supplier_assignments', ['is_primary'], 
                    postgresql_where=sa.text('is_primary = TRUE'))
    
    # Unique index for primary assignment per supplier
    op.create_index('uq_user_supplier_primary_per_supplier', 'user_supplier_assignments', ['supplier_id'], 
                    unique=True, postgresql_where=sa.text('is_primary = TRUE'))
    
    # Comment
    op.execute("COMMENT ON TABLE user_supplier_assignments IS 'ユーザー-仕入先担当割り当て'")
    op.execute("COMMENT ON COLUMN user_supplier_assignments.is_primary IS '主担当フラグ（仕入先ごとに1人）'")


def downgrade() -> None:
    """Drop user_supplier_assignments table."""
    op.drop_index('uq_user_supplier_primary_per_supplier', table_name='user_supplier_assignments')
    op.drop_index('idx_user_supplier_assignments_primary', table_name='user_supplier_assignments')
    op.drop_index('idx_user_supplier_assignments_supplier', table_name='user_supplier_assignments')
    op.drop_index('idx_user_supplier_assignments_user', table_name='user_supplier_assignments')
    op.drop_table('user_supplier_assignments')
