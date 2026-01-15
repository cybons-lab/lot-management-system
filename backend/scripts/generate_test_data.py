#!/usr/bin/env python3
"""
Test Data Generation Script.

This script invokes the application's test data generator service.
It ensures that the command-line script and the Admin UI use the EXACT same logic
for generating test data.
"""

import os
import sys


# Ensure app module is importable
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from dotenv import load_dotenv


load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

from app.application.services.test_data_generator import generate_all_test_data  # noqa: E402
from app.core.database import SessionLocal  # noqa: E402


def main():
    print("=" * 60)
    print("Test Data Generator (via App Service)")
    print("=" * 60)

    db = SessionLocal()
    try:
        print("🚀 Starting generation...")
        result = generate_all_test_data(db)
        if result:
            print("\n✅ Test data generation completed successfully!")
            print("   (Data generated via app.application.services.test_data_generator)")
        else:
            print("\n⚠️ Generation finished but returned False.")
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback

        traceback.print_exc()
    finally:
        db.close()


if __name__ == "__main__":
    main()
