"""Base class and shared utilities for allocation suggestion services."""

from dataclasses import dataclass, field
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy.orm import Session, joinedload

from app.application.services.inventory.stock_calculation import get_available_quantity
from app.infrastructure.persistence.models.inventory_models import AllocationSuggestion, Lot
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

    def _fetch_available_lots(self, product_ids: list[int]) -> dict[int, list[Lot]]:
        """Fetch available lots for given products, sorted by FEFO."""
        if not product_ids:
            return {}

        lots = (
            self.db.query(Lot)
            .filter(
                Lot.product_id.in_(product_ids),
                Lot.status == "active",
            )
            .order_by(Lot.product_id, Lot.expiry_date.asc().nullslast(), Lot.received_date.asc())
            .options(joinedload(Lot.warehouse))
            .all()
        )

        # Filter lots with available quantity > 0
        lots = [lot for lot in lots if get_available_quantity(self.db, lot) > 0]

        # Group by product_id
        result: dict[int, list[Lot]] = {}
        for lot in lots:
            if lot.product_id not in result:
                result[lot.product_id] = []
            result[lot.product_id].append(lot)

        return result

    def _process_forecasts(
        self,
        forecasts: list["ForecastCurrent"],
        lots_by_product: dict[int, list[Lot]],
        source: str,
    ) -> ProcessingResult:
        """Process forecasts and generate allocation suggestions using FEFO.

        Args:
            forecasts: List of forecast records to process
            lots_by_product: Available lots grouped by product_id
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
            lots = lots_by_product.get(f.product_id, [])

            alloc_results = allocate_soft_for_forecast(needed, lots, temp_allocations)

            for res in alloc_results:
                allocated_lot = next(l for l in lots if l.id == res.lot_id)

                suggestion = AllocationSuggestion(
                    forecast_period=f.forecast_period,
                    forecast_id=f.id,
                    customer_id=f.customer_id,
                    delivery_place_id=f.delivery_place_id,
                    product_id=f.product_id,
                    lot_id=res.lot_id,
                    quantity=res.quantity,
                    priority=res.priority,
                    allocation_type="soft",
                    source=source,
                )
                result.suggestions.append(suggestion)

                needed -= res.quantity
                allocated_for_row += res.quantity

                current_temp = temp_allocations.get(allocated_lot.id, Decimal("0"))
                temp_allocations[allocated_lot.id] = current_temp + res.quantity

            shortage = max(Decimal("0"), needed)
            result.total_shortage += shortage
            result.total_allocated += allocated_for_row

            # Aggregate stats
            key = (f.customer_id, f.delivery_place_id, f.product_id, f.forecast_period)
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
        stats_agg: Dictionary keyed by (customer_id, delivery_place_id, product_id, forecast_period)

    Returns:
        Tuple of (stats_per_key, gaps)
    """
    stats_per_key: list[AllocationStatsPerKey] = []
    gaps: list[AllocationGap] = []

    for key, vals in stats_agg.items():
        cid, did, pid, period = key
        stats_per_key.append(
            AllocationStatsPerKey(
                customer_id=cid,
                delivery_place_id=did,
                product_id=pid,
                forecast_period=period,
                forecast_quantity=vals["forecast_quantity"],
                allocated_quantity=vals["allocated_quantity"],
                shortage_quantity=vals["shortage_quantity"],
            )
        )
        if vals["shortage_quantity"] > 0:
            gaps.append(
                AllocationGap(
                    customer_id=cid,
                    delivery_place_id=did,
                    product_id=pid,
                    forecast_period=period,
                    shortage_quantity=vals["shortage_quantity"],
                )
            )

    return stats_per_key, gaps


def create_stats_summary(
    total_forecast: Decimal,
    total_allocated: Decimal,
    total_shortage: Decimal,
    per_key: list[AllocationStatsPerKey],
) -> AllocationStatsSummary:
    """Create AllocationStatsSummary from totals and per-key stats."""
    return AllocationStatsSummary(
        total_forecast_quantity=total_forecast,
        total_allocated_quantity=total_allocated,
        total_shortage_quantity=total_shortage,
        per_key=per_key,
    )
