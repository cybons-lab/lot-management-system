"""Soft allocation calculator for forecasts.

v3.1: Delegated logic to app.domain.allocation.calculator (Clean Architecture).
"""

from __future__ import annotations

from dataclasses import dataclass, replace
from datetime import date
from decimal import Decimal
from typing import TYPE_CHECKING

from app.domain.allocation import AllocationRequest, calculate_allocation


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
    """Allocate lots for a forecast line using the unified domain calculator.

    Uses 'single_lot_fit' strategy via AllocationRequest.

    Args:
        required_qty: The quantity required by the forecast line.
        candidate_lots: List of LotCandidate objects (pre-sorted by FEFO).
        temp_allocations: Optional dict mapping lot_id -> temporary allocated quantity.

    Returns:
        List of SoftAllocationResult.
    """
    if temp_allocations is None:
        temp_allocations = {}

    if required_qty <= 0:
        return []

    # Adjust candidates available quantity based on temp_allocations
    # We create modified copies of candidates to pass to the pure function
    adjusted_candidates: list[LotCandidate] = []

    for lot in candidate_lots:
        offset = temp_allocations.get(lot.lot_id, Decimal("0"))
        # Use Decimal for calculation, but LotCandidate expects float for now
        real_avail_dec = Decimal(str(lot.available_qty)) - offset

        # Only include if actually available
        if real_avail_dec > Decimal("0"):
            # Create a copy with adjusted availability
            new_lot = replace(lot, available_qty=float(real_avail_dec))
            adjusted_candidates.append(new_lot)

    if not adjusted_candidates:
        return []

    # Create request for domain calculator
    request = AllocationRequest(
        order_line_id=0,  # Dummy ID for forecast calculation
        required_quantity=required_qty,
        reference_date=date.today(),
        allow_partial=True,
        strategy="single_lot_fit",
    )

    # Execute calculation
    result = calculate_allocation(request, adjusted_candidates)

    # Convert domain result to SoftAllocationResult
    allocations: list[SoftAllocationResult] = []
    for i, decision in enumerate(result.allocated_lots):
        # allocated_lots only contains adopted decisions with valid lot_id
        if decision.lot_id is not None and decision.allocated_qty > 0:
            allocations.append(
                SoftAllocationResult(
                    lot_id=decision.lot_id,
                    quantity=decision.allocated_qty,
                    priority=i + 1,
                )
            )

    return allocations
