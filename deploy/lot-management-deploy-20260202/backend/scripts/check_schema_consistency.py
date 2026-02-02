#!/usr/bin/env python3
"""Schema consistency checker.

Alembicマイグレーションとモデル定義、実際のDBスキーマの整合性をチェック。
"""

import sys
from pathlib import Path


# Add backend to path
backend_path = Path(__file__).parent.parent
sys.path.insert(0, str(backend_path))

from sqlalchemy import create_engine, inspect, text  # noqa: E402

from app.core.config import settings  # noqa: E402

# Import all models to ensure they're registered
from app.infrastructure.persistence.models import Base  # noqa: F401, E402


def check_schema_consistency():
    """Check consistency between SQLAlchemy models and actual DB schema."""
    print("=" * 80)
    print("Schema Consistency Check")
    print("=" * 80)

    # Create engine
    engine = create_engine(settings.DATABASE_URL)
    inspector = inspect(engine)

    # Get all table names from DB
    db_tables = set(inspector.get_table_names())
    print(f"\n📊 Database tables: {len(db_tables)}")

    # Get all table names from models
    model_tables = set(Base.metadata.tables.keys())
    print(f"📦 Model tables: {len(model_tables)}")

    # Find differences
    missing_in_db = model_tables - db_tables
    missing_in_models = db_tables - model_tables

    if missing_in_db:
        print(f"\n❌ Tables defined in models but missing in DB: {missing_in_db}")

    if missing_in_models:
        print(f"\n⚠️  Tables in DB but not in models: {missing_in_models}")

    # Check each table's columns
    print("\n" + "=" * 80)
    print("Column Consistency Check")
    print("=" * 80)

    issues_found = False

    for table_name in sorted(model_tables & db_tables):
        # Get columns from DB
        db_columns = {col["name"]: col for col in inspector.get_columns(table_name)}

        # Get columns from model
        model_table = Base.metadata.tables[table_name]
        model_columns = {col.name: col for col in model_table.columns}

        # Find differences
        missing_in_db_cols = set(model_columns.keys()) - set(db_columns.keys())
        missing_in_model_cols = set(db_columns.keys()) - set(model_columns.keys())

        if missing_in_db_cols or missing_in_model_cols:
            issues_found = True
            print(f"\n📋 Table: {table_name}")

            if missing_in_db_cols:
                print(f"  ❌ Columns in model but missing in DB: {missing_in_db_cols}")

            if missing_in_model_cols:
                print(f"  ⚠️  Columns in DB but missing in model: {missing_in_model_cols}")

    if not issues_found and not missing_in_db and not missing_in_models:
        print("\n✅ All tables and columns are consistent!")
    else:
        print("\n⚠️  Schema inconsistencies detected!")

    # Check views
    print("\n" + "=" * 80)
    print("View Check")
    print("=" * 80)

    with engine.connect() as conn:
        result = conn.execute(
            text(
                """
            SELECT table_name 
            FROM information_schema.views 
            WHERE table_schema = 'public'
            ORDER BY table_name
        """
            )
        )
        views = [row[0] for row in result]

    print(f"\n📊 Database views: {len(views)}")
    for view in views:
        print(f"  - {view}")

    # Expected views (from create_views.sql)
    expected_views = [
        "v_order_line_details",
        "v_lot_current_stock",
        "v_inventory_summary",
        "v_allocation_coverage",
        "v_forecast_demand_summary",
        "v_supplier_code_to_id",
        "v_warehouse_code_to_id",
    ]

    missing_views = set(expected_views) - set(views)
    if missing_views:
        print(f"\n⚠️  Expected views missing: {missing_views}")
    else:
        print("\n✅ All expected views exist!")

    print("\n" + "=" * 80)


if __name__ == "__main__":
    try:
        check_schema_consistency()
    except Exception as e:
        print(f"\n❌ Error: {e}")
        sys.exit(1)
