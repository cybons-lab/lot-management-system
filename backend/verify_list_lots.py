import sys
import os
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent
sys.path.append(str(backend_dir))

from app.core.database import SessionLocal
from app.application.services.inventory.lot_service import LotService

def test_list_lots():
        # Inspect schema
        from sqlalchemy import text
        print("Checking v_lot_details schema...")
        result = db.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'v_lot_details'"))
        columns = [row[0] for row in result]
        print(f"Columns in v_lot_details: {columns}")
        if 'primary_user_id' not in columns:
            print("CRITICAL ERROR: primary_user_id column MISSING in view!")
        else:
            print("OK: primary_user_id column exists.")

        service = LotService(db)
        print("Calling list_lots()...")
        lots = service.list_lots(limit=10)
        print(f"Successfully retrieved {len(lots)} lots.")
        for lot in lots:
            print(f"Lot: {lot.lot_number}, Product: {lot.product_name}")
    except Exception as e:
        print(f"FAILED: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    test_list_lots()
