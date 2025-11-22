import os
import sys


# Add backend to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from app.api.routes.allocations.allocation_suggestions_router import router
    print("SUCCESS: Import successful")
except ImportError as e:
    print(f"ERROR: {e}")
except Exception as e:
    print(f"ERROR: {e}")
