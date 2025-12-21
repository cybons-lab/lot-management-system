import os
import sys

from sqlalchemy import create_engine, text


# Add backend directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import app.infrastructure.persistence.models  # noqa: F401, E402
from tests.db_utils import apply_views_sql, create_core_tables  # noqa: E402


def init_single_db(db_url):
    """Initialize a single database."""
    print(f"Initializing database: {db_url}")

    # Create database if not exists (needs connection to default db)
    # Extract db name
    base_url = db_url.rsplit("/", 1)[0]
    db_name = db_url.rsplit("/", 1)[1]

    # Connect to postgres db to create new db
    postgres_url = f"{base_url}/postgres"
    engine_pg = create_engine(postgres_url, isolation_level="AUTOCOMMIT")

    with engine_pg.connect() as conn:
        # Check if db exists
        result = conn.execute(text(f"SELECT 1 FROM pg_database WHERE datname = '{db_name}'"))
        if not result.scalar():
            print(f"Creating database {db_name}...")
            conn.execute(text(f"CREATE DATABASE {db_name}"))

    engine_pg.dispose()

    # Now connect to the target db
    engine = create_engine(db_url)

    # Create tables
    print(f"Creating tables in {db_name}...")
    create_core_tables(engine)

    # Create views
    print(f"Creating views in {db_name}...")
    apply_views_sql(engine)
    print(f"Database {db_name} initialization completed successfully.")
    engine.dispose()


def init_test_dbs():
    """Initialize test databases."""
    base_db_url = os.getenv(
        "TEST_DATABASE_URL",
        "postgresql+psycopg2://testuser:testpass@localhost:5433/lot_management_test",
    )

    # Only initialize the main test db
    db_urls = [base_db_url]

    # Initialize databases
    # Use Pool even for single DB to keep the logic simple or just call directly
    for db_url in db_urls:
        init_single_db(db_url)


if __name__ == "__main__":
    init_test_dbs()
