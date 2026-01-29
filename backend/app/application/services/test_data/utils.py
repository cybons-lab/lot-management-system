import random

from faker import Faker
from sqlalchemy import text
from sqlalchemy.orm import Session


# Initialize Faker
fake = Faker("ja_JP")
Faker.seed(42)
random.seed(42)


def clear_data(db: Session):
    """Clear all data from related tables."""
    # Disable foreign key checks temporarily to avoid constraint errors during truncation
    db.execute(text("SET session_replication_role = 'replica';"))

    tables = [
        "rpa_run_items",
        "rpa_runs",
        "original_delivery_calendars",
        "company_calendars",
        "holiday_calendars",
        "lot_reservation_history",
        "lot_reservations",
        "withdrawals",
        "expected_lots",
        "inbound_plan_lines",
        "inbound_plans",
        "allocation_suggestions",
        "order_lines",
        "orders",
        "forecast_current",
        "forecast_history",
        "lot_receipts",
        "lot_master",
        "customer_item_jiku_mappings",
        "customer_item_delivery_settings",
        "customer_items",
        "product_uom_conversions",
        "product_mappings",
        "product_warehouse",
        "supplier_items",
        "delivery_places",
        "customers",
        "suppliers",
        "warehouse_delivery_routes",
        "warehouses",
        # SmartRead tables
        "smartread_long_data",
        "smartread_wide_data",
        "smartread_export_history",
        "smartread_requests",
        "smartread_tasks",
        # Shipping Master tables
        "shipping_master_curated",
        "shipping_master_raw",
        "order_register_rows",
        # System
        "sap_material_cache",
    ]

    for table in tables:
        db.execute(text(f"TRUNCATE TABLE {table} RESTART IDENTITY CASCADE;"))

    db.execute(text("SET session_replication_role = 'origin';"))
    db.commit()
