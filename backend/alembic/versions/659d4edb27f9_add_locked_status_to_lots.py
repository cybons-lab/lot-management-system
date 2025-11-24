"""add_locked_status_to_lots

Revision ID: 659d4edb27f9
Revises: ab73ebe78f68
Create Date: 2025-11-24 09:50:49.366880

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '659d4edb27f9'
down_revision = 'ab73ebe78f68'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Check制約を更新して 'locked' を許可する
    op.execute("ALTER TABLE lots DROP CONSTRAINT chk_lots_status")
    op.execute("ALTER TABLE lots ADD CONSTRAINT chk_lots_status CHECK (status IN ('active', 'depleted', 'expired', 'quarantine', 'locked'))")


def downgrade() -> None:
    # Check制約を元に戻す
    op.execute("ALTER TABLE lots DROP CONSTRAINT chk_lots_status")
    op.execute("ALTER TABLE lots ADD CONSTRAINT chk_lots_status CHECK (status IN ('active', 'depleted', 'expired', 'quarantine'))")
