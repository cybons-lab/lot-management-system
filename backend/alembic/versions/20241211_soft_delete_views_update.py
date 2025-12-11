"""Update views for soft-delete support

Revision ID: 20241211_soft_delete_views
Revises: d5a1f6b2c3e4
Create Date: 2025-12-11

This migration recreates all views with soft-delete support:
- Adds COALESCE for deleted master data references
- Adds *_deleted flags to indicate soft-deleted master references
- Includes all previously missing views (v_order_line_context, etc.)
"""

from alembic import op


# revision identifiers, used by Alembic.
revision = "20241211_soft_delete_views"
down_revision = "d5a1f6b2c3e4"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Recreate all views with soft-delete support (COALESCE for deleted masters)."""
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
    """Revert to previous views (without soft-delete handling).

    Drops all views. They can be recreated by running the v1 SQL script
    or re-running this migration's upgrade.
    """
    # Drop all views in reverse dependency order
    views = [
        "v_candidate_lots_by_order_line",
        "v_forecast_order_pairs",
        "v_customer_item_jiku_mappings",
        "v_user_supplier_assignments",
        "v_warehouse_code_to_id",
        "v_supplier_code_to_id",
        "v_order_line_details",
        "v_lot_details",
        "v_inventory_summary",
        "v_lot_available_qty",
        "v_product_code_to_id",
        "v_delivery_place_code_to_id",
        "v_customer_code_to_id",
        "v_order_line_context",
        "v_customer_daily_products",
        "v_lot_current_stock",
        "v_lot_allocations",
    ]
    for view in views:
        op.execute(f"DROP VIEW IF EXISTS public.{view} CASCADE")
