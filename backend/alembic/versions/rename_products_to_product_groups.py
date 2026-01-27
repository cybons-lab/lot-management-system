"""Rename products table to product_groups.

Revision ID: rename_products_to_product_groups
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

from alembic import op


def _recreate_views_upgrade() -> None:
    """Recreate views with product_group_id column."""
    # v_lot_allocations (no product_id dependency, but needed for other views)
    op.execute("""
        CREATE OR REPLACE VIEW v_lot_allocations AS
        SELECT lot_reservations.lot_id,
            sum(lot_reservations.reserved_qty) AS allocated_quantity
        FROM lot_reservations
        WHERE (lot_reservations.status)::text = 'confirmed'::text
        GROUP BY lot_reservations.lot_id
    """)

    # v_lot_active_reservations (no product_id dependency)
    op.execute("""
        CREATE OR REPLACE VIEW v_lot_active_reservations AS
        SELECT lot_reservations.lot_id,
            sum(lot_reservations.reserved_qty) AS reserved_quantity_active
        FROM lot_reservations
        WHERE (lot_reservations.status)::text = 'active'::text
        GROUP BY lot_reservations.lot_id
    """)

    # v_lot_available_qty - updated to use product_group_id
    op.execute("""
        CREATE OR REPLACE VIEW v_lot_available_qty AS
        SELECT lr.id AS lot_id,
            lr.product_group_id,
            lr.warehouse_id,
            GREATEST((((lr.received_quantity - COALESCE(wl_sum.total_withdrawn, 0::numeric))
                - COALESCE(la.allocated_quantity, 0::numeric)) - lr.locked_quantity), 0::numeric) AS available_qty,
            lr.received_date AS receipt_date,
            lr.expiry_date,
            lr.status AS lot_status
        FROM lot_receipts lr
        LEFT JOIN v_lot_allocations la ON lr.id = la.lot_id
        LEFT JOIN (
            SELECT wl.lot_receipt_id, sum(wl.quantity) AS total_withdrawn
            FROM withdrawal_lines wl
            JOIN withdrawals wd ON wl.withdrawal_id = wd.id
            WHERE wd.cancelled_at IS NULL
            GROUP BY wl.lot_receipt_id
        ) wl_sum ON wl_sum.lot_receipt_id = lr.id
        WHERE (lr.status)::text = 'active'::text
            AND (lr.expiry_date IS NULL OR lr.expiry_date >= CURRENT_DATE)
            AND ((((lr.received_quantity - COALESCE(wl_sum.total_withdrawn, 0::numeric))
                - COALESCE(la.allocated_quantity, 0::numeric)) - lr.locked_quantity) > 0::numeric)
    """)

    # v_lot_receipt_stock - updated to use product_group_id and product_groups table
    op.execute("""
        CREATE OR REPLACE VIEW v_lot_receipt_stock AS
        SELECT lr.id AS receipt_id,
            lm.id AS lot_master_id,
            lm.lot_number,
            lr.product_group_id,
            p.maker_part_code AS product_code,
            p.product_name,
            lr.warehouse_id,
            w.warehouse_code,
            w.warehouse_name,
            COALESCE(w.short_name, left(w.warehouse_name::text, 10)::varchar) AS warehouse_short_name,
            lm.supplier_id,
            s.supplier_code,
            s.supplier_name,
            COALESCE(s.short_name, left(s.supplier_name::text, 10)::varchar) AS supplier_short_name,
            lr.received_date,
            lr.expiry_date,
            lr.unit,
            lr.status,
            lr.received_quantity AS initial_quantity,
            COALESCE(wl_sum.total_withdrawn, 0::numeric) AS withdrawn_quantity,
            GREATEST(((lr.received_quantity - COALESCE(wl_sum.total_withdrawn, 0::numeric)) - lr.locked_quantity), 0::numeric) AS remaining_quantity,
            COALESCE(la.allocated_quantity, 0::numeric) AS reserved_quantity,
            COALESCE(lar.reserved_quantity_active, 0::numeric) AS reserved_quantity_active,
            GREATEST((((lr.received_quantity - COALESCE(wl_sum.total_withdrawn, 0::numeric)) - lr.locked_quantity)
                - COALESCE(la.allocated_quantity, 0::numeric)), 0::numeric) AS available_quantity,
            lr.locked_quantity,
            lr.lock_reason,
            lr.inspection_status,
            lr.receipt_key,
            lr.created_at,
            lr.updated_at,
            CASE WHEN lr.expiry_date IS NOT NULL THEN lr.expiry_date - CURRENT_DATE ELSE NULL END AS days_to_expiry
        FROM lot_receipts lr
        JOIN lot_master lm ON lr.lot_master_id = lm.id
        LEFT JOIN product_groups p ON lr.product_group_id = p.id
        LEFT JOIN warehouses w ON lr.warehouse_id = w.id
        LEFT JOIN suppliers s ON lm.supplier_id = s.id
        LEFT JOIN (
            SELECT wl.lot_receipt_id, sum(wl.quantity) AS total_withdrawn
            FROM withdrawal_lines wl
            JOIN withdrawals wd ON wl.withdrawal_id = wd.id
            WHERE wd.cancelled_at IS NULL
            GROUP BY wl.lot_receipt_id
        ) wl_sum ON wl_sum.lot_receipt_id = lr.id
        LEFT JOIN v_lot_allocations la ON lr.id = la.lot_id
        LEFT JOIN v_lot_active_reservations lar ON lr.id = lar.lot_id
        WHERE (lr.status)::text = 'active'::text
    """)

    # v_inventory_summary - updated
    op.execute("""
        CREATE OR REPLACE VIEW v_inventory_summary AS
        SELECT pw.product_group_id,
            pw.warehouse_id,
            COALESCE(agg.total_quantity, 0::numeric) AS total_quantity,
            COALESCE(agg.allocated_quantity, 0::numeric) AS allocated_quantity,
            COALESCE(agg.available_quantity, 0::numeric) AS available_quantity,
            COALESCE(agg.active_lot_count, 0) AS active_lot_count,
            COALESCE(agg.earliest_expiry, NULL::date) AS earliest_expiry,
            COALESCE(agg.pending_inbound, 0::numeric) AS pending_inbound
        FROM product_warehouse pw
        LEFT JOIN (
            SELECT lrs.product_group_id,
                lrs.warehouse_id,
                sum(lrs.remaining_quantity) AS total_quantity,
                sum(lrs.reserved_quantity) AS allocated_quantity,
                sum(lrs.available_quantity) AS available_quantity,
                count(*) AS active_lot_count,
                min(lrs.expiry_date) AS earliest_expiry,
                COALESCE(sum(ipl.expected_quantity), 0::numeric) AS pending_inbound
            FROM v_lot_receipt_stock lrs
            LEFT JOIN inbound_plan_lines ipl ON lrs.product_group_id = ipl.product_group_id
            GROUP BY lrs.product_group_id, lrs.warehouse_id
        ) agg ON agg.product_group_id = pw.product_group_id AND agg.warehouse_id = pw.warehouse_id
    """)

    # v_lot_current_stock - updated
    op.execute("""
        CREATE OR REPLACE VIEW v_lot_current_stock AS
        SELECT lr.id AS lot_id,
            lr.product_group_id,
            lr.warehouse_id,
            lr.received_quantity - lr.consumed_quantity AS current_quantity,
            lr.received_date,
            lr.expiry_date,
            lr.status
        FROM lot_receipts lr
        WHERE (lr.status)::text = 'active'::text
    """)

    # v_lot_details - updated
    op.execute("""
        CREATE OR REPLACE VIEW v_lot_details AS
        SELECT lr.id AS lot_id,
            lr.product_group_id,
            p.maker_part_code AS product_code,
            p.product_name,
            lr.warehouse_id,
            w.warehouse_code,
            w.warehouse_name,
            lm.supplier_id,
            s.supplier_code,
            s.supplier_name,
            lm.lot_number,
            lr.received_date,
            lr.expiry_date,
            lr.received_quantity AS initial_quantity,
            lr.received_quantity - lr.consumed_quantity AS current_quantity,
            lr.status,
            lr.unit,
            p.valid_to < '9999-12-31'::date AS product_deleted,
            w.valid_to < '9999-12-31'::date AS warehouse_deleted,
            COALESCE(s.valid_to < '9999-12-31'::date, false) AS supplier_deleted
        FROM lot_receipts lr
        JOIN lot_master lm ON lr.lot_master_id = lm.id
        LEFT JOIN product_groups p ON lr.product_group_id = p.id
        LEFT JOIN warehouses w ON lr.warehouse_id = w.id
        LEFT JOIN suppliers s ON lm.supplier_id = s.id
    """)

    # v_order_line_details - updated
    op.execute("""
        CREATE OR REPLACE VIEW v_order_line_details AS
        SELECT ol.id AS line_id,
            ol.order_id,
            ol.product_group_id,
            p.maker_part_code AS product_code,
            p.product_name,
            ol.quantity,
            ol.allocated_quantity,
            ol.status,
            o.customer_id,
            c.customer_code,
            c.customer_name,
            ci.customer_part_no,
            ol.created_at,
            ol.updated_at
        FROM order_lines ol
        JOIN orders o ON ol.order_id = o.id
        LEFT JOIN product_groups p ON ol.product_group_id = p.id
        LEFT JOIN customers c ON o.customer_id = c.id
        LEFT JOIN customer_items ci ON ci.customer_id = o.customer_id AND ci.product_group_id = ol.product_group_id
    """)

    # v_customer_daily_products - updated
    op.execute("""
        CREATE OR REPLACE VIEW v_customer_daily_products AS
        SELECT f.customer_id,
            f.product_group_id
        FROM forecast_current f
        GROUP BY f.customer_id, f.product_group_id
    """)

    # v_forecast_order_pairs - updated
    op.execute("""
        CREATE OR REPLACE VIEW v_forecast_order_pairs AS
        SELECT f.customer_id,
            f.product_group_id,
            f.forecast_date,
            f.forecast_quantity,
            ol.order_id,
            ol.quantity AS order_quantity
        FROM forecast_current f
        LEFT JOIN orders o ON o.customer_id = f.customer_id AND o.order_date = f.forecast_date
        LEFT JOIN order_lines ol ON ol.order_id = o.id AND ol.product_group_id = f.product_group_id
    """)

    # v_candidate_lots_by_order_line - updated
    op.execute("""
        CREATE OR REPLACE VIEW v_candidate_lots_by_order_line AS
        SELECT c.customer_id,
            c.product_group_id,
            l.lot_id,
            l.available_qty,
            l.receipt_date,
            l.expiry_date
        FROM v_customer_daily_products c
        JOIN v_lot_available_qty l ON l.product_group_id = c.product_group_id AND l.available_qty > 0::numeric
    """)

    # v_product_code_to_id - updated
    op.execute("""
        CREATE OR REPLACE VIEW v_product_code_to_id AS
        SELECT p.id AS product_group_id,
            p.maker_part_code AS product_code
        FROM product_groups p
        WHERE p.valid_to >= '9999-12-31'::date
    """)


# revision identifiers, used by Alembic.
revision = "rename_products_to_product_groups"
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

    # lots
    op.execute(
        "ALTER TABLE lots RENAME CONSTRAINT lots_product_id_fkey TO lots_product_group_id_fkey"
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
    op.execute(
        "ALTER TABLE supplier_items RENAME CONSTRAINT supplier_items_product_id_fkey "
        "TO supplier_items_product_group_id_fkey"
    )

    # warehouse_delivery_routes
    op.execute(
        "ALTER TABLE warehouse_delivery_routes RENAME CONSTRAINT warehouse_delivery_routes_product_id_fkey "
        "TO warehouse_delivery_routes_product_group_id_fkey"
    )

    # lot_master
    op.execute(
        "ALTER TABLE lot_master RENAME CONSTRAINT lot_master_product_id_fkey "
        "TO lot_master_product_group_id_fkey"
    )

    # allocation_suggestions
    op.execute(
        "ALTER TABLE allocation_suggestions RENAME CONSTRAINT allocation_suggestions_product_id_fkey "
        "TO allocation_suggestions_product_group_id_fkey"
    )

    # missing_mapping_events
    op.execute(
        "ALTER TABLE missing_mapping_events RENAME CONSTRAINT missing_mapping_events_product_id_fkey "
        "TO missing_mapping_events_product_group_id_fkey"
    )

    # Drop views that depend on product_id columns first
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

    # Rename column product_id to product_group_id in all related tables
    op.alter_column("customer_items", "product_id", new_column_name="product_group_id")
    op.alter_column("forecast_current", "product_id", new_column_name="product_group_id")
    op.alter_column("inbound_plan_lines", "product_id", new_column_name="product_group_id")
    op.alter_column("lots", "product_id", new_column_name="product_group_id")
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

    # Rename lot_receipts FK constraint
    op.execute(
        "ALTER TABLE lot_receipts RENAME CONSTRAINT lot_receipts_product_id_fkey "
        "TO lot_receipts_product_group_id_fkey"
    )

    # Recreate views with product_group_id
    _recreate_views_upgrade()


def downgrade() -> None:
    """Revert: Rename product_groups table back to products."""
    # Drop views first
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

    # Revert lot_receipts FK constraint
    op.execute(
        "ALTER TABLE lot_receipts RENAME CONSTRAINT lot_receipts_product_group_id_fkey "
        "TO lot_receipts_product_id_fkey"
    )

    # Revert column renames first
    op.alter_column("customer_items", "product_group_id", new_column_name="product_id")
    op.alter_column("forecast_current", "product_group_id", new_column_name="product_id")
    op.alter_column("inbound_plan_lines", "product_group_id", new_column_name="product_id")
    op.alter_column("lots", "product_group_id", new_column_name="product_id")
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
        "ALTER TABLE lots RENAME CONSTRAINT lots_product_group_id_fkey TO lots_product_id_fkey"
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
        "ALTER TABLE lot_master RENAME CONSTRAINT lot_master_product_group_id_fkey "
        "TO lot_master_product_id_fkey"
    )
    op.execute(
        "ALTER TABLE allocation_suggestions RENAME CONSTRAINT allocation_suggestions_product_group_id_fkey "
        "TO allocation_suggestions_product_id_fkey"
    )
    op.execute(
        "ALTER TABLE missing_mapping_events RENAME CONSTRAINT missing_mapping_events_product_group_id_fkey "
        "TO missing_mapping_events_product_id_fkey"
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
