"""Data migration: allocations → lot_reservations (P3 Phase 2).

This migration script converts existing allocations records to lot_reservations.
Run this once before dropping the allocations table.

Usage:
    cd backend
    uv run python -m scripts.migrate_allocations_to_reservations

Note:
    - Run with dry_run=True first to check for issues
    - Back up the database before running with dry_run=False
"""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.time_utils import utcnow
from app.database import SessionLocal
from app.infrastructure.persistence.models import Allocation
from app.infrastructure.persistence.models.lot_reservations_model import (
    LotReservation,
    ReservationSourceType,
    ReservationStatus,
)


def allocation_type_to_reservation_status(
    allocation_type: str,
    allocation_status: str,
) -> ReservationStatus:
    """Map allocation fields to ReservationStatus.

    Args:
        allocation_type: "soft" or "hard"
        allocation_status: "allocated", "provisional", "shipped", "cancelled"

    Returns:
        ReservationStatus enum value
    """
    if allocation_status == "cancelled":
        return ReservationStatus.RELEASED

    if allocation_type == "hard":
        return ReservationStatus.CONFIRMED

    if allocation_status == "provisional":
        return ReservationStatus.TEMPORARY

    return ReservationStatus.ACTIVE


def migrate_allocation_to_reservation(
    db: Session,
    allocation: Allocation,
    dry_run: bool = True,
) -> LotReservation | None:
    """Convert a single allocation to lot_reservation.

    Args:
        db: Database session
        allocation: Allocation to migrate
        dry_run: If True, don't actually create the reservation

    Returns:
        Created LotReservation or None if skipped/dry_run
    """
    # Skip if no lot_id (provisional allocations without lot)
    if allocation.lot_id is None:
        return None

    # Check if already migrated
    existing = (
        db.query(LotReservation)
        .filter(
            LotReservation.lot_id == allocation.lot_id,
            LotReservation.source_type == ReservationSourceType.ORDER,
            LotReservation.source_id == allocation.order_line_id,
        )
        .first()
    )

    if existing:
        # Already migrated, skip
        return None

    status = allocation_type_to_reservation_status(
        allocation.allocation_type or "soft",
        allocation.status or "allocated",
    )

    reservation = LotReservation(
        lot_id=allocation.lot_id,
        source_type=ReservationSourceType.ORDER,
        source_id=allocation.order_line_id,
        reserved_qty=allocation.allocated_quantity,
        status=status,
        created_at=allocation.created_at or utcnow(),
        confirmed_at=allocation.confirmed_at if status == ReservationStatus.CONFIRMED else None,
    )

    if not dry_run:
        db.add(reservation)

    return reservation


def migrate_all_allocations(dry_run: bool = True) -> dict:
    """Migrate all allocations to lot_reservations.

    Args:
        dry_run: If True, don't commit changes

    Returns:
        Statistics dict with counts
    """
    db: Session = SessionLocal()
    stats = {
        "total": 0,
        "migrated": 0,
        "skipped_no_lot": 0,
        "skipped_existing": 0,
        "errors": [],
    }

    try:
        allocations = db.execute(select(Allocation)).scalars().all()
        stats["total"] = len(allocations)

        for allocation in allocations:
            try:
                if allocation.lot_id is None:
                    stats["skipped_no_lot"] += 1
                    continue

                result = migrate_allocation_to_reservation(db, allocation, dry_run)
                if result:
                    stats["migrated"] += 1
                else:
                    stats["skipped_existing"] += 1

            except Exception as e:
                stats["errors"].append(
                    {
                        "allocation_id": allocation.id,
                        "error": str(e),
                    }
                )

        if not dry_run and stats["migrated"] > 0:
            db.commit()
            print(f"Committed {stats['migrated']} migrations")
        elif dry_run:
            print(f"DRY RUN: Would migrate {stats['migrated']} allocations")
            db.rollback()

    finally:
        db.close()

    return stats


def verify_migration_integrity(db: Session) -> list[dict]:
    """Verify that all allocations have corresponding reservations.

    Args:
        db: Database session

    Returns:
        List of mismatches
    """
    mismatches = []

    allocations = db.execute(select(Allocation)).scalars().all()

    for allocation in allocations:
        if allocation.lot_id is None:
            continue

        reservation = (
            db.query(LotReservation)
            .filter(
                LotReservation.lot_id == allocation.lot_id,
                LotReservation.source_type == ReservationSourceType.ORDER,
                LotReservation.source_id == allocation.order_line_id,
            )
            .first()
        )

        if not reservation:
            mismatches.append(
                {
                    "allocation_id": allocation.id,
                    "lot_id": allocation.lot_id,
                    "order_line_id": allocation.order_line_id,
                    "issue": "No corresponding reservation",
                }
            )
        elif reservation.reserved_qty != allocation.allocated_quantity:
            mismatches.append(
                {
                    "allocation_id": allocation.id,
                    "reservation_id": reservation.id,
                    "allocation_qty": float(allocation.allocated_quantity),
                    "reservation_qty": float(reservation.reserved_qty),
                    "issue": "Quantity mismatch",
                }
            )

    return mismatches


if __name__ == "__main__":
    import sys

    dry_run = "--execute" not in sys.argv

    print(f"{'DRY RUN' if dry_run else 'EXECUTING'} migration...")
    print("=" * 50)

    stats = migrate_all_allocations(dry_run=dry_run)

    print("\nResults:")
    print(f"  Total allocations: {stats['total']}")
    print(f"  Migrated: {stats['migrated']}")
    print(f"  Skipped (no lot): {stats['skipped_no_lot']}")
    print(f"  Skipped (existing): {stats['skipped_existing']}")
    print(f"  Errors: {len(stats['errors'])}")

    if stats["errors"]:
        print("\nErrors:")
        for err in stats["errors"][:10]:
            print(f"  - Allocation {err['allocation_id']}: {err['error']}")

    if dry_run:
        print("\nTo execute for real, run with --execute flag")
