"""Soft allocation calculator for forecasts.

v3.0: Updated to accept LotCandidate (SSOT) instead of Lot model.
"""

from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from typing import TYPE_CHECKING


if TYPE_CHECKING:
    from app.domain.lot import LotCandidate


@dataclass
class SoftAllocationResult:
    """Result of a soft allocation to a lot."""

    lot_id: int
    quantity: Decimal
    priority: int


def allocate_soft_for_forecast(
    required_qty: Decimal,
    candidate_lots: list[LotCandidate],
    temp_allocations: dict[int, Decimal] | None = None,
) -> list[SoftAllocationResult]:
    """Allocate lots for a forecast line using the "v0" algorithm.

    Algorithm:
    1. Candidates are assumed to be pre-sorted by FEFO (from AllocationCandidateService).
    2. Single Lot Fit: If any single lot has available_qty >= required_qty,
       pick the *first* such lot (respecting sort order) and allocate fully.
       (Priority: minimize splitting over strict FEFO).
    3. FEFO Split: If no single lot fits, stick to standard FEFO split.
       Allocate from sorted lots until required_qty is met.

    Args:
        required_qty: The quantity required by the forecast line.
        candidate_lots: List of LotCandidate objects (pre-sorted by FEFO).
        temp_allocations: Optional dict mapping lot_id -> temporary allocated quantity.
                         Used to track allocations within a calculation session.

    Returns:
        List of SoftAllocationResult.
    """
    if temp_allocations is None:
        temp_allocations = {}

    if required_qty <= 0:
        return []

    # Calculate real availability for each lot
    # LotCandidate.available_qty is the base availability
    # temp_allocations contains offsets from previous allocations in this session
    lot_availability: dict[int, Decimal] = {}
    for lot in candidate_lots:
        temp_offset = temp_allocations.get(lot.lot_id, Decimal("0"))
        available = Decimal(str(lot.available_qty)) - temp_offset
        lot_availability[lot.lot_id] = max(Decimal("0"), available)

    # Filter out empty lots
    valid_lots = [lot for lot in candidate_lots if lot_availability[lot.lot_id] > 0]

    if not valid_lots:
        return []

    allocations: list[SoftAllocationResult] = []

    # Single Lot Fit Strategy
    # Find the *first* lot in sorted order that can cover the WHOLE required_qty
    single_fit_lot = None
    for lot in valid_lots:
        if lot_availability[lot.lot_id] >= required_qty:
            single_fit_lot = lot
            break

    if single_fit_lot:
        # Strategy A: Use this single lot
        allocations.append(
            SoftAllocationResult(
                lot_id=single_fit_lot.lot_id,
                quantity=required_qty,
                priority=1,
            )
        )
        return allocations

    # FEFO Split Strategy (Fallback)
    remaining_needed = required_qty
    priority_counter = 1

    for lot in valid_lots:
        available = lot_availability[lot.lot_id]
        if available <= 0:
            continue

        allocate_qty = min(remaining_needed, available)

        allocations.append(
            SoftAllocationResult(
                lot_id=lot.lot_id,
                quantity=allocate_qty,
                priority=priority_counter,
            )
        )

        remaining_needed -= allocate_qty
        priority_counter += 1

        if remaining_needed <= 0:
            break

    return allocations
