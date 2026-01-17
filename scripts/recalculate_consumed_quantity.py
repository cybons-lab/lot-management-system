#!/usr/bin/env python3
"""Recalculate lot_receipts.consumed_quantity from withdrawal_lines."""

import argparse
import sys
from pathlib import Path

from sqlalchemy import text

REPO_ROOT = Path(__file__).resolve().parents[1]
BACKEND_ROOT = REPO_ROOT / "backend"
sys.path.append(str(BACKEND_ROOT))

from app.core.database import SessionLocal  # noqa: E402


CHECK_SQL = """
SELECT
    lr.id,
    lr.consumed_quantity AS stored_consumed_quantity,
    COALESCE(wl_sum.total_withdrawn, 0) AS expected_consumed_quantity
FROM lot_receipts lr
LEFT JOIN (
    SELECT wl.lot_receipt_id, SUM(wl.quantity) AS total_withdrawn
    FROM withdrawal_lines wl
    JOIN withdrawals wd ON wl.withdrawal_id = wd.id
    WHERE wd.cancelled_at IS NULL
    GROUP BY wl.lot_receipt_id
) wl_sum ON wl_sum.lot_receipt_id = lr.id
WHERE lr.consumed_quantity != COALESCE(wl_sum.total_withdrawn, 0)
ORDER BY lr.id
LIMIT :limit;
"""

RECALC_SQL = """
UPDATE lot_receipts lr
SET consumed_quantity = COALESCE(wl_sum.total_withdrawn, 0)
FROM (
    SELECT wl.lot_receipt_id, SUM(wl.quantity) AS total_withdrawn
    FROM withdrawal_lines wl
    JOIN withdrawals wd ON wl.withdrawal_id = wd.id
    WHERE wd.cancelled_at IS NULL
    GROUP BY wl.lot_receipt_id
) wl_sum
WHERE lr.id = wl_sum.lot_receipt_id;
"""

RESET_ZERO_SQL = """
UPDATE lot_receipts lr
SET consumed_quantity = 0
WHERE NOT EXISTS (
    SELECT 1
    FROM withdrawal_lines wl
    JOIN withdrawals wd ON wl.withdrawal_id = wd.id
    WHERE wd.cancelled_at IS NULL
      AND wl.lot_receipt_id = lr.id
);
"""


def run_check(limit: int) -> bool:
    """Return True if mismatches exist."""
    with SessionLocal() as db:
        rows = db.execute(text(CHECK_SQL), {"limit": limit}).fetchall()

    if not rows:
        print("No mismatches found.")
        return False

    print(f"Found {len(rows)} mismatches (showing up to {limit}).")
    for row in rows:
        print(
            f"lot_receipt_id={row.id} stored={row.stored_consumed_quantity} "
            f"expected={row.expected_consumed_quantity}"
        )
    return True


def apply_recalc() -> None:
    with SessionLocal() as db:
        db.execute(text(RECALC_SQL))
        db.execute(text(RESET_ZERO_SQL))
        db.commit()


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Recalculate consumed_quantity from withdrawal_lines."
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Apply recalculation updates (default is check-only).",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=20,
        help="Number of mismatches to display in check mode.",
    )
    args = parser.parse_args()

    mismatches = run_check(args.limit)
    if not args.apply:
        if mismatches:
            print("Run with --apply to update consumed_quantity.")
        return

    apply_recalc()
    print("Recalculation applied.")


if __name__ == "__main__":
    main()
