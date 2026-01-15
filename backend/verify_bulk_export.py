import sys
from pathlib import Path


# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent
sys.path.append(str(backend_dir))

from app.core.database import SessionLocal  # noqa: E402
from app.presentation.api.routes.admin.bulk_export_router import (  # noqa: E402
    EXPORT_TARGETS,
    _get_export_data,
)


def verify_bulk_export():
    print("Connecting to database...")
    db = SessionLocal()

    print("\n--- Verifying Bulk Export Targets ---\n")

    failed_targets = []

    for target_def in EXPORT_TARGETS:
        key = target_def["key"]
        print(f"Checking target: {key} ({target_def['name']})... ", end="")

        try:
            data, filename = _get_export_data(db, key)
            print(f"OK ({len(data)} records)")
        except Exception as e:
            print("FAILED!")
            print(f"  Error: {e}")
            import traceback

            traceback.print_exc()
            failed_targets.append(key)

    print("\n--- Verification Report ---")

    if not failed_targets:
        print("\n✅ SUCCESS: All export targets are working.")
    else:
        print(f"\n❌ FAILURE: {len(failed_targets)} targets failed.")
        print(f"Failed targets: {failed_targets}")

    db.close()


if __name__ == "__main__":
    verify_bulk_export()
