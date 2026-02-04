"""recreate_views_after_schema_changes

Revision ID: 62a340dbe783
Revises: 486eb9ffe359
Create Date: 2026-02-03 23:32:34.662679

Note: View recreation is now handled automatically by alembic/env.py after all migrations complete.
This migration file is kept for historical consistency but performs no operations.
"""

# revision identifiers, used by Alembic.
revision = "62a340dbe783"
down_revision = "486eb9ffe359"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """
    View recreation removed - now handled automatically by alembic/env.py.

    Views are recreated after all migrations complete to ensure schema consistency.
    """
    pass


def downgrade() -> None:
    """No operations needed."""
    pass
