#!/usr/bin/env python3
"""Generate comprehensive test inventory data for all scenarios."""

from __future__ import annotations

import os
import sys


sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from dotenv import load_dotenv  # noqa: E402


load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

from app.application.services.test_data.inventory_scenarios import (  # noqa: E402
    generate_inventory_scenarios,
)
from app.core.database import get_db  # noqa: E402


def main() -> None:
    db = next(get_db())
    try:
        generate_inventory_scenarios(db, show_summary=True)
        print("\n✅ Inventory test data generation completed!")
    except Exception as exc:
        db.rollback()
        print(f"\n❌ Error generating inventory scenarios: {exc}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
