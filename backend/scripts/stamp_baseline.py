import os
import sys

from sqlalchemy import create_engine, text


# Add backend directory to sys.path to import app
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

try:
    from app.core.config import settings

    database_url = str(settings.DATABASE_URL)
except ImportError:
    print(
        "Error: Could not import settings. Run this script from the project root or backend directory."
    )
    sys.exit(1)

NEW_REVISION = "baseline_2026_01_27"


def stamp_baseline():
    print(f"Target Database: {database_url.split('@')[-1]}")  # Hide credentials
    print(f"Setting alembic_version to: {NEW_REVISION}")

    engine = create_engine(database_url)

    with engine.begin() as connection:
        # Check if table exists
        check_table = connection.execute(
            text(
                "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'alembic_version')"
            )
        ).scalar()

        if not check_table:
            print("Creating alembic_version table...")
            connection.execute(
                text("CREATE TABLE alembic_version (version_num VARCHAR(32) PRIMARY KEY)")
            )
            connection.execute(
                text(f"INSERT INTO alembic_version (version_num) VALUES ('{NEW_REVISION}')")
            )
        else:
            # Check current version
            current = connection.execute(text("SELECT version_num FROM alembic_version")).scalar()
            print(f"Current version in DB: {current}")

            connection.execute(text(f"UPDATE alembic_version SET version_num = '{NEW_REVISION}'"))

    print("Successfully stamped the database baseline.")


if __name__ == "__main__":
    stamp_baseline()
