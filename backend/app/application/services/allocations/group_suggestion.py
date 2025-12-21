"""Group-based allocation suggestion service (グループ別引当推奨).

Handles regeneration of allocation suggestions for specific customer/product groups.
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
    AllocationStatsSummary,
    AllocationSuggestionPreviewResponse,
    AllocationSuggestionResponse,
)


class GroupAllocationSuggestionService(AllocationSuggestionBase):
    """Service for group-based allocation suggestions."""

    def __init__(self, db: Session):
        """Initialize service with database session."""
        super().__init__(db)

    def regenerate_for_group(
        self,
        customer_id: int,
        delivery_place_id: int,
        product_id: int,
        forecast_period: str | None = None,
    ) -> AllocationSuggestionPreviewResponse:
        """Regenerate allocation suggestions for a specific forecast group.

        Args:
            customer_id: 得意先ID
            delivery_place_id: 納入先ID
            product_id: 製品ID
            forecast_period: 期間 (YYYY-MM)、省略時は全期間

        Returns:
            AllocationSuggestionPreviewResponse with suggestions, stats, and gaps.
        """
        # 1. Delete existing suggestions for this group
        delete_query = self.db.query(AllocationSuggestion).filter(
            AllocationSuggestion.customer_id == customer_id,
            AllocationSuggestion.delivery_place_id == delivery_place_id,
            AllocationSuggestion.product_id == product_id,
        )
        if forecast_period:
            delete_query = delete_query.filter(
                AllocationSuggestion.forecast_period == forecast_period
            )
        delete_query.delete(synchronize_session=False)

        # 2. Fetch forecasts for this group
        forecast_query = self.db.query(ForecastCurrent).filter(
            ForecastCurrent.customer_id == customer_id,
            ForecastCurrent.delivery_place_id == delivery_place_id,
            ForecastCurrent.product_id == product_id,
        )
        if forecast_period:
            forecast_query = forecast_query.filter(
                ForecastCurrent.forecast_period == forecast_period
            )

        forecasts = forecast_query.order_by(ForecastCurrent.forecast_date, ForecastCurrent.id).all()

        if not forecasts:
            return AllocationSuggestionPreviewResponse(
                suggestions=[],
                stats=AllocationStatsSummary(
                    total_forecast_quantity=Decimal(0),
                    total_allocated_quantity=Decimal(0),
                    total_shortage_quantity=Decimal(0),
                    per_key=[],
                ),
                gaps=[],
            )

        new_suggestions: list[AllocationSuggestion] = []
        stats_agg: dict[tuple, dict] = {}

        total_forecast = Decimal("0")
        total_allocated = Decimal("0")
        total_shortage = Decimal("0")

        # Cache lots for the product
        lots_by_product = self._fetch_available_lots([product_id])
        temp_allocations: dict[int, Decimal] = {}

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
                    source="group_regenerate",
                )
                new_suggestions.append(suggestion)

                needed -= res.quantity
                allocated_for_row += res.quantity

                current_temp = temp_allocations.get(allocated_lot.id, Decimal("0"))
                temp_allocations[allocated_lot.id] = current_temp + res.quantity

            shortage = max(Decimal("0"), needed)
            total_shortage += shortage
            total_allocated += allocated_for_row

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
