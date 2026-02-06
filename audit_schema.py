
import os
import sys
from sqlalchemy import create_engine, inspect
from sqlalchemy.orm import DeclarativeBase

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), "backend"))

from app.infrastructure.persistence.models.base_model import Base
import app.infrastructure.persistence.models # Trigger all imports

def check_mismatches():
    # Use TEST_DATABASE_URL
    db_url = os.getenv("TEST_DATABASE_URL", "postgresql+psycopg2://testuser:testpass@db-test:5432/lot_management_test")
    engine = create_engine(db_url)
    inspector = inspect(engine)
    
    mismatches = []
    
    for table_name, table in Base.metadata.tables.items():
        if table_name not in inspector.get_table_names():
            print(f"Table {table_name} missing in DB")
            continue
            
        columns_in_db = {c['name']: c for c in inspector.get_columns(table_name)}
        
        for name, column in table.columns.items():
            if name not in columns_in_db:
                mismatches.append(f"Column {table_name}.{name} missing in DB")
                continue
                
            db_col = columns_in_db[name]
            # Check nullability mismatch
            # model.nullable: True means NULL allowed, False means NOT NULL
            # db_col['nullable']: True means NULL allowed, False means NOT NULL
            if column.nullable != db_col['nullable']:
                mismatches.append(f"Nullability mismatch: {table_name}.{name} - Model: {column.nullable}, DB: {db_col['nullable']}")
    
    for m in mismatches:
        print(m)

if __name__ == "__main__":
    check_mismatches()
