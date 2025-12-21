"""Period-based allocation suggestion service (期間別引当推奨).

Handles bulk regeneration of allocation suggestions for forecast periods.
"""

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

        # 2. Fetch forecasts for these periods
        forecasts = (
            self.db.query(ForecastCurrent)
            .filter(ForecastCurrent.forecast_period.in_(forecast_periods))
            .order_by(ForecastCurrent.forecast_date, ForecastCurrent.id)
            .all()
        )

        product_ids = list({f.product_id for f in forecasts}) if forecasts else []
        lots_by_product = self._fetch_available_lots(product_ids)

        # 3. Process forecasts using shared method
        result = self._process_forecasts(forecasts, lots_by_product, source="forecast_import")

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
