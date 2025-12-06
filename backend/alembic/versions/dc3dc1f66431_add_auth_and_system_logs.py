"""add_auth_and_system_logs

Revision ID: dc3dc1f66431
Revises: b31491d76d30
Create Date: 2025-12-06 10:36:37.591195

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'dc3dc1f66431'
down_revision = 'b31491d76d30'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Upgrade
    op.add_column('users', sa.Column('auth_provider', sa.String(length=50), server_default='local', nullable=False))
    op.add_column('users', sa.Column('azure_object_id', sa.String(length=100), nullable=True))
    op.alter_column('users', 'password_hash',
               existing_type=sa.VARCHAR(length=255),
               nullable=True)
    op.create_index('idx_users_auth_provider', 'users', ['auth_provider'], unique=False)
    op.create_index('idx_users_azure_oid', 'users', ['azure_object_id'], unique=True)
    
    op.create_table('system_client_logs',
        sa.Column('id', sa.BigInteger(), nullable=False),
        sa.Column('user_id', sa.BigInteger(), nullable=True),
        sa.Column('level', sa.String(length=20), server_default='info', nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('user_agent', sa.String(length=255), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_system_client_logs_created_at', 'system_client_logs', ['created_at'], unique=False)
    op.create_index('idx_system_client_logs_user_id', 'system_client_logs', ['user_id'], unique=False)


def downgrade() -> None:
    op.drop_index('idx_system_client_logs_user_id', table_name='system_client_logs')
    op.drop_index('idx_system_client_logs_created_at', table_name='system_client_logs')
    op.drop_table('system_client_logs')
    
    op.drop_index('idx_users_azure_oid', table_name='users')
    op.drop_index('idx_users_auth_provider', table_name='users')
    op.alter_column('users', 'password_hash',
               existing_type=sa.VARCHAR(length=255),
               nullable=False)
    op.drop_column('users', 'azure_object_id')
    op.drop_column('users', 'auth_provider')
