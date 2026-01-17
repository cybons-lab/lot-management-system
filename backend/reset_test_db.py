from sqlalchemy import create_engine, text


# Set explicit TEST DB URL
DATABASE_URL = "postgresql+psycopg2://testuser:testpass@localhost:5433/lot_management_test"


def reset_db():
    print(f"Connecting to {DATABASE_URL}...")
    engine = create_engine(DATABASE_URL)

    with engine.connect() as conn:
        print("Dropping all tables and views in public schema...")
        conn.execute(text("DROP SCHEMA public CASCADE;"))
        conn.execute(text("CREATE SCHEMA public;"))
        conn.commit()
        print("Schema reset complete.")


if __name__ == "__main__":
    reset_db()
