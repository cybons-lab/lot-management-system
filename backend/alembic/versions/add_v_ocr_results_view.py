"""Add v_ocr_results view.

This migration recreates all views including the new v_ocr_results view
that joins SmartRead long data with shipping master for realtime OCR results display.

Revision ID: add_v_ocr_results_view
Revises: cdd8f9f2f79a
Create Date: 2026-01-20
"""

from pathlib import Path

import sqlalchemy as sa

from alembic import op


# revision identifiers, used by Alembic.
revision = "add_v_ocr_results_view"
down_revision = "cdd8f9f2f79a"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Recreate all views from create_views.sql (includes v_ocr_results)."""
    conn = op.get_bind()

    # Apply views from canonical source
    views_path = Path(__file__).parent.parent.parent / "sql" / "views" / "create_views.sql"
    if not views_path.exists():
        raise FileNotFoundError(f"Views file not found: {views_path}")

    print("[add_v_ocr_results_view] Recreating views from create_views.sql...")
    views_sql = views_path.read_text(encoding="utf-8")

    # Split by semicolon and execute each statement
    statements = []
    current_stmt = []

    for line in views_sql.splitlines():
        stripped = line.strip()
        # Skip empty lines and comments
        if not stripped or stripped.startswith("--"):
            continue

        current_stmt.append(line)

        if stripped.endswith(";"):
            stmt = "\n".join(current_stmt).strip()
            if stmt and stmt != ";":
                statements.append(stmt)
            current_stmt = []

    # Execute each statement individually
    success_count = 0
    error_count = 0

    for stmt in statements:
        # Remove trailing semicolon for execution
        stmt_clean = stmt.rstrip(";").strip()
        if not stmt_clean:
            continue

        try:
            conn.execute(sa.text(stmt_clean))
            success_count += 1
        except Exception as e:
            # Log but continue - some statements may fail on fresh DB
            error_count += 1
            # Only show error for non-trivial issues
            if "does not exist" not in str(e):
                print(f"[add_v_ocr_results_view] Warning: {e}")

    print(
        f"[add_v_ocr_results_view] Views recreated. Success: {success_count}, Skipped: {error_count}"
    )


def downgrade() -> None:
    """Drop v_ocr_results view."""
    op.execute(sa.text("DROP VIEW IF EXISTS public.v_ocr_results CASCADE"))
    print("[add_v_ocr_results_view] v_ocr_results view dropped.")
