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
    return result.scalar()


def _rename_constraint_if_exists(table_name: str, old_name: str, new_name: str) -> None:
    """Rename constraint if it exists, otherwise skip."""
    if _constraint_exists(old_name, table_name):
        op.execute(f"ALTER TABLE {table_name} RENAME CONSTRAINT {old_name} TO {new_name}")
        print(f"✅ Renamed constraint: {old_name} → {new_name}")
    else:
        print(f"⏭️  Skipped (not found): {old_name}")


def _recreate_views_upgrade() -> None:
    """Recreate views with product_group_id column.

    Based on sql/views/create_views.sql (v2.4: B-Plan lot_receipts対応版)
    """
    # v_lot_allocations
    op.execute("""
        CREATE OR REPLACE VIEW v_lot_allocations AS
        SELECT
            lot_id,
            SUM(reserved_qty) as allocated_quantity
        FROM lot_reservations
        WHERE status = 'confirmed'
        GROUP BY lot_id
    """)

    # v_lot_active_reservations
    op.execute("""
        CREATE OR REPLACE VIEW v_lot_active_reservations AS
        SELECT
            lot_id,
            SUM(reserved_qty) as reserved_quantity_active
        FROM lot_reservations
        WHERE status = 'active'
        GROUP BY lot_id
    """)

    # v_lot_current_stock
    op.execute("""
        CREATE OR REPLACE VIEW v_lot_current_stock AS
        SELECT
            lr.id AS lot_id,
            lr.product_group_id,
            lr.warehouse_id,
            lr.received_quantity AS current_quantity,
            lr.updated_at AS last_updated
        FROM lot_receipts lr
        WHERE lr.received_quantity > 0
    """)

    # v_customer_daily_products
    op.execute("""
        CREATE OR REPLACE VIEW v_customer_daily_products AS
        SELECT DISTINCT
            f.customer_id,
            f.product_group_id
        FROM forecast_current f
        WHERE f.forecast_period IS NOT NULL
    """)

    # v_order_line_context
    op.execute("""
        CREATE OR REPLACE VIEW v_order_line_context AS
        SELECT
            ol.id AS order_line_id,
            o.id AS order_id,
            o.customer_id,
            ol.product_group_id,
            ol.delivery_place_id,
            ol.order_quantity AS quantity
        FROM order_lines ol
        JOIN orders o ON o.id = ol.order_id
    """)

    # v_customer_code_to_id
    op.execute("""
        CREATE OR REPLACE VIEW v_customer_code_to_id AS
        SELECT
            c.customer_code,
            c.id AS customer_id,
            COALESCE(c.customer_name, '[削除済み得意先]') AS customer_name,
            CASE WHEN c.valid_to IS NOT NULL AND c.valid_to <= CURRENT_DATE THEN TRUE ELSE FALSE END AS is_deleted
        FROM customers c
    """)

    # v_delivery_place_code_to_id
    op.execute("""
        CREATE OR REPLACE VIEW v_delivery_place_code_to_id AS
        SELECT
            d.delivery_place_code,
            d.id AS delivery_place_id,
            COALESCE(d.delivery_place_name, '[削除済み納入先]') AS delivery_place_name,
            CASE WHEN d.valid_to IS NOT NULL AND d.valid_to <= CURRENT_DATE THEN TRUE ELSE FALSE END AS is_deleted
        FROM delivery_places d
    """)

    # v_product_code_to_id
    op.execute("""
        CREATE OR REPLACE VIEW v_product_code_to_id AS
        SELECT
            p.maker_part_code AS product_code,
            p.id AS product_group_id,
            COALESCE(p.product_name, '[削除済み製品]') AS product_name,
            CASE WHEN p.valid_to IS NOT NULL AND p.valid_to <= CURRENT_DATE THEN TRUE ELSE FALSE END AS is_deleted
        FROM product_groups p
    """)

    # v_forecast_order_pairs
    op.execute("""
        CREATE OR REPLACE VIEW v_forecast_order_pairs AS
        SELECT DISTINCT
            f.id AS forecast_id,
            f.customer_id,
            f.product_group_id,
            o.id AS order_id,
            ol.delivery_place_id
        FROM forecast_current f
        JOIN orders o ON o.customer_id = f.customer_id
        JOIN order_lines ol ON ol.order_id = o.id
            AND ol.product_group_id = f.product_group_id
    """)

    # v_lot_available_qty
    op.execute("""
        CREATE OR REPLACE VIEW v_lot_available_qty AS
        SELECT
            lr.id AS lot_id,
            lr.product_group_id,
            lr.warehouse_id,
            GREATEST(
                lr.received_quantity
                - COALESCE(wl_sum.total_withdrawn, 0)
                - COALESCE(la.allocated_quantity, 0)
                - lr.locked_quantity,
                0
            ) AS available_qty,
            lr.received_date AS receipt_date,
            lr.expiry_date,
            lr.status AS lot_status
        FROM lot_receipts lr
        LEFT JOIN v_lot_allocations la ON lr.id = la.lot_id
        LEFT JOIN (
            SELECT wl.lot_receipt_id, SUM(wl.quantity) AS total_withdrawn
            FROM withdrawal_lines wl
            JOIN withdrawals wd ON wl.withdrawal_id = wd.id
            WHERE wd.cancelled_at IS NULL
            GROUP BY wl.lot_receipt_id
        ) wl_sum ON wl_sum.lot_receipt_id = lr.id
        WHERE
            lr.status = 'active'
            AND (lr.expiry_date IS NULL OR lr.expiry_date >= CURRENT_DATE)
            AND (lr.received_quantity - COALESCE(wl_sum.total_withdrawn, 0) - COALESCE(la.allocated_quantity, 0) - lr.locked_quantity) > 0
    """)

    # v_lot_receipt_stock
    op.execute("""
        CREATE OR REPLACE VIEW v_lot_receipt_stock AS
        SELECT
            lr.id AS receipt_id,
            lm.id AS lot_master_id,
            lm.lot_number,
            lr.product_group_id,
            p.maker_part_code AS product_code,
            p.product_name,
            lr.warehouse_id,
            w.warehouse_code,
            w.warehouse_name,
            COALESCE(w.short_name, LEFT(w.warehouse_name, 10)) AS warehouse_short_name,
            lm.supplier_id,
            s.supplier_code,
            s.supplier_name,
            COALESCE(s.short_name, LEFT(s.supplier_name, 10)) AS supplier_short_name,
            lr.received_date,
            lr.expiry_date,
            lr.unit,
            lr.status,
            lr.received_quantity AS initial_quantity,
            COALESCE(wl_sum.total_withdrawn, 0) AS withdrawn_quantity,
            GREATEST(lr.received_quantity - COALESCE(wl_sum.total_withdrawn, 0) - lr.locked_quantity, 0) AS remaining_quantity,
            COALESCE(la.allocated_quantity, 0) AS reserved_quantity,
            COALESCE(lar.reserved_quantity_active, 0) AS reserved_quantity_active,
            GREATEST(
                lr.received_quantity - COALESCE(wl_sum.total_withdrawn, 0)
                - lr.locked_quantity - COALESCE(la.allocated_quantity, 0),
                0
            ) AS available_quantity,
            lr.locked_quantity,
            lr.lock_reason,
            lr.inspection_status,
            lr.receipt_key,
            lr.created_at,
            lr.updated_at,
            CASE
                WHEN lr.expiry_date IS NOT NULL
                THEN (lr.expiry_date - CURRENT_DATE)::INTEGER
                ELSE NULL
            END AS days_to_expiry
        FROM lot_receipts lr
        JOIN lot_master lm ON lr.lot_master_id = lm.id
        LEFT JOIN product_groups p ON lr.product_group_id = p.id
        LEFT JOIN warehouses w ON lr.warehouse_id = w.id
        LEFT JOIN suppliers s ON lm.supplier_id = s.id
        LEFT JOIN (
            SELECT
                wl.lot_receipt_id,
                SUM(wl.quantity) AS total_withdrawn
            FROM withdrawal_lines wl
            JOIN withdrawals wd ON wl.withdrawal_id = wd.id
            WHERE wd.cancelled_at IS NULL
            GROUP BY wl.lot_receipt_id
        ) wl_sum ON wl_sum.lot_receipt_id = lr.id
        LEFT JOIN v_lot_allocations la ON lr.id = la.lot_id
        LEFT JOIN v_lot_active_reservations lar ON lr.id = lar.lot_id
        WHERE lr.status = 'active'
    """)

    # v_inventory_summary
    op.execute("""
        CREATE OR REPLACE VIEW v_inventory_summary AS
        SELECT
          pw.product_group_id,
          pw.warehouse_id,
          COALESCE(agg.active_lot_count, 0) AS active_lot_count,
          COALESCE(agg.total_quantity, 0) AS total_quantity,
          COALESCE(agg.allocated_quantity, 0) AS allocated_quantity,
          COALESCE(agg.locked_quantity, 0) AS locked_quantity,
          COALESCE(agg.available_quantity, 0) AS available_quantity,
          COALESCE(agg.provisional_stock, 0) AS provisional_stock,
          COALESCE(agg.available_with_provisional, 0) AS available_with_provisional,
          COALESCE(agg.last_updated, pw.updated_at) AS last_updated,
          CASE
            WHEN COALESCE(agg.active_lot_count, 0) = 0 THEN 'no_lots'
            WHEN COALESCE(agg.available_quantity, 0) > 0 THEN 'in_stock'
            ELSE 'depleted_only'
          END AS inventory_state
        FROM product_warehouse pw
        LEFT JOIN (
          SELECT
            lrs.product_group_id,
            lrs.warehouse_id,
            COUNT(*) AS active_lot_count,
            SUM(lrs.remaining_quantity) AS total_quantity,
            SUM(lrs.reserved_quantity) AS allocated_quantity,
            SUM(lrs.locked_quantity) AS locked_quantity,
            SUM(lrs.available_quantity) AS available_quantity,
            COALESCE(SUM(ipl.planned_quantity), 0) AS provisional_stock,
            GREATEST(
              SUM(lrs.available_quantity) + COALESCE(SUM(ipl.planned_quantity), 0),
              0
            ) AS available_with_provisional,
            MAX(lrs.updated_at) AS last_updated
          FROM v_lot_receipt_stock lrs
          LEFT JOIN inbound_plan_lines ipl ON lrs.product_group_id = ipl.product_group_id
          LEFT JOIN inbound_plans ip ON ipl.inbound_plan_id = ip.id AND ip.status = 'planned'
          GROUP BY lrs.product_group_id, lrs.warehouse_id
        ) agg ON agg.product_group_id = pw.product_group_id AND agg.warehouse_id = pw.warehouse_id
        WHERE pw.is_active = true
    """)

    # v_lot_details
    op.execute("""
        CREATE OR REPLACE VIEW v_lot_details AS
        SELECT
            lr.id AS lot_id,
            lm.lot_number,
            lr.product_group_id,
            COALESCE(p.maker_part_code, '') AS maker_part_code,
            COALESCE(p.product_name, '[削除済み製品]') AS product_name,
            lr.warehouse_id,
            COALESCE(w.warehouse_code, '') AS warehouse_code,
            COALESCE(w.warehouse_name, '[削除済み倉庫]') AS warehouse_name,
            COALESCE(w.short_name, LEFT(w.warehouse_name, 10)) AS warehouse_short_name,
            lm.supplier_id,
            COALESCE(s.supplier_code, '') AS supplier_code,
            COALESCE(s.supplier_name, '[削除済み仕入先]') AS supplier_name,
            COALESCE(s.short_name, LEFT(s.supplier_name, 10)) AS supplier_short_name,
            lr.received_date,
            lr.expiry_date,
            lr.received_quantity,
            COALESCE(wl_sum.total_withdrawn, 0) AS withdrawn_quantity,
            GREATEST(lr.received_quantity - COALESCE(wl_sum.total_withdrawn, 0) - lr.locked_quantity, 0) AS remaining_quantity,
            GREATEST(lr.received_quantity - COALESCE(wl_sum.total_withdrawn, 0) - lr.locked_quantity, 0) AS current_quantity,
            COALESCE(la.allocated_quantity, 0) AS allocated_quantity,
            COALESCE(lar.reserved_quantity_active, 0) AS reserved_quantity_active,
            lr.locked_quantity,
            GREATEST(
                lr.received_quantity - COALESCE(wl_sum.total_withdrawn, 0)
                - lr.locked_quantity - COALESCE(la.allocated_quantity, 0),
                0
            ) AS available_quantity,
            lr.unit,
            lr.status,
            lr.lock_reason,
            lr.inspection_status,
            lr.inspection_date,
            lr.inspection_cert_number,
            CASE WHEN lr.expiry_date IS NOT NULL THEN CAST((lr.expiry_date - CURRENT_DATE) AS INTEGER) ELSE NULL END AS days_to_expiry,
            lr.temporary_lot_key,
            lr.receipt_key,
            lr.lot_master_id,
            lr.supplier_item_id,
            si.maker_part_no AS supplier_maker_part_no,
            ci_primary.customer_part_no AS customer_part_no,
            ci_primary.customer_id AS primary_customer_id,
            CASE
                WHEN lr.supplier_item_id IS NULL THEN 'no_supplier_item'
                WHEN ci_primary.id IS NULL THEN 'no_primary_mapping'
                ELSE 'mapped'
            END AS mapping_status,
            lr.origin_type,
            lr.origin_reference,
            lr.shipping_date,
            lr.cost_price,
            lr.sales_price,
            lr.tax_rate,
            usa_primary.user_id AS primary_user_id,
            u_primary.username AS primary_username,
            u_primary.display_name AS primary_user_display_name,
            CASE WHEN p.valid_to IS NOT NULL AND p.valid_to <= CURRENT_DATE THEN TRUE ELSE FALSE END AS product_deleted,
            CASE WHEN w.valid_to IS NOT NULL AND w.valid_to <= CURRENT_DATE THEN TRUE ELSE FALSE END AS warehouse_deleted,
            CASE WHEN s.valid_to IS NOT NULL AND s.valid_to <= CURRENT_DATE THEN TRUE ELSE FALSE END AS supplier_deleted,
            lr.created_at,
            lr.updated_at
        FROM lot_receipts lr
        JOIN lot_master lm ON lr.lot_master_id = lm.id
        LEFT JOIN v_lot_allocations la ON lr.id = la.lot_id
        LEFT JOIN v_lot_active_reservations lar ON lr.id = lar.lot_id
        LEFT JOIN product_groups p ON lr.product_group_id = p.id
        LEFT JOIN warehouses w ON lr.warehouse_id = w.id
        LEFT JOIN suppliers s ON lm.supplier_id = s.id
        LEFT JOIN supplier_items si ON lr.supplier_item_id = si.id
        LEFT JOIN customer_items ci_primary
            ON ci_primary.supplier_item_id = lr.supplier_item_id
            AND ci_primary.is_primary = TRUE
        LEFT JOIN (
            SELECT wl.lot_receipt_id, SUM(wl.quantity) AS total_withdrawn
            FROM withdrawal_lines wl
            JOIN withdrawals wd ON wl.withdrawal_id = wd.id
            WHERE wd.cancelled_at IS NULL
            GROUP BY wl.lot_receipt_id
        ) wl_sum ON wl_sum.lot_receipt_id = lr.id
        LEFT JOIN user_supplier_assignments usa_primary
            ON usa_primary.supplier_id = lm.supplier_id
            AND usa_primary.is_primary = TRUE
        LEFT JOIN users u_primary
            ON u_primary.id = usa_primary.user_id
    """)

    # v_candidate_lots_by_order_line
    op.execute("""
        CREATE OR REPLACE VIEW v_candidate_lots_by_order_line AS
        SELECT
            c.order_line_id,
            l.lot_id,
            l.product_group_id,
            l.warehouse_id,
            l.available_qty,
            l.receipt_date,
            l.expiry_date
        FROM v_order_line_context c
        JOIN v_customer_daily_products f
            ON f.customer_id = c.customer_id
            AND f.product_group_id = c.product_group_id
        JOIN v_lot_available_qty l
            ON l.product_group_id = c.product_group_id
            AND l.available_qty > 0
        ORDER BY
            c.order_line_id,
            l.expiry_date,
            l.receipt_date,
            l.lot_id
    """)

    # v_order_line_details
    op.execute("""
        CREATE OR REPLACE VIEW v_order_line_details AS
        SELECT
            o.id AS order_id,
            o.order_date,
            o.customer_id,
            COALESCE(c.customer_code, '') AS customer_code,
            COALESCE(c.customer_name, '[削除済み得意先]') AS customer_name,
            ol.id AS line_id,
            ol.product_group_id,
            ol.delivery_date,
            ol.order_quantity,
            ol.unit,
            ol.delivery_place_id,
            ol.status AS line_status,
            ol.shipping_document_text,
            COALESCE(p.maker_part_code, '') AS product_code,
            COALESCE(p.product_name, '[削除済み製品]') AS product_name,
            p.internal_unit AS product_internal_unit,
            p.external_unit AS product_external_unit,
            p.qty_per_internal_unit AS product_qty_per_internal_unit,
            COALESCE(dp.delivery_place_code, '') AS delivery_place_code,
            COALESCE(dp.delivery_place_name, '[削除済み納入先]') AS delivery_place_name,
            dp.jiku_code,
            ci.customer_part_no,
            COALESCE(s.supplier_name, '[削除済み仕入先]') AS supplier_name,
            COALESCE(res_sum.allocated_qty, 0) AS allocated_quantity,
            CASE WHEN c.valid_to IS NOT NULL AND c.valid_to <= CURRENT_DATE THEN TRUE ELSE FALSE END AS customer_deleted,
            CASE WHEN p.valid_to IS NOT NULL AND p.valid_to <= CURRENT_DATE THEN TRUE ELSE FALSE END AS product_deleted,
            CASE WHEN dp.valid_to IS NOT NULL AND dp.valid_to <= CURRENT_DATE THEN TRUE ELSE FALSE END AS delivery_place_deleted
        FROM orders o
        LEFT JOIN customers c ON o.customer_id = c.id
        LEFT JOIN order_lines ol ON ol.order_id = o.id
        LEFT JOIN product_groups p ON ol.product_group_id = p.id
        LEFT JOIN delivery_places dp ON ol.delivery_place_id = dp.id
        LEFT JOIN customer_items ci ON ci.customer_id = o.customer_id AND ci.product_group_id = ol.product_group_id
        LEFT JOIN suppliers s ON ci.supplier_id = s.id
        LEFT JOIN (
            SELECT source_id, SUM(reserved_qty) as allocated_qty
            FROM lot_reservations
            WHERE source_type = 'ORDER' AND status IN ('active', 'confirmed')
            GROUP BY source_id
        ) res_sum ON res_sum.source_id = ol.id
    """)

    # v_supplier_code_to_id
    op.execute("""
        CREATE OR REPLACE VIEW v_supplier_code_to_id AS
        SELECT
            s.supplier_code,
            s.id AS supplier_id,
            COALESCE(s.supplier_name, '[削除済み仕入先]') AS supplier_name,
            CASE WHEN s.valid_to IS NOT NULL AND s.valid_to <= CURRENT_DATE THEN TRUE ELSE FALSE END AS is_deleted
        FROM suppliers s
    """)

    # v_warehouse_code_to_id
    op.execute("""
        CREATE OR REPLACE VIEW v_warehouse_code_to_id AS
        SELECT
            w.warehouse_code,
            w.id AS warehouse_id,
            COALESCE(w.warehouse_name, '[削除済み倉庫]') AS warehouse_name,
            w.warehouse_type,
            CASE WHEN w.valid_to IS NOT NULL AND w.valid_to <= CURRENT_DATE THEN TRUE ELSE FALSE END AS is_deleted
        FROM warehouses w
    """)

    # v_user_supplier_assignments
    op.execute("""
        CREATE OR REPLACE VIEW v_user_supplier_assignments AS
        SELECT
            usa.id,
            usa.user_id,
            u.username,
            u.display_name,
            usa.supplier_id,
            COALESCE(s.supplier_code, '') AS supplier_code,
            COALESCE(s.supplier_name, '[削除済み仕入先]') AS supplier_name,
            usa.is_primary,
            usa.assigned_at,
            usa.created_at,
            usa.updated_at,
            CASE WHEN s.valid_to IS NOT NULL AND s.valid_to <= CURRENT_DATE THEN TRUE ELSE FALSE END AS supplier_deleted
        FROM user_supplier_assignments usa
        JOIN users u ON usa.user_id = u.id
        LEFT JOIN suppliers s ON usa.supplier_id = s.id
    """)

    # v_customer_item_jiku_mappings
    op.execute("""
        CREATE OR REPLACE VIEW v_customer_item_jiku_mappings AS
        SELECT
            cijm.id,
            ci.customer_id,
            COALESCE(c.customer_code, '') AS customer_code,
            COALESCE(c.customer_name, '[削除済み得意先]') AS customer_name,
            ci.customer_part_no,
            cijm.jiku_code,
            cijm.delivery_place_id,
            COALESCE(dp.delivery_place_code, '') AS delivery_place_code,
            COALESCE(dp.delivery_place_name, '[削除済み納入先]') AS delivery_place_name,
            cijm.is_default,
            cijm.created_at,
            CASE WHEN c.valid_to IS NOT NULL AND c.valid_to <= CURRENT_DATE THEN TRUE ELSE FALSE END AS customer_deleted,
            CASE WHEN dp.valid_to IS NOT NULL AND dp.valid_to <= CURRENT_DATE THEN TRUE ELSE FALSE END AS delivery_place_deleted
        FROM customer_item_jiku_mappings cijm
        JOIN customer_items ci ON cijm.customer_item_id = ci.id
        LEFT JOIN customers c ON ci.customer_id = c.id
        LEFT JOIN delivery_places dp ON cijm.delivery_place_id = dp.id
    """)


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

    # Recreate views with product_group_id
    _recreate_views_upgrade()


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
