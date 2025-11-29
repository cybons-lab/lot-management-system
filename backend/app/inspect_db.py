import os
import sys

from sqlalchemy import create_engine, inspect


# Add backend directory to path
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))


def inspect_table(table_name):
    print(f"Inspecting table: {table_name}")
    # Try localhost first
    db_url = "postgresql://admin:dev_password@localhost:5432/lot_management"
    engine = create_engine(db_url)
    inspector = inspect(engine)
    columns = inspector.get_columns(table_name)
    for column in columns:
        print(f"- {column['name']} ({column['type']})")


if __name__ == "__main__":
    inspect_table("product_uom_conversions")
    print("-" * 20)
    inspect_table("user_supplier_assignments")
