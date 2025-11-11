"""Add seed_snapshots table

Revision ID: add_seed_snapshots
Revises: 4b2a45018747
Create Date: 2025-11-10

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB


# revision identifiers, used by Alembic.
revision = 'add_seed_snapshots'
down_revision = '4b2a45018747'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add seed_snapshots table for saving/restoring test data configurations."""
    op.create_table(
        'seed_snapshots',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False, comment='スナップショット名'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, comment='作成日時'),
        sa.Column('params_json', JSONB, nullable=False, comment='展開後の最終パラメータ（profile解決後）'),
        sa.Column('profile_json', JSONB, nullable=True, comment='使用したプロファイル設定'),
        sa.Column('csv_dir', sa.Text(), nullable=True, comment='CSVエクスポートディレクトリ（オプション）'),
        sa.Column('summary_json', JSONB, nullable=True, comment='生成結果のサマリ（件数、検証結果など）'),
        sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    """Drop seed_snapshots table."""
    op.drop_table('seed_snapshots')
