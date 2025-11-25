
import sys
import os
from datetime import date
from decimal import Decimal

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from app.db.session import SessionLocal
from app.models.inventory_models import Lot
from app.models.masters_models import Product, Warehouse

def debug_create_lot():
    db = SessionLocal()
    try:
        print("Starting debug_create_lot...")
        
        # Get a product and warehouse
        product = db.query(Product).first()
        warehouse = db.query(Warehouse).first()
        
        if not product or not warehouse:
            print("No product or warehouse found. Run generator to create masters first (or check if they exist).")
            # Create dummy if needed?
            # Assuming masters might exist from partial run?
            return

        print(f"Using Product: {product.id}, Warehouse: {warehouse.id}")

        lot = Lot(
            lot_number="DEBUG-LOT-001",
            product_id=product.id,
            warehouse_id=warehouse.id,
            received_date=date.today(),
            current_quantity=Decimal("100"),
            allocated_quantity=Decimal("0"),
            unit="pcs",
            status="active"
        )
        
        print("Adding lot...")
        db.add(lot)
        print("Committing...")
        db.commit()
        print(f"Lot created with ID: {lot.id}")
        
    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    debug_create_lot()
