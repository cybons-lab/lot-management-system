"""baseline 2026-02-06

Revision ID: baseline_2026_02_06
Revises:
Create Date: 2026-02-06

"""

import os
import sys

from sqlalchemy import text

from alembic import op


# revision identifiers, used by Alembic.
revision = "baseline_2026_02_06"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Ensure alembic directory is importable for sql_utils
    alembic_dir = os.path.dirname(os.path.dirname(__file__))
    if alembic_dir not in sys.path:
        sys.path.insert(0, alembic_dir)
    from sql_utils import split_sql_statements

    sql_path = os.path.join(os.path.dirname(__file__), "..", "baseline_2026_02_06.sql")

    if not os.path.exists(sql_path):
        raise FileNotFoundError(f"Baseline SQL file not found: {sql_path}")

    with open(sql_path, encoding="utf-8") as f:
        sql_content = f.read()

    # Use raw connection to avoid SQLAlchemy's parameter parsing (e.g. := in PL/pgSQL)
    conn = op.get_bind().engine.raw_connection()
    try:
        with conn.cursor() as cursor:
            for statement in split_sql_statements(sql_content):
                if statement.strip():
                    cursor.execute(statement)
        conn.commit()
    finally:
        conn.close()


def downgrade() -> None:
    pass
