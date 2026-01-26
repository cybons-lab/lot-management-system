
import requests
import sys
import time
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# DB Connection (Assuming default dev settings)
DATABASE_URL = "postgresql://admin:admin@localhost:5432/lot_management"
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

API_BASE = "http://localhost:8000/api/v1"

def set_maintenance_mode(enabled: bool):
    db = SessionLocal()
    try:
        val = "true" if enabled else "false"
        db.execute(text(f"UPDATE system_configs SET config_value = '{val}' WHERE config_key = 'maintenance_mode'"))
        db.commit()
        print(f"Maintenance mode set to: {val}")
    finally:
        db.close()

def check_endpoint(url):
    try:
        response = requests.get(url)
        print(f"GET {url} -> Status: {response.status_code}")
        return response.status_code
    except Exception as e:
        print(f"Failed to connect: {e}")
        return None

def test_maintenance():
    print("--- Starting Maintenance Mode Verification ---")
    
    # 1. Ensure Maintenance is OFF
    set_maintenance_mode(False)
    time.sleep(1) # wait for potential cache clearing if any (though middleware reads DB directly)
    
    code = check_endpoint(f"{API_BASE}/products")
    # Should be 401 (Unauthorized) or 200, but NOT 503
    if code == 503:
        print("FAIL: Got 503 when maintenance is OFF")
        sys.exit(1)
    
    # 2. Turn Maintenance ON
    set_maintenance_mode(True)
    time.sleep(1)
    
    # 3. Check generic endpoint (should fail)
    code = check_endpoint(f"{API_BASE}/products")
    if code != 503:
        print(f"FAIL: Expected 503, got {code}")
        sys.exit(1)
    print("SUCCESS: Got 503 as expected for protected endpoint")

    # 4. Check whitelist endpoints (health/login)
    # Assuming health is at /health or /api/health as per middleware
    # Middleware check: request.url.path.startswith("/health")
    # So http://localhost:8000/health
    code = check_endpoint("http://localhost:8000/health")
    if code == 503:
         print(f"FAIL: Health check blocked! Got {code}")
    else:
         print(f"SUCCESS: Health check allowed (Status {code})")

    # 5. Restore OFF
    set_maintenance_mode(False)
    print("--- Verification Complete ---")

if __name__ == "__main__":
    test_maintenance()
