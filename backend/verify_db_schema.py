import sys
from pathlib import Path


# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent
sys.path.append(str(backend_dir))

from sqlalchemy import create_engine, inspect  # noqa: E402

from app.core.config import settings  # noqa: E402

# Import all models to ensure they are registered with Base.metadata
# (Assuming models are imported in app/infrastructure/persistence/models/__init__.py)
from app.infrastructure.persistence.models import Base  # noqa: E402


def verify_database_schema():
    print("Connecting to database...")
    # Use settings for connection string
    db_url = settings.DATABASE_URL
    if not db_url:
        print("FAILED: settings.DATABASE_URL is not set.")
        return

    try:
        engine = create_engine(str(db_url))
        connection = engine.connect()
        inspector = inspect(engine)
        print("Connected.")
    except Exception as e:
        print(f"FAILED to connect to database: {e}")
        return

    print("\n--- Verifying Database Schema ---\n")

    # Get all tables in the database
    db_table_names = set(inspector.get_table_names())
    # Also get views if possible, depending on dialect, inspector might return them in get_table_names or need get_view_names
    try:
        db_view_names = set(inspector.get_view_names())
        db_all_names = db_table_names.union(db_view_names)
    except Exception:
        # Some dialects/drivers might not support get_view_names easily or raise error
        db_all_names = db_table_names

    print(f"Total tables/views in DB: {len(db_all_names)}")

    # Iterate over all models registered in Base
    # Base.registry.mappers contains all mapped classes

    missing_tables = []
    missing_columns = []

    # We can iterate over Base.metadata.tables which maps table_name -> Table object
    # But checking mapped classes is often better to link back to Model name

    # Let's verify based on Base.metadata.tables to ensure we catch everything defined in SQLAlchemy
    for table_name, table in Base.metadata.tables.items():
        print(f"Checking table/view: {table_name} ... ", end="")

        if table_name not in db_all_names:
            print("MISSING!")
            missing_tables.append(table_name)
            continue

        # Check columns
        db_columns = inspector.get_columns(table_name)
        db_column_names = {col["name"] for col in db_columns}

        model_column_names = {col.name for col in table.columns}

        missing_in_db = model_column_names - db_column_names

        if missing_in_db:
            print(f"INCOMPLETE! Missing columns: {missing_in_db}")
            missing_columns.append((table_name, missing_in_db))
        else:
            print("OK")

    print("\n--- Verification Report ---")

    if not missing_tables and not missing_columns:
        print("\n✅ SUCCESS: All defined models and columns exist in the database.")
    else:
        print("\n❌ FAILURE: Schema discrepancies found.")

        if missing_tables:
            print(f"\nMissing Tables/Views ({len(missing_tables)}):")
            for t in missing_tables:
                print(f"  - {t}")

        if missing_columns:
            print(f"\nTables with Missing Columns ({len(missing_columns)}):")
            for t, cols in missing_columns:
                print(f"  - {t}: {cols}")

    connection.close()


if __name__ == "__main__":
    verify_database_schema()
