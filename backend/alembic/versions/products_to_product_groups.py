"""Rename products table to product_groups.

Revision ID: products_to_product_groups
Revises: phase1_sku_enforcement
Create Date: 2026-01-27

This migration renames the products table to product_groups to clarify
that it serves as a grouping/linking entity between supplier_items and
customer_items, not as a primary business identifier.

The 2-code system:
1. maker_part_no (supplier_items) - inventory identity
2. customer_part_no (customer_items) - order entry

product_groups is just for linking these together.
"""

import sqlalchemy as sa

from alembic import op


def _constraint_exists(constraint_name: str, table_name: str) -> bool:
    """Check if a constraint exists."""
    conn = op.get_bind()
    result = conn.execute(
        sa.text("""
            SELECT EXISTS (
                SELECT 1
                FROM information_schema.table_constraints
                WHERE constraint_name = :constraint_name
                  AND table_name = :table_name
            )
        """),
        {"constraint_name": constraint_name, "table_name": table_name},
    )
    return bool(result.scalar())


def _rename_constraint_if_exists(table_name: str, old_name: str, new_name: str) -> None:
    """Rename constraint if it exists, otherwise skip."""
    if _constraint_exists(old_name, table_name):
        op.execute(f"ALTER TABLE {table_name} RENAME CONSTRAINT {old_name} TO {new_name}")
        print(f"✅ Renamed constraint: {old_name} → {new_name}")
    else:
        print(f"⏭️  Skipped (not found): {old_name}")


# Note: View recreation removed - views will be recreated at the end of migration chain
# This avoids premature view creation with incomplete schema changes


# revision identifiers, used by Alembic.
revision = "products_to_product_groups"
down_revision = "phase1_sku_enforcement"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Rename products table to product_groups."""
    # Rename table
    op.rename_table("products", "product_groups")

    # Rename sequence
    op.execute("ALTER SEQUENCE products_id_seq RENAME TO product_groups_id_seq")

    # Rename indexes
    op.execute("ALTER INDEX idx_products_name RENAME TO idx_product_groups_name")
    op.execute("ALTER INDEX idx_products_valid_to RENAME TO idx_product_groups_valid_to")

    # Rename unique constraint
    op.execute(
        "ALTER TABLE product_groups RENAME CONSTRAINT uq_products_maker_part_code "
        "TO uq_product_groups_maker_part_code"
    )

    # Update foreign key constraints in related tables
    # Note: PostgreSQL automatically updates FK references when table is renamed,
    # but we should rename the constraint names for consistency

    # customer_items
    op.execute(
        "ALTER TABLE customer_items RENAME CONSTRAINT customer_items_product_id_fkey "
        "TO customer_items_product_group_id_fkey"
    )

    # forecast_current
    op.execute(
        "ALTER TABLE forecast_current RENAME CONSTRAINT forecast_current_product_id_fkey "
        "TO forecast_current_product_group_id_fkey"
    )

    # inbound_plan_lines
    op.execute(
        "ALTER TABLE inbound_plan_lines RENAME CONSTRAINT inbound_plan_lines_product_id_fkey "
        "TO inbound_plan_lines_product_group_id_fkey"
    )

    # order_groups
    op.execute(
        "ALTER TABLE order_groups RENAME CONSTRAINT order_groups_product_id_fkey "
        "TO order_groups_product_group_id_fkey"
    )

    # order_lines
    op.execute(
        "ALTER TABLE order_lines RENAME CONSTRAINT order_lines_product_id_fkey "
        "TO order_lines_product_group_id_fkey"
    )

    # product_mappings
    op.execute(
        "ALTER TABLE product_mappings RENAME CONSTRAINT product_mappings_product_id_fkey "
        "TO product_mappings_product_group_id_fkey"
    )

    # product_uom_conversions
    op.execute(
        "ALTER TABLE product_uom_conversions RENAME CONSTRAINT product_uom_conversions_product_id_fkey "
        "TO product_uom_conversions_product_group_id_fkey"
    )

    # product_warehouse
    op.execute(
        "ALTER TABLE product_warehouse RENAME CONSTRAINT product_warehouse_product_id_fkey "
        "TO product_warehouse_product_group_id_fkey"
    )

    # supplier_items
    _rename_constraint_if_exists(
        "supplier_items",
        "supplier_items_product_id_fkey",
        "supplier_items_product_group_id_fkey",
    )

    # warehouse_delivery_routes
    op.execute(
        "ALTER TABLE warehouse_delivery_routes RENAME CONSTRAINT warehouse_delivery_routes_product_id_fkey "
        "TO warehouse_delivery_routes_product_group_id_fkey"
    )

    # lot_master (actual constraint name is fk_lot_master_product_id)
    op.execute(
        "ALTER TABLE lot_master RENAME CONSTRAINT fk_lot_master_product_id "
        "TO fk_lot_master_product_group_id"
    )

    # allocation_suggestions
    op.execute(
        "ALTER TABLE allocation_suggestions RENAME CONSTRAINT allocation_suggestions_product_id_fkey "
        "TO allocation_suggestions_product_group_id_fkey"
    )

    # missing_mapping_events (actual constraint name is fk_missing_mapping_events_product_id)
    op.execute(
        "ALTER TABLE missing_mapping_events RENAME CONSTRAINT fk_missing_mapping_events_product_id "
        "TO fk_missing_mapping_events_product_group_id"
    )

    # Drop views that depend on product_id columns first
    op.execute("DROP VIEW IF EXISTS v_ocr_results CASCADE")
    op.execute("DROP VIEW IF EXISTS v_customer_item_jiku_mappings CASCADE")
    op.execute("DROP VIEW IF EXISTS v_user_supplier_assignments CASCADE")
    op.execute("DROP VIEW IF EXISTS v_warehouse_code_to_id CASCADE")
    op.execute("DROP VIEW IF EXISTS v_supplier_code_to_id CASCADE")
    op.execute("DROP VIEW IF EXISTS v_lot_receipt_stock CASCADE")
    op.execute("DROP VIEW IF EXISTS v_lot_available_qty CASCADE")
    op.execute("DROP VIEW IF EXISTS v_lot_details CASCADE")
    op.execute("DROP VIEW IF EXISTS v_inventory_summary CASCADE")
    op.execute("DROP VIEW IF EXISTS v_lot_current_stock CASCADE")
    op.execute("DROP VIEW IF EXISTS v_order_line_details CASCADE")
    op.execute("DROP VIEW IF EXISTS v_candidate_lots_by_order_line CASCADE")
    op.execute("DROP VIEW IF EXISTS v_customer_daily_products CASCADE")
    op.execute("DROP VIEW IF EXISTS v_forecast_order_pairs CASCADE")
    op.execute("DROP VIEW IF EXISTS v_product_code_to_id CASCADE")
    op.execute("DROP VIEW IF EXISTS v_order_line_context CASCADE")
    op.execute("DROP VIEW IF EXISTS v_customer_code_to_id CASCADE")
    op.execute("DROP VIEW IF EXISTS v_delivery_place_code_to_id CASCADE")
    op.execute("DROP VIEW IF EXISTS v_lot_allocations CASCADE")
    op.execute("DROP VIEW IF EXISTS v_lot_active_reservations CASCADE")

    # Rename column product_id to product_group_id in all related tables
    op.alter_column("customer_items", "product_id", new_column_name="product_group_id")
    op.alter_column("forecast_current", "product_id", new_column_name="product_group_id")
    op.alter_column("inbound_plan_lines", "product_id", new_column_name="product_group_id")
    op.alter_column("lot_receipts", "product_id", new_column_name="product_group_id")
    op.alter_column("order_groups", "product_id", new_column_name="product_group_id")
    op.alter_column("order_lines", "product_id", new_column_name="product_group_id")
    op.alter_column("product_mappings", "product_id", new_column_name="product_group_id")
    op.alter_column("product_uom_conversions", "product_id", new_column_name="product_group_id")
    op.alter_column("product_warehouse", "product_id", new_column_name="product_group_id")
    op.alter_column("supplier_items", "product_id", new_column_name="product_group_id")
    op.alter_column("warehouse_delivery_routes", "product_id", new_column_name="product_group_id")
    op.alter_column("lot_master", "product_id", new_column_name="product_group_id")
    op.alter_column("allocation_suggestions", "product_id", new_column_name="product_group_id")
    op.alter_column("missing_mapping_events", "product_id", new_column_name="product_group_id")

    # Rename lot_receipts FK constraint (actual constraint name is lots_product_id_fkey)
    op.execute(
        "ALTER TABLE lot_receipts RENAME CONSTRAINT lots_product_id_fkey "
        "TO lot_receipts_product_group_id_fkey"
    )

    # Note: View recreation removed to avoid premature creation with incomplete schema
    # Views will be recreated at the end of the migration chain
    pass


def downgrade() -> None:
    """Revert: Rename product_groups table back to products."""
    # Drop views first
    op.execute("DROP VIEW IF EXISTS v_ocr_results CASCADE")
    op.execute("DROP VIEW IF EXISTS v_customer_item_jiku_mappings CASCADE")
    op.execute("DROP VIEW IF EXISTS v_user_supplier_assignments CASCADE")
    op.execute("DROP VIEW IF EXISTS v_warehouse_code_to_id CASCADE")
    op.execute("DROP VIEW IF EXISTS v_supplier_code_to_id CASCADE")
    op.execute("DROP VIEW IF EXISTS v_lot_receipt_stock CASCADE")
    op.execute("DROP VIEW IF EXISTS v_lot_available_qty CASCADE")
    op.execute("DROP VIEW IF EXISTS v_lot_details CASCADE")
    op.execute("DROP VIEW IF EXISTS v_inventory_summary CASCADE")
    op.execute("DROP VIEW IF EXISTS v_lot_current_stock CASCADE")
    op.execute("DROP VIEW IF EXISTS v_order_line_details CASCADE")
    op.execute("DROP VIEW IF EXISTS v_candidate_lots_by_order_line CASCADE")
    op.execute("DROP VIEW IF EXISTS v_customer_daily_products CASCADE")
    op.execute("DROP VIEW IF EXISTS v_forecast_order_pairs CASCADE")
    op.execute("DROP VIEW IF EXISTS v_product_code_to_id CASCADE")
    op.execute("DROP VIEW IF EXISTS v_order_line_context CASCADE")
    op.execute("DROP VIEW IF EXISTS v_customer_code_to_id CASCADE")
    op.execute("DROP VIEW IF EXISTS v_delivery_place_code_to_id CASCADE")
    op.execute("DROP VIEW IF EXISTS v_lot_allocations CASCADE")
    op.execute("DROP VIEW IF EXISTS v_lot_active_reservations CASCADE")

    # Revert lot_receipts FK constraint
    op.execute(
        "ALTER TABLE lot_receipts RENAME CONSTRAINT lot_receipts_product_group_id_fkey "
        "TO lots_product_id_fkey"
    )

    # Revert column renames first
    op.alter_column("customer_items", "product_group_id", new_column_name="product_id")
    op.alter_column("forecast_current", "product_group_id", new_column_name="product_id")
    op.alter_column("inbound_plan_lines", "product_group_id", new_column_name="product_id")
    op.alter_column("lot_receipts", "product_group_id", new_column_name="product_id")
    op.alter_column("order_groups", "product_group_id", new_column_name="product_id")
    op.alter_column("order_lines", "product_group_id", new_column_name="product_id")
    op.alter_column("product_mappings", "product_group_id", new_column_name="product_id")
    op.alter_column("product_uom_conversions", "product_group_id", new_column_name="product_id")
    op.alter_column("product_warehouse", "product_group_id", new_column_name="product_id")
    op.alter_column("supplier_items", "product_group_id", new_column_name="product_id")
    op.alter_column("warehouse_delivery_routes", "product_group_id", new_column_name="product_id")
    op.alter_column("lot_master", "product_group_id", new_column_name="product_id")
    op.alter_column("allocation_suggestions", "product_group_id", new_column_name="product_id")
    op.alter_column("missing_mapping_events", "product_group_id", new_column_name="product_id")

    # Revert FK constraint renames
    op.execute(
        "ALTER TABLE customer_items RENAME CONSTRAINT customer_items_product_group_id_fkey "
        "TO customer_items_product_id_fkey"
    )
    op.execute(
        "ALTER TABLE forecast_current RENAME CONSTRAINT forecast_current_product_group_id_fkey "
        "TO forecast_current_product_id_fkey"
    )
    op.execute(
        "ALTER TABLE inbound_plan_lines RENAME CONSTRAINT inbound_plan_lines_product_group_id_fkey "
        "TO inbound_plan_lines_product_id_fkey"
    )
    op.execute(
        "ALTER TABLE order_groups RENAME CONSTRAINT order_groups_product_group_id_fkey "
        "TO order_groups_product_id_fkey"
    )
    op.execute(
        "ALTER TABLE order_lines RENAME CONSTRAINT order_lines_product_group_id_fkey "
        "TO order_lines_product_id_fkey"
    )
    op.execute(
        "ALTER TABLE product_mappings RENAME CONSTRAINT product_mappings_product_group_id_fkey "
        "TO product_mappings_product_id_fkey"
    )
    op.execute(
        "ALTER TABLE product_uom_conversions RENAME CONSTRAINT product_uom_conversions_product_group_id_fkey "
        "TO product_uom_conversions_product_id_fkey"
    )
    op.execute(
        "ALTER TABLE product_warehouse RENAME CONSTRAINT product_warehouse_product_group_id_fkey "
        "TO product_warehouse_product_id_fkey"
    )
    op.execute(
        "ALTER TABLE supplier_items RENAME CONSTRAINT supplier_items_product_group_id_fkey "
        "TO supplier_items_product_id_fkey"
    )
    op.execute(
        "ALTER TABLE warehouse_delivery_routes RENAME CONSTRAINT warehouse_delivery_routes_product_group_id_fkey "
        "TO warehouse_delivery_routes_product_id_fkey"
    )
    op.execute(
        "ALTER TABLE lot_master RENAME CONSTRAINT fk_lot_master_product_group_id "
        "TO fk_lot_master_product_id"
    )
    op.execute(
        "ALTER TABLE allocation_suggestions RENAME CONSTRAINT allocation_suggestions_product_group_id_fkey "
        "TO allocation_suggestions_product_id_fkey"
    )
    op.execute(
        "ALTER TABLE missing_mapping_events RENAME CONSTRAINT fk_missing_mapping_events_product_group_id "
        "TO fk_missing_mapping_events_product_id"
    )

    # Revert unique constraint rename
    op.execute(
        "ALTER TABLE product_groups RENAME CONSTRAINT uq_product_groups_maker_part_code "
        "TO uq_products_maker_part_code"
    )

    # Revert index renames
    op.execute("ALTER INDEX idx_product_groups_name RENAME TO idx_products_name")
    op.execute("ALTER INDEX idx_product_groups_valid_to RENAME TO idx_products_valid_to")

    # Revert sequence rename
    op.execute("ALTER SEQUENCE product_groups_id_seq RENAME TO products_id_seq")

    # Revert table rename
    op.rename_table("product_groups", "products")
