import random

from faker import Faker
from sqlalchemy import text
from sqlalchemy.orm import Session


# Initialize Faker
fake = Faker("ja_JP")
Faker.seed(42)
random.seed(42)


def clear_data(db: Session):
    """Clear all data from related tables.

    Truncates all tables that test data generators write to.
    Uses session_replication_role='replica' to bypass FK constraints.
    """
    # Disable foreign key checks temporarily to avoid constraint errors during truncation
    db.execute(text("SET session_replication_role = 'replica';"))

    tables = [
        # Audit / Logs / Notifications
        "notifications",
        "missing_mapping_events",
        "operation_logs",
        "master_change_logs",
        "batch_jobs",
        "business_rules",
        "cloud_flow_jobs",
        "cloud_flow_configs",
        # RPA
        "rpa_run_item_attempts",
        "rpa_run_events",
        "rpa_run_fetches",
        "rpa_run_items",
        "rpa_run_groups",
        "rpa_runs",
        # User assignments
        "user_supplier_assignments",
        # Calendar
        "original_delivery_calendars",
        "company_calendars",
        "holiday_calendars",
        # Reservations & History
        "lot_reservation_history",
        "lot_reservations",
        # Inventory
        "stock_history",
        "adjustments",
        "allocation_traces",
        "allocation_suggestions",
        "withdrawal_lines",
        "withdrawals",
        "product_warehouse",
        # Inbound
        "expected_lots",
        "inbound_plan_lines",
        "inbound_plans",
        # Orders
        "order_groups",
        "order_lines",
        "orders",
        # Forecast
        "forecast_current",
        "forecast_history",
        # Lot
        "lot_receipts",
        "lot_master",
        # Customer Items (child tables first)
        "customer_item_jiku_mappings",
        "customer_item_delivery_settings",
        "customer_items",
        # Products & Mappings
        "product_uom_conversions",
        "product_mappings",
        "supplier_items",
        # Masters
        "delivery_places",
        "customers",
        "suppliers",
        "warehouse_delivery_routes",
        "warehouses",
        "makers",
        # SmartRead tables
        "ocr_result_edits",
        "ocr_result_edits_completed",
        "smartread_long_data",
        "smartread_long_data_completed",
        "smartread_wide_data",
        "smartread_export_history",
        "smartread_requests",
        "smartread_tasks",
        "smartread_pad_runs",
        "smartread_configs",
        "rpa_jobs",
        # Shipping Master tables
        "shipping_master_curated",
        "shipping_master_raw",
        "order_register_rows",
        # SAP
        "sap_fetch_logs",
        "sap_material_cache",
        "sap_connections",
        # System
        "system_configs",
        # Material Order Forecasts
        "material_order_forecasts",
    ]

    for table in tables:
        db.execute(text(f"TRUNCATE TABLE {table} RESTART IDENTITY CASCADE;"))

    db.execute(text("SET session_replication_role = 'origin';"))
    db.commit()
