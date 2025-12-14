"""Test data generator service.

Refactored: Split into smaller modules for better maintainability.
"""

from sqlalchemy.orm import Session

from .test_data.forecasts import generate_forecasts, generate_reservations
from .test_data.inventory import generate_lots
from .test_data.masters import (
    generate_customer_items,
    generate_customers_and_delivery_places,
    generate_products,
    generate_suppliers,
    generate_warehouses,
)
from .test_data.orders import generate_orders
from .test_data.utils import clear_data


# Re-export all functions for backward compatibility
__all__ = [
    "clear_data",
    "generate_warehouses",
    "generate_suppliers",
    "generate_customers_and_delivery_places",
    "generate_products",
    "generate_customer_items",
    "generate_lots",
    "generate_forecasts",
    "generate_reservations",
    "generate_orders",
    "generate_all_test_data",
]


def generate_all_test_data(db: Session):
    try:
        clear_data(db)

        warehouses = generate_warehouses(db)
        suppliers = generate_suppliers(db)
        customers, delivery_places = generate_customers_and_delivery_places(db)
        products = generate_products(db)

        generate_customer_items(db, customers, products, suppliers)

        # Step 1: Generate forecasts and get totals
        products_with_forecast, forecast_totals = generate_forecasts(
            db, customers, products, delivery_places
        )

        # Step 2: Generate lots based on forecast totals
        generate_lots(db, products, warehouses, suppliers, forecast_totals)

        # Step 3: Generate reservations (requires lots to exist)
        # TODO: Fix generate_reservations - currently causes f405 error
        # generate_reservations(db)

        # Step 4: Generate orders
        generate_orders(db, customers, products, products_with_forecast, delivery_places)

        return True
    except Exception as e:
        db.rollback()
        print(f"Error generating test data: {e}")
        raise e
