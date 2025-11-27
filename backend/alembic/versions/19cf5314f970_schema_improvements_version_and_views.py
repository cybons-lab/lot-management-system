"""schema_improvements_version_and_views

Revision ID: 19cf5314f970
Revises: f2b4ae178242
Create Date: 2025-11-27 17:49:15.478174

"""
import sqlalchemy as sa

from alembic import op


# revision identifiers, used by Alembic.
revision = '19cf5314f970'
down_revision = 'f2b4ae178242'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Schema improvements: version_id → version, view fixes."""
    # 1. Rename version_id to version
    op.execute("ALTER TABLE lots RENAME COLUMN version_id TO version")
    op.execute("ALTER TABLE order_lines RENAME COLUMN version_id TO version")
    
    # 2. Add comments
    op.execute("COMMENT ON COLUMN lots.version IS '楽観的ロック用バージョン番号'")
    op.execute("COMMENT ON COLUMN order_lines.version IS '楽観的ロック用バージョン番号'")
    
    # Note: Views will be recreated via create_views.sql


def downgrade() -> None:
    """Revert schema improvements."""
    # 1. Rename version back to version_id
    op.execute("ALTER TABLE lots RENAME COLUMN version TO version_id")
    op.execute("ALTER TABLE order_lines RENAME COLUMN version TO version_id")
    
    # 2. Remove comments
    op.execute("COMMENT ON COLUMN lots.version_id IS NULL")
    op.execute("COMMENT ON COLUMN order_lines.version_id IS NULL")
