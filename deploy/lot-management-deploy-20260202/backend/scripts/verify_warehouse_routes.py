import os
import sys


# Adds backend directory to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.infrastructure.persistence.models.masters_models import WarehouseDeliveryRoute


def verify_warehouse_routes():
    db: Session = SessionLocal()
    try:
        # Fetch directly using SQLAlchemy to check relationship
        route = db.query(WarehouseDeliveryRoute).first()
        if not route:
            print("No WarehouseDeliveryRoutes found. Skipping verification.")
            return

        print(f"Found route ID: {route.id}")

        # Check supplier_item relationship
        if hasattr(route, "supplier_item"):
            print("route.supplier_item exists.")
            if route.supplier_item:
                print(f"Supplier Item Name: {route.supplier_item.display_name}")
            else:
                print("route.supplier_item is None.")
        else:
            print("ERROR: route.supplier_item does NOT exist.")

        # Check product_group (should NOT exist or should be synonym)
        # However, checking object attribute directly.

        # Simulate router logic
        try:
            # We cannot easily call the router function directly because it relies on Depends/FastAPI context if not careful,
            # but list_routes uses db session passed in.
            # Let's try calling the logic that was crashing.

            response_item = {
                "id": route.id,
                # ... other fields ignored for this test ...
                "product_name": route.supplier_item.display_name if route.supplier_item else None,
                "maker_part_code": route.supplier_item.maker_part_no
                if route.supplier_item
                else None,
            }
            print("Router logic simulation passed.")
            print(f"Response Item Stub: {response_item}")

        except AttributeError as e:
            print(f"Router logic FAILED with AttributeError: {e}")
        except Exception as e:
            print(f"Router logic FAILED with {type(e).__name__}: {e}")

    finally:
        db.close()


if __name__ == "__main__":
    verify_warehouse_routes()
