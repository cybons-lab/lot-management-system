"""restore_views_and_fix_fk_typo

Revision ID: af2153ad0efc
Revises: e1ffaa651bdb
Create Date: 2026-01-30 16:06:17.211835

"""

from alembic import op


# revision identifiers, used by Alembic.
revision = "af2153ad0efc"
down_revision = "e1ffaa651bdb"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """
    Fix foreign key typo for lot_receipts (from lot_receipt)

    Note: View recreation removed to avoid premature creation with incomplete schema.
    Views will be recreated at the end of the migration chain.
    """
    # Fix FK typo
    op.execute(
        "ALTER TABLE lot_receipts DROP CONSTRAINT IF EXISTS lot_receipt_product_group_id_fkey"
    )
    op.execute(
        "ALTER TABLE lot_receipts ADD CONSTRAINT lot_receipts_product_group_id_fkey "
        "FOREIGN KEY (product_group_id) REFERENCES supplier_items(id) ON DELETE RESTRICT"
    )


def downgrade() -> None:
    """
    Minimal downgrade
    """
    op.execute(
        "ALTER TABLE lot_receipts DROP CONSTRAINT IF EXISTS lot_receipts_product_group_id_fkey"
    )

    views = [
        "v_ocr_results",
        "v_customer_item_jiku_mappings",
        "v_user_supplier_assignments",
        "v_warehouse_code_to_id",
        "v_supplier_code_to_id",
        "v_order_line_details",
        "v_candidate_lots_by_order_line",
        "v_lot_details",
        "v_inventory_summary",
        "v_lot_receipt_stock",
        "v_lot_available_qty",
        "v_forecast_order_pairs",
        "v_product_code_to_id",
        "v_delivery_place_code_to_id",
        "v_customer_code_to_id",
        "v_order_line_context",
        "v_customer_daily_products",
        "v_lot_current_stock",
        "v_lot_active_reservations",
        "v_lot_allocations",
    ]
    for v in views:
        op.execute(f"DROP VIEW IF EXISTS public.{v} CASCADE")
