"""add_all_table_and_column_comments

Revision ID: 73e14976215a
Revises: af2153ad0efc
Create Date: 2026-01-31 10:25:00.000000

"""

import os

import sqlalchemy as sa

from alembic import op


# revision identifiers, used by Alembic.
revision = "73e14976215a"
down_revision = "af2153ad0efc"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add comprehensive table and column comments for all tables.

    Reads SQL statements from alembic/sql/add_table_column_comments.sql
    """
    sql_path = os.path.join(os.path.dirname(__file__), "..", "sql", "add_table_column_comments.sql")

    if os.path.exists(sql_path):
        with open(sql_path, encoding="utf-8") as f:
            comment_sql = f.read()

        # Split by semicolon and execute each statement
        for statement in comment_sql.split(";"):
            statement = statement.strip()
            if statement and not statement.startswith("--"):
                op.execute(sa.text(statement))
    else:
        raise FileNotFoundError(f"SQL file not found: {sql_path}")


def downgrade() -> None:
    """Remove all table and column comments."""
    # Downgrade not implemented - comments can be safely left in place
    pass
