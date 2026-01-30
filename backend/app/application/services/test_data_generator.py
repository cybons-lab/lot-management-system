"""Test data generator service.

Refactored: Split into smaller modules for better maintainability.
"""

import logging

from sqlalchemy.orm import Session

from .test_data.calendar_wrapper import TestDataCalendar
from .test_data.calendars import generate_calendars
from .test_data.forecasts import generate_forecasts, generate_reservations
from .test_data.inbound import generate_inbound_plans
from .test_data.inventory import generate_lots
from .test_data.inventory_scenarios import generate_inventory_scenarios
from .test_data.masters import (
    generate_customer_items,
    generate_customers_and_delivery_places,
    generate_products,
    generate_suppliers,
    generate_warehouses,
)
from .test_data.orders import generate_orders
from .test_data.rpa_material_delivery import generate_rpa_material_delivery_data
from .test_data.sap import generate_sap_data
from .test_data.shipping_master import generate_shipping_master_data
from .test_data.smartread import generate_smartread_data
from .test_data.utils import clear_data
from .test_data.withdrawals import generate_withdrawals


# Re-export all functions for backward compatibility
__all__ = [
    "clear_data",
    "generate_warehouses",
    "generate_suppliers",
    "generate_customers_and_delivery_places",
    "generate_products",
    "generate_customer_items",
    "generate_lots",
    "generate_inventory_scenarios",
    "generate_forecasts",
    "generate_reservations",
    "generate_orders",
    "generate_all_test_data",
    "generate_withdrawals",
    "generate_inbound_plans",
    "generate_smartread_data",
    "generate_shipping_master_data",
    "generate_rpa_material_delivery_data",
    "generate_sap_data",
]

logger = logging.getLogger(__name__)


def generate_all_test_data(db: Session, options: object = None, progress_callback=None):
    # options: GenerateOptions (avoid circular import type hint if needed, or use object)
    if options is None:
        # Default fallback
        from .test_data.orchestrator import GenerateOptions

        options = GenerateOptions()

    try:
        if progress_callback:
            progress_callback(5, "Clearing old data...")
        clear_data(db)

        if progress_callback:
            progress_callback(10, "Generating Calendar data...")

        # Step 0: Generate Calendar Data
        generate_calendars(db, options)
        db.commit()  # Ensure data is committed before Wrapper loads it

        # Initialize Wrapper
        calendar = TestDataCalendar(db)

        if progress_callback:
            progress_callback(15, "Generating Masters (Warehouses, Suppliers, Customers, Items)...")
        warehouses = generate_warehouses(db, options)
        suppliers = generate_suppliers(db, options)
        customers, delivery_places = generate_customers_and_delivery_places(db, options)
        products = generate_products(db, suppliers, options)

        generate_customer_items(db, customers, products, suppliers, delivery_places, options)

        # Step 1: Generate forecasts and get totals
        if progress_callback:
            progress_callback(30, "Generating Forecasts...")
        products_with_forecast, forecast_totals = generate_forecasts(
            db, customers, products, delivery_places
        )

        # Step 2: Generate lots based on forecast totals
        if progress_callback:
            progress_callback(40, "Generating Inventory Lots...")
        generate_lots(db, products, warehouses, suppliers, forecast_totals)

        # Step 2.5: Generate inventory scenarios for UI/testing
        generate_inventory_scenarios(db)

        # Step 2.6: Generate RPA Material Delivery Note data
        if progress_callback:
            progress_callback(45, "Generating RPA Material Delivery Note data...")
        generate_rpa_material_delivery_data(db)

        # Step 3: Generate reservations (requires lots to exist)
        if progress_callback:
            progress_callback(50, "Generating Reservations...")
        generate_reservations(db)

        # Step 4: Generate orders (diverse types + reservations)
        if progress_callback:
            progress_callback(60, "Generating Orders (this may take a while)...")
        generate_orders(
            db, customers, products, products_with_forecast, delivery_places, options, calendar
        )

        # Step 5: Generate withdrawal history (requires lots and customers)
        if progress_callback:
            progress_callback(80, "Generating Withdrawal History...")
        generate_withdrawals(db, customers, delivery_places, options, calendar)

        # Step 6: Generate inbound plans and link past plans to lots
        if progress_callback:
            progress_callback(90, "Generating Inbound Plans...")
        generate_inbound_plans(db, products, suppliers, options, calendar)

        # Step 7: Generate SmartRead sample data
        if progress_callback:
            progress_callback(92, "Generating SmartRead Sample Data...")
        generate_smartread_data(db)

        # Step 8: Generate Shipping Master data (SmartReadと連動)
        if progress_callback:
            progress_callback(95, "Generating Shipping Master Data...")
        generate_shipping_master_data(db)

        # Step 9: Generate SAP integration data
        if progress_callback:
            progress_callback(98, "Generating SAP Integration Data...")
        generate_sap_data(db)

        db.commit()

        if progress_callback:
            progress_callback(100, "Completed!")
        return True
    except Exception:
        db.rollback()
        logger.exception("Error generating test data")
        raise
