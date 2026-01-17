import sys
from sqlalchemy import create_engine, text

# Test DB URL
DATABASE_URL = "postgresql://testuser:testpass@localhost:5433/lot_management_test"

def main():
    try:
        engine = create_engine(DATABASE_URL)
        with engine.connect() as conn:
            print("Connected to DB.")
            with open("backend/sql/views/create_views.sql", "r") as f:
                sql_content = f.read()
            
            print("Read create_views.sql.")
            print("Executing SQL statements sequentially...")
            
            # Split by semicolon but ignore comments/strings if possible. 
            # For this simple file, splitting by ";\n" or just ";" might be enough 
            # provided we handle empty statements.
            statements = sql_content.split(";")
            
            for i, statement in enumerate(statements):
                statement = statement.strip()
                if not statement:
                    continue
                    
                try:
                    # print(f"Executing statement {i+1}...")
                    conn.execute(text(statement))
                except Exception as e:
                    print(f"ERROR at statement {i+1}:")
                    print(statement[:200] + "...")
                    print(f"Exception: {e}")
                    # Don't exit, try to continue or break depending on need. 
                    # Usually we want to know the first error.
                    sys.exit(1)
            
            conn.commit()
            print("Successfully executed create_views.sql.")
    except Exception as e:
        print(f"ERROR: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
