import sys
import os

# Add backend directory to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from app.services import test_data_generator
    print("Successfully imported test_data_generator")
except ImportError as e:
    print(f"Failed to import test_data_generator: {e}")
    sys.exit(1)

expected_attributes = [
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

missing = []
for attr in expected_attributes:
    if not hasattr(test_data_generator, attr):
        missing.append(attr)

if missing:
    print(f"Missing attributes in test_data_generator: {missing}")
    sys.exit(1)
else:
    print("All expected attributes are present.")
