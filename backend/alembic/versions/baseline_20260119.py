"""Baseline: Create schema for fresh databases.

This migration:
- On FRESH databases: Creates full schema from baseline_schema_20260119.sql
- On EXISTING databases: Does nothing (tables already exist)

Revision ID: baseline_20260119
Revises: None
Create Date: 2026-01-19
"""

from pathlib import Path

import sqlalchemy as sa

from alembic import op


# revision identifiers, used by Alembic.
revision = "baseline_20260119"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create schema if database is empty."""
    conn = op.get_bind()

    # Check if database already has tables
    result = conn.execute(
        sa.text(
            "SELECT EXISTS (SELECT 1 FROM information_schema.tables "
            "WHERE table_schema = 'public' AND table_name = 'products')"
        )
    )
    tables_exist = result.scalar()

    if tables_exist:
        print("[baseline_20260119] Existing database detected - skipping schema creation.")
        return

    print("[baseline_20260119] Fresh database detected - creating schema...")

    # Apply baseline schema
    schema_path = Path(__file__).parent.parent / "baselines" / "baseline_schema_20260119.sql"
    if not schema_path.exists():
        raise FileNotFoundError(f"Schema file not found: {schema_path}")

    schema_sql = schema_path.read_text(encoding="utf-8")

    # Parse and execute SQL statements
    current_stmt = []
    for line in schema_sql.splitlines():
        stripped = line.strip()

        # Skip psql meta-commands and comments
        if stripped.startswith("\\") or stripped.startswith("--"):
            continue
        # Skip SET commands
        if stripped.upper().startswith(("SET ", "SELECT pg_catalog.")):
            continue

        current_stmt.append(line)

        if stripped.endswith(";"):
            stmt = "\n".join(current_stmt).strip()
            if stmt and stmt != ";":
                try:
                    op.execute(sa.text(stmt))
                except Exception as e:
                    # Log but continue on non-critical errors (e.g., extension already exists)
                    print(f"[baseline_20260119] Warning: {e}")
            current_stmt = []

    # Apply views from canonical source
    views_path = Path(__file__).parent.parent.parent / "sql" / "views" / "create_views.sql"
    if views_path.exists():
        print("[baseline_20260119] Creating views...")
        views_sql = views_path.read_text(encoding="utf-8")
        for stmt in views_sql.split(";"):
            stmt = stmt.strip()
            if stmt and not stmt.startswith("--"):
                try:
                    op.execute(sa.text(stmt))
                except Exception as e:
                    print(f"[baseline_20260119] View warning: {e}")

    print("[baseline_20260119] Schema creation complete.")


def downgrade() -> None:
    """Not supported for baseline."""
    raise NotImplementedError("Cannot downgrade baseline migration")
