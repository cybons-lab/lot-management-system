"""Update views for soft-delete support

Revision ID: 20241211_soft_delete_views
Revises: d5a1f6b2c3e4
Create Date: 2025-12-11

This migration updates v_lot_details and v_order_line_details views to handle
soft-deleted master data gracefully using COALESCE.
"""

from alembic import op


# revision identifiers, used by Alembic.
revision = "20241211_soft_delete_views"
down_revision = "d5a1f6b2c3e4"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Recreate views with soft-delete support (COALESCE for deleted masters)."""
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
    """Revert to previous views (without soft-delete handling)."""
    # Drop views and recreate without COALESCE (would need old SQL file)
    # For simplicity, just drop the views - they can be recreated by re-running upgrade
    op.execute("DROP VIEW IF EXISTS public.v_candidate_lots_by_order_line CASCADE")
    op.execute("DROP VIEW IF EXISTS public.v_lot_available_qty CASCADE")
    op.execute("DROP VIEW IF EXISTS public.v_inventory_summary CASCADE")
    op.execute("DROP VIEW IF EXISTS public.v_lot_details CASCADE")
    op.execute("DROP VIEW IF EXISTS public.v_order_line_details CASCADE")
    op.execute("DROP VIEW IF EXISTS public.v_lot_allocations CASCADE")
