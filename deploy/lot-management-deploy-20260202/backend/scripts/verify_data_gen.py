import logging
import os
import sys


# Add backend directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.application.services.test_data.orchestrator import GenerateOptions
from app.application.services.test_data_generator import generate_all_test_data
from app.core.database import SessionLocal


# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def verify_generation():
    print("Starting test data generation verification...")
    db = SessionLocal()
    try:
        options = GenerateOptions(scale="small", mode="strict", history_months=1)

        def progress_cb(progress, message):
            print(f"[{progress}%] {message}")

        success = generate_all_test_data(db, options=options, progress_callback=progress_cb)

        if success:
            print("\n✅ Verification successful! Test data generated without errors.")
        else:
            print("\n❌ Verification failed! Generation returned False.")
            sys.exit(1)

    except Exception as e:
        print(f"\n❌ Verification failed! An error occurred: {e}")
        import traceback

        traceback.print_exc()
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    verify_generation()
