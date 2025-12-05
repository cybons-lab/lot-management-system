from __future__ import annotations

from decimal import Decimal
from typing import NamedTuple

from app.models.inventory_models import Lot


class SoftAllocationResult(NamedTuple):
    lot_id: int
    quantity: Decimal
    priority: int


def allocate_soft_for_forecast(
    required_qty: Decimal,
    candidate_lots: list[Lot],
) -> list[SoftAllocationResult]:
    """
    Allocate lots for a forecast line using the "v0" algorithm.

    Algorithm:
    1. Sort lots by Expiry (ASC), Received (ASC), ID (ASC).
    2. Single Lot Fit: If any single lot has available_qty >= required_qty,
       pick the *first* such lot (respecting sort order) and allocate fully.
       (Priority: minimize splitting over strict FEFO).
    3. FEFO Split: If no single lot fits, stick to standard FEFO split.
       Allocate from sorted lots until required_qty is met.

    Args:
        required_qty: The quantity required by the forecast line.
        candidate_lots: List of available Lot objects.
                        NOTE: Function expects `lot.available_quantity` or equivalent logic
                        to be handled by caller or pre-calculated.
                        However, usually `lot` object has `current_quantity` and `allocated_quantity`.
                        This function calculates strictly based on (current - allocated).
                        If temporary allocation tracking is needed (e.g. within a loop),
                        candidate_lots should ideally be objects with updated state, or
                        we calculate assuming provided lots are fresh candidates.
                        **Assumption**: `lot._temp_allocated` might be used in the service layer Loop.
                        To make this function PURE, we should perhaps receive structs with "available_qty".
                        But to keep it simple with ORM models, we'll access properties, but be careful.

                        Actually, looking at previous `suggestion.py` logic, checks `_temp_allocated`.
                        To make this robust and reusable:
                        We will respect `_temp_allocated` if present on the Lot object.

    Returns:
        List of SoftAllocationResult.
    """
    if required_qty <= 0:
        return []

    # 1. Sort Candidates
    # Priorities: Expiry (None last? usually FEFO implies None is infinity or invalid. Postgres sorts asc nulls last usually)
    # Python sort: None comparison fails. We must handle None.
    # We assume valid dates or treat None as "far future".
    def sort_key(l: Lot):
        # (expiry_date, received_date, id)
        # Handle None expiry -> max date
        from datetime import date

        expiry = l.expiry_date or date.max
        received = l.received_date or date.max
        return (expiry, received, l.id)

    sorted_lots = sorted(candidate_lots, key=sort_key)

    # Calculate real availability for each lot once
    # We map lot_id -> available_qty
    lot_availability: dict[int, Decimal] = {}
    for lot in sorted_lots:
        allocated = lot.allocated_quantity
        if hasattr(lot, "_temp_allocated"):
            allocated += lot._temp_allocated  # type: ignore

        available = lot.current_quantity - allocated
        lot_availability[lot.id] = max(Decimal("0"), available)

    # Filter out empty lots for logic
    valid_lots = [l for l in sorted_lots if lot_availability[l.id] > 0]

    if not valid_lots:
        return []

    allocations: list[SoftAllocationResult] = []

    # 2. Single Lot Fit Strategy
    # Find the *first* lot in sorted order that can cover the WHOLE required_qty
    single_fit_lot = None
    for lot in valid_lots:
        if lot_availability[lot.id] >= required_qty:
            single_fit_lot = lot
            break  # Pick the first one we find

    if single_fit_lot:
        # Strategy A: Use this single lot
        allocations.append(
            SoftAllocationResult(
                lot_id=single_fit_lot.id,
                quantity=required_qty,
                priority=1,
            )
        )
        return allocations

    # 3. FEFO Split Strategy (Fallback)
    # If we are here, no single lot could cover the demand.
    # We must split across multiple lots in sorted order.
    remaining_needed = required_qty
    priority_counter = 1

    for lot in valid_lots:
        available = lot_availability[lot.id]
        if available <= 0:
            continue

        allocate_qty = min(remaining_needed, available)

        allocations.append(
            SoftAllocationResult(
                lot_id=lot.id,
                quantity=allocate_qty,
                priority=priority_counter,
            )
        )

        remaining_needed -= allocate_qty
        priority_counter += 1

        if remaining_needed <= 0:
            break

    return allocations
