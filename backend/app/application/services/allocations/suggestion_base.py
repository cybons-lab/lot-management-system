"""Base class and shared utilities for allocation suggestion services.

v3.0: Uses AllocationCandidateService (SSOT) for candidate fetching.
"""

from dataclasses import dataclass, field
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy.orm import Session

from app.application.services.allocations.candidate_service import (
    AllocationCandidateService,
)
from app.domain.allocation_policy import AllocationPolicy, LockMode
from app.domain.lot import LotCandidate
from app.infrastructure.persistence.models.inventory_models import AllocationSuggestion
from app.presentation.schemas.allocations.allocation_suggestions_schema import (
    AllocationGap,
    AllocationStatsPerKey,
    AllocationStatsSummary,
)


if TYPE_CHECKING:
    from app.infrastructure.persistence.models.forecast_models import ForecastCurrent


@dataclass
class ProcessingResult:
    """Result of processing forecasts for allocation suggestions."""

    suggestions: list[AllocationSuggestion] = field(default_factory=list)
    stats_agg: dict[tuple, dict] = field(default_factory=dict)
    total_forecast: Decimal = field(default_factory=lambda: Decimal("0"))
    total_allocated: Decimal = field(default_factory=lambda: Decimal("0"))
    total_shortage: Decimal = field(default_factory=lambda: Decimal("0"))


class AllocationSuggestionBase:
    """Base class for allocation suggestion services with shared utilities."""

    def __init__(self, db: Session):
        """Initialize with database session."""
        self.db = db
        self._candidate_service = AllocationCandidateService(db)

    def _fetch_available_lots(self, supplier_item_ids: list[int]) -> dict[int, list[LotCandidate]]:
        """Fetch available lots for given products, sorted by FEFO.

        v3.0: Delegates to AllocationCandidateService (SSOT).
        """
        return self._candidate_service.get_candidates_for_products(
            supplier_item_ids=supplier_item_ids,
            policy=AllocationPolicy.FEFO,
            lock_mode=LockMode.NONE,
            exclude_expired=True,
            exclude_locked=False,
        )

    def _process_forecasts(
        self,
        forecasts: list["ForecastCurrent"],
        lots_by_product: dict[int, list[LotCandidate]],
        source: str,
    ) -> ProcessingResult:
        """Process forecasts and generate allocation suggestions using FEFO.

        Args:
            forecasts: List of forecast records to process
            lots_by_product: Available lots grouped by product_group_id (LotCandidate)
            source: Source identifier for suggestions (e.g., "forecast_import", "group_regenerate")

        Returns:
            ProcessingResult with suggestions, stats aggregation, and totals
        """
        from app.application.services.allocations.allocator import allocate_soft_for_forecast

        result = ProcessingResult()
        temp_allocations: dict[int, Decimal] = {}

        for f in forecasts:
            needed = f.forecast_quantity
            result.total_forecast += needed

            allocated_for_row: Decimal = Decimal("0")
            lots = lots_by_product.get(f.supplier_item_id, [])

            alloc_results = allocate_soft_for_forecast(needed, lots, temp_allocations)

            for res in alloc_results:
                suggestion = AllocationSuggestion(
                    forecast_period=f.forecast_period,
                    forecast_id=f.id,
                    customer_id=f.customer_id,
                    delivery_place_id=f.delivery_place_id,
                    product_group_id=f.supplier_item_id,
                    lot_id=res.lot_id,
                    quantity=res.quantity,
                    priority=res.priority,
                    allocation_type="soft",
                    source=source,
                )
                result.suggestions.append(suggestion)

                needed -= res.quantity
                allocated_for_row += res.quantity

                current_temp = temp_allocations.get(res.lot_id, Decimal("0"))
                temp_allocations[res.lot_id] = current_temp + res.quantity

            shortage = max(Decimal("0"), needed)
            result.total_shortage += shortage
            result.total_allocated += allocated_for_row

            # Aggregate stats
            key = (f.customer_id, f.delivery_place_id, f.supplier_item_id, f.forecast_period)
            if key not in result.stats_agg:
                result.stats_agg[key] = {
                    "forecast_quantity": Decimal("0"),
                    "allocated_quantity": Decimal("0"),
                    "shortage_quantity": Decimal("0"),
                }
            result.stats_agg[key]["forecast_quantity"] += f.forecast_quantity
            result.stats_agg[key]["allocated_quantity"] += allocated_for_row
            result.stats_agg[key]["shortage_quantity"] += shortage

        return result


def finalize_stats_and_gaps(
    stats_agg: dict[tuple, dict],
) -> tuple[list[AllocationStatsPerKey], list[AllocationGap]]:
    """Finalize stats and gaps from aggregated data.

    Args:
        stats_agg: Aggregated stats by key

    Returns:
        Tuple of (stats_list, gaps_list)
    """
    stats_list: list[AllocationStatsPerKey] = []
    gaps_list: list[AllocationGap] = []

    for key, data in stats_agg.items():
        customer_id, delivery_place_id, product_group_id, forecast_period = key
        stats_list.append(
            AllocationStatsPerKey(
                customer_id=customer_id,
                delivery_place_id=delivery_place_id,
                supplier_item_id=product_group_id,
                forecast_period=forecast_period,
                forecast_quantity=data["forecast_quantity"],
                allocated_quantity=data["allocated_quantity"],
                shortage_quantity=data["shortage_quantity"],
            )
        )
        if data["shortage_quantity"] > 0:
            gaps_list.append(
                AllocationGap(
                    customer_id=customer_id,
                    delivery_place_id=delivery_place_id,
                    supplier_item_id=product_group_id,
                    forecast_period=forecast_period,
                    shortage_quantity=data["shortage_quantity"],
                )
            )

    return stats_list, gaps_list


def create_stats_summary(
    total_forecast: Decimal,
    total_allocated: Decimal,
    total_shortage: Decimal,
    stats_per_key: list[AllocationStatsPerKey],
) -> AllocationStatsSummary:
    """Build allocation stats summary from totals."""
    return AllocationStatsSummary(
        total_forecast_quantity=total_forecast,
        total_allocated_quantity=total_allocated,
        total_shortage_quantity=total_shortage,
        per_key=stats_per_key,
    )
