#!/usr/bin/env python3
"""Database Initialization Script for New Environments.

Usage:
    docker compose exec backend python /app/scripts/init_db.py

This script:
    1. Applies the baseline schema (tables only)
    2. Creates all views from create_views.sql
    3. Stamps alembic_version to current head

WARNING: Only run on EMPTY databases!
"""

import os
import subprocess
import sys
from pathlib import Path


def get_database_url() -> str:
    """Get DATABASE_URL from environment."""
    url = os.environ.get("DATABASE_URL")
    if not url:
        print("ERROR: DATABASE_URL environment variable not set.")
        sys.exit(1)
    return url


def check_database_empty(database_url: str) -> bool:
    """Check if database is empty (has no user tables)."""
    result = subprocess.run(
        [
            "psql",
            database_url,
            "-t",
            "-c",
            "SELECT count(*) FROM information_schema.tables "
            "WHERE table_schema = 'public' AND table_type = 'BASE TABLE';",
        ],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        print(f"ERROR: Failed to check database: {result.stderr}")
        sys.exit(1)

    table_count = int(result.stdout.strip())
    return table_count <= 1  # alembic_version might exist


def apply_sql_file(database_url: str, sql_path: Path, description: str) -> None:
    """Apply a SQL file to the database."""
    if not sql_path.exists():
        print(f"ERROR: {description} not found: {sql_path}")
        sys.exit(1)

    print(f"Applying {description}...")
    result = subprocess.run(
        ["psql", database_url, "-f", str(sql_path)],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        print(f"ERROR: Failed to apply {description}")
        print(result.stderr)
        sys.exit(1)
    print(f"  ✓ {description} applied successfully")


def stamp_alembic_head() -> None:
    """Stamp alembic version to head."""
    print("Stamping alembic version to head...")
    result = subprocess.run(
        ["alembic", "stamp", "head"],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        print(f"ERROR: Failed to stamp alembic: {result.stderr}")
        sys.exit(1)
    print("  ✓ Alembic stamped to head")


def show_current_version() -> None:
    """Show current alembic version."""
    result = subprocess.run(
        ["alembic", "current"],
        capture_output=True,
        text=True,
    )
    print(f"\nCurrent alembic version:\n{result.stdout}")


def main() -> None:
    """Main entry point."""
    print("=" * 50)
    print("Database Initialization Script")
    print("=" * 50)

    # Determine paths
    script_dir = Path(__file__).parent
    backend_dir = script_dir.parent
    baselines_dir = backend_dir / "alembic" / "baselines"
    views_dir = backend_dir / "sql" / "views"

    schema_path = baselines_dir / "baseline_schema_20260119.sql"
    views_path = views_dir / "create_views.sql"

    # Get database URL
    database_url = get_database_url()

    # Check if database is empty
    print("\nStep 0: Checking database state...")
    if not check_database_empty(database_url):
        print("ERROR: Database already has tables.")
        print("This script is only for NEW, empty databases.")
        print("For existing databases, use: alembic upgrade head")
        sys.exit(1)
    print("  ✓ Database is empty, proceeding...")

    # Apply schema
    print("\nStep 1: Applying baseline schema...")
    apply_sql_file(database_url, schema_path, "baseline schema")

    # Apply views
    print("\nStep 2: Creating views...")
    apply_sql_file(database_url, views_path, "views")

    # Stamp alembic
    print("\nStep 3: Stamping alembic version...")
    stamp_alembic_head()

    # Show result
    show_current_version()

    print("=" * 50)
    print("Initialization complete!")
    print("=" * 50)


if __name__ == "__main__":
    main()
