"""recreate_views_v2

Revision ID: b402f0660f64
Revises: 20241210_complete_migration
Create Date: 2025-12-10 16:18:29.249622

"""

import sqlalchemy as sa

from alembic import op


# revision identifiers, used by Alembic.
revision = "b402f0660f64"
down_revision = "20241210_complete_migration"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Recreate views with v2 logic (lot_reservations support)."""
    from pathlib import Path

    migration_dir = Path(__file__).resolve().parent
    backend_dir = migration_dir.parents[1]
    sql_path = backend_dir / "sql" / "views" / "create_views_v2.sql"

    with open(sql_path, encoding="utf-8") as f:
        sql_content = f.read()
        statements = sql_content.split(";")
        for statement in statements:
            if statement.strip():
                op.execute(statement)


def downgrade() -> None:
    """Revert to v1 views (may fail if columns missing, but best effort)."""
    # NOTE: This downgrade might fail if lots.allocated_quantity is missing
    # and the old views depend on it. Since this is a fix-forward migration,
    # we might just want to drop the new views.

    op.execute("DROP VIEW IF EXISTS public.v_candidate_lots_by_order_line CASCADE")
    op.execute("DROP VIEW IF EXISTS public.v_lot_available_qty CASCADE")
    op.execute("DROP VIEW IF EXISTS public.v_inventory_summary CASCADE")
    op.execute("DROP VIEW IF EXISTS public.v_lot_details CASCADE")
    op.execute("DROP VIEW IF EXISTS public.v_order_line_details CASCADE")

    # We don't restore old views here because they are broken without allocated_quantity column
