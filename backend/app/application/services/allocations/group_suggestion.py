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
        product_group_id: int,
        forecast_period: str | None = None,
    ) -> AllocationSuggestionPreviewResponse:
        """Regenerate allocation suggestions for a specific forecast group.

        Args:
            customer_id: 得意先ID
            delivery_place_id: 納入先ID
            product_group_id: 製品ID
            forecast_period: 期間 (YYYY-MM)、省略時は全期間

        Returns:
            AllocationSuggestionPreviewResponse with suggestions, stats, and gaps.
        """
        # 1. Delete existing suggestions for this group
        delete_query = self.db.query(AllocationSuggestion).filter(
            AllocationSuggestion.customer_id == customer_id,
            AllocationSuggestion.delivery_place_id == delivery_place_id,
            AllocationSuggestion.product_group_id == product_group_id,
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
            ForecastCurrent.product_group_id == product_group_id,
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

        lots_by_product = self._fetch_available_lots([product_group_id])

        # 3. Process forecasts using shared method
        result = self._process_forecasts(forecasts, lots_by_product, source="group_regenerate")

        # 4. Finalize stats & gaps
        stats_per_key, gaps = finalize_stats_and_gaps(result.stats_agg)

        # 5. Bulk insert
        if result.suggestions:
            self.db.add_all(result.suggestions)
            self.db.commit()

        stats_summary = create_stats_summary(
            result.total_forecast, result.total_allocated, result.total_shortage, stats_per_key
        )

        return AllocationSuggestionPreviewResponse(
            suggestions=[
                AllocationSuggestionResponse.model_validate(s, from_attributes=True)
                for s in result.suggestions
            ],
            stats=stats_summary,
            gaps=gaps,
        )
