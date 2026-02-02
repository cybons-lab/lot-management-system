import sys
import os
from sqlalchemy import text, create_engine
from dotenv import load_dotenv

# Add backend dir to path to import settings
sys.path.append(os.path.join(os.getcwd(), "backend"))

# Load .env before importing settings
load_dotenv(os.path.join(os.getcwd(), "backend", ".env"))

from app.core.config import settings

def main():
    db_url = settings.DATABASE_URL
    print(f"Connecting to {db_url}")
    engine = create_engine(db_url)
    
    with open("backend/recreate_inventory_views.sql", "r", encoding="utf-8") as f:
        sql_content = f.read()
    
    # Split by semicolon to execute one by one (rudimentary parsing)
    # Better: use a proper SQL parser or just execute the whole block if engine supports it.
    # PostgreSQL supports multi-statement strings in many drivers.
    
    with engine.begin() as conn:
        print("Executing SQL...")
        # lot_receipts has many statements, let's try executing as one block.
        # But we need to handle comments and potential issues.
        # Actually, conn.execute(text(sql_content)) should work for Postgres.
        conn.execute(text(sql_content))
        print("Successfully recreated views.")

if __name__ == "__main__":
    main()
