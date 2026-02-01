import requests
import sys

base_url = "http://localhost:8000"
auth_url = f"{base_url}/api/auth/login"
reset_url = f"{base_url}/api/admin/reset-database"

try:
    # Login
    print("Logging in...")
    resp = requests.post(auth_url, json={"username": "admin", "password": "admin123"})
    if resp.status_code != 200:
        print(f"Login failed: {resp.status_code} {resp.text}")
        sys.exit(1)
    
    token = resp.json()["access_token"]
    print("Login successful.")

    # Reset Database
    print(f"Resetting database at {reset_url}...")
    headers = {"Authorization": f"Bearer {token}"}
    resp = requests.post(reset_url, headers=headers, json={}, timeout=60)
    
    print(f"Status: {resp.status_code}")
    print(f"Response: {resp.text}")

    if resp.status_code == 200:
        print("Database reset successful!")
    else:
        print("Database reset failed!")

except Exception as e:
    print(f"Error: {e}")
