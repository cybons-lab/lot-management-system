"""sync_views_phase2_1b

Revision ID: 6e445ed948cf
Revises: 8319618fc680
Create Date: 2026-01-25 14:34:38.922273

"""

import os
from pathlib import Path

import sqlalchemy as sa

from alembic import op


# revision identifiers, used by Alembic.
revision = "6e445ed948cf"
down_revision = "8319618fc680"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Resolve the path to create_views.sql relative to this migration file
    # backend/alembic/versions/xxxx.py -> backend/sql/views/create_views.sql
    current_dir = Path(__file__).resolve().parent
    sql_path = current_dir.parent.parent / "sql" / "views" / "create_views.sql"

    with open(sql_path, encoding="utf-8") as f:
        sql_content = f.read()

    # Execute the entire SQL script
    op.execute(sql_content)


def downgrade() -> None:
    # Views update is usually forward-only or requires backup.
    # Since we are just fixing definitions, leaving them as-is on downgrade is acceptable
    # (or implies we accept the new definitions as the fix).
    # To truly rollback, we would need the previous version of create_views.sql content.
    pass
