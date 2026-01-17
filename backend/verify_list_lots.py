import sys
from pathlib import Path

from sqlalchemy import text


# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent
sys.path.append(str(backend_dir))

from app.application.services.inventory.lot_service import LotService  # noqa: E402
from app.core.database import SessionLocal  # noqa: E402


def test_list_lots():
    db = SessionLocal()
    try:
        # Inspect schema
        # Inspect schema - Full Check
        print("Checking v_lot_details schema...")
        result = db.execute(
            text(
                "SELECT column_name FROM information_schema.columns WHERE table_name = 'v_lot_details'"
            )
        )
        actual_columns = set([row[0] for row in result])

        # Expected columns from VLotDetails model
        expected_columns = {
            "lot_id",
            "lot_number",
            "product_id",
            "maker_part_code",
            "product_name",
            "warehouse_id",
            "warehouse_code",
            "warehouse_name",
            "supplier_id",
            "supplier_code",
            "supplier_name",
            "received_date",
            "expiry_date",
            "received_quantity",
            "remaining_quantity",
            "allocated_quantity",
            "locked_quantity",
            "available_quantity",
            "unit",
            "status",
            "lock_reason",
            "days_to_expiry",
            "temporary_lot_key",
            "primary_user_id",
            "primary_username",
            "primary_user_display_name",
            "product_deleted",
            "warehouse_deleted",
            "supplier_deleted",
            "created_at",
            "updated_at",
        }

        missing_cols = expected_columns - actual_columns
        if missing_cols:
            print(f"CRITICAL ERROR: Missing columns in view: {missing_cols}")
        else:
            print("OK: All expected columns exist in view.")

        # Simulate detailed list_lots call
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
