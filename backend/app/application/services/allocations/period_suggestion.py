"""Period-based allocation suggestion service (期間別引当推奨).

Handles bulk regeneration of allocation suggestions for forecast periods.
"""

from decimal import Decimal

from sqlalchemy.orm import Session

from app.application.services.allocations.suggestion_base import (
    AllocationSuggestionBase,
    create_stats_summary,
    finalize_stats_and_gaps,
)
from app.infrastructure.persistence.models.forecast_models import ForecastCurrent
from app.infrastructure.persistence.models.inventory_models import AllocationSuggestion
from app.presentation.schemas.allocations.allocation_suggestions_schema import (
    AllocationSuggestionPreviewResponse,
    AllocationSuggestionResponse,
)


class PeriodAllocationSuggestionService(AllocationSuggestionBase):
    """Service for period-based allocation suggestions."""

    def __init__(self, db: Session):
        """Initialize service with database session."""
        super().__init__(db)

    def regenerate_for_periods(
        self, forecast_periods: list[str]
    ) -> AllocationSuggestionPreviewResponse:
        """Regenerate allocation suggestions for specified forecast periods.

        Args:
            forecast_periods: List of forecast periods (e.g. ["2025-11", "2025-12"])

        Returns:
            AllocationSuggestionPreviewResponse with suggestions, stats, and gaps.
        """
        # 1. Delete existing suggestions for these periods
        self.db.query(AllocationSuggestion).filter(
            AllocationSuggestion.forecast_period.in_(forecast_periods)
        ).delete(synchronize_session=False)

        # 2. Fetch individual forecasts for these periods
        forecasts = (
            self.db.query(ForecastCurrent)
            .filter(ForecastCurrent.forecast_period.in_(forecast_periods))
            .order_by(ForecastCurrent.forecast_date, ForecastCurrent.id)
            .all()
        )

        if not forecasts:
            product_ids = []
        else:
            product_ids = list({f.product_id for f in forecasts})

        lots_by_product = self._fetch_available_lots(product_ids)
        temp_allocations: dict[int, Decimal] = {}

        new_suggestions: list[AllocationSuggestion] = []
        stats_agg: dict[tuple, dict] = {}

        total_forecast = Decimal("0")
        total_allocated = Decimal("0")
        total_shortage = Decimal("0")

        # 3. Process each forecast row
        for f in forecasts:
            needed = f.forecast_quantity
            total_forecast += needed

            allocated_for_row: Decimal = Decimal("0")
            lots = lots_by_product.get(f.product_id, [])

            from app.application.services.allocations.allocator import allocate_soft_for_forecast

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
                    source="forecast_import",
                )
                new_suggestions.append(suggestion)

                needed -= res.quantity
                allocated_for_row += res.quantity

                current_temp = temp_allocations.get(allocated_lot.id, Decimal("0"))
                temp_allocations[allocated_lot.id] = current_temp + res.quantity

            shortage = max(Decimal("0"), needed)
            total_shortage += shortage
            total_allocated += allocated_for_row

            # Aggregate stats
            key = (f.customer_id, f.delivery_place_id, f.product_id, f.forecast_period)
            if key not in stats_agg:
                stats_agg[key] = {
                    "forecast_quantity": Decimal("0"),
                    "allocated_quantity": Decimal("0"),
                    "shortage_quantity": Decimal("0"),
                }
            stats_agg[key]["forecast_quantity"] += f.forecast_quantity
            stats_agg[key]["allocated_quantity"] += allocated_for_row
            stats_agg[key]["shortage_quantity"] += shortage

        # 4. Finalize Stats & Gaps
        stats_per_key, gaps = finalize_stats_and_gaps(stats_agg)

        # 5. Bulk Insert
        if new_suggestions:
            self.db.add_all(new_suggestions)
            self.db.commit()

        stats_summary = create_stats_summary(
            total_forecast, total_allocated, total_shortage, stats_per_key
        )

        return AllocationSuggestionPreviewResponse(
            suggestions=[
                AllocationSuggestionResponse.model_validate(s, from_attributes=True)
                for s in new_suggestions
            ],
            stats=stats_summary,
            gaps=gaps,
        )
