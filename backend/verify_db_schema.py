import os

from sqlalchemy import create_engine, inspect


DATABASE_URL = os.getenv(
    "DATABASE_URL", "postgresql://admin:dev_password@localhost:5432/lot_management"
)
engine = create_engine(DATABASE_URL)
inspector = inspect(engine)

print("--- Check lot_receipts columns ---")
try:
    columns = inspector.get_columns("lot_receipts")
    col_names = [c["name"] for c in columns]
    print(f"Columns: {col_names}")
    print(f"origin_type exists: {'origin_type' in col_names}")
    print(f"shipping_date exists: {'shipping_date' in col_names}")
except Exception as e:
    print(f"Error checking lot_receipts: {e}")

print("\n--- Check v_lot_details columns ---")
try:
    columns = inspector.get_columns("v_lot_details")
    col_names = [c["name"] for c in columns]
    print(f"Columns: {col_names}")
    print(f"origin_type exists: {'origin_type' in col_names}")
except Exception as e:
    print(f"Error checking v_lot_details: {e}")
