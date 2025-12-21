"""Allocation suggestions service (引当推奨サービス).

This module provides the main AllocationSuggestionService that composes
functionality from specialized sub-services.

For direct usage:
- PeriodAllocationSuggestionService: period-based operations
- GroupAllocationSuggestionService: customer/product group operations
"""

from datetime import UTC
from decimal import Decimal

from sqlalchemy.orm import Session

from app.application.services.allocations.group_suggestion import (
    GroupAllocationSuggestionService,
)
from app.application.services.allocations.period_suggestion import (
    PeriodAllocationSuggestionService,
)
from app.application.services.allocations.suggestion_base import AllocationSuggestionBase
from app.application.services.inventory.stock_calculation import get_available_quantity
from app.infrastructure.persistence.models.inventory_models import AllocationSuggestion
from app.infrastructure.persistence.models.orders_models import OrderLine
from app.presentation.schemas.allocations.allocation_suggestions_schema import (
    AllocationGap,
    AllocationStatsSummary,
    AllocationSuggestionPreviewResponse,
    AllocationSuggestionResponse,
)


class AllocationSuggestionService(AllocationSuggestionBase):
    """Service for allocation suggestions (引当推奨).

    This class provides a unified interface to all allocation suggestion
    functionality by delegating to specialized sub-services.
    """

    def __init__(self, db: Session):
        """Initialize service with database session."""
        super().__init__(db)
        self._period_service = PeriodAllocationSuggestionService(db)
        self._group_service = GroupAllocationSuggestionService(db)

    def regenerate_for_periods(
        self, forecast_periods: list[str]
    ) -> AllocationSuggestionPreviewResponse:
        """Regenerate allocation suggestions for specified forecast periods.

        Args:
            forecast_periods: List of forecast periods (e.g. ["2025-11", "2025-12"])

        Returns:
            AllocationSuggestionPreviewResponse with suggestions, stats, and gaps.
        """
        return self._period_service.regenerate_for_periods(forecast_periods)

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
        return self._group_service.regenerate_for_group(
            customer_id, delivery_place_id, product_id, forecast_period
        )

    def preview_for_order(self, order_line_id: int) -> AllocationSuggestionPreviewResponse:
        """Generate allocation suggestions for a specific order line (preview only, no save)."""
        order_line = self.db.query(OrderLine).filter(OrderLine.id == order_line_id).first()
        if not order_line:
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

        needed = order_line.order_quantity
        product_id = order_line.product_id

        # Fetch lots
        lots = self._fetch_available_lots([product_id]).get(product_id, [])

        suggestions = []
        allocated_total = Decimal("0")
        priority_counter = 1

        for lot in lots:
            if needed <= 0:
                break

            available = get_available_quantity(self.db, lot)
            if available <= 0:
                continue

            alloc_qty = min(needed, available)

            # Create transient object (not added to session)
            s = AllocationSuggestion(
                order_line_id=order_line_id,
                forecast_period="PREVIEW",  # Dummy
                customer_id=order_line.order.customer_id,
                delivery_place_id=order_line.delivery_place_id,
                product_id=product_id,
                lot_id=lot.id,
                quantity=alloc_qty,
                priority=priority_counter,
                allocation_type="soft",
                source="order_preview",
                lot=lot,
            )
            from datetime import datetime

            s.id = 0
            s.created_at = datetime.now(UTC)
            s.updated_at = datetime.now(UTC)

            suggestions.append(s)
            needed -= alloc_qty
            allocated_total += alloc_qty
            priority_counter += 1

        shortage = max(Decimal("0"), needed)

        stats = AllocationStatsSummary(
            total_forecast_quantity=order_line.order_quantity,
            total_allocated_quantity=allocated_total,
            total_shortage_quantity=shortage,
            per_key=[],
        )

        gaps = []
        if shortage > 0:
            gaps.append(
                AllocationGap(
                    customer_id=order_line.order.customer_id,
                    delivery_place_id=order_line.delivery_place_id,
                    product_id=product_id,
                    forecast_period="PREVIEW",
                    shortage_quantity=shortage,
                )
            )

        return AllocationSuggestionPreviewResponse(
            suggestions=[
                AllocationSuggestionResponse.model_validate(s, from_attributes=True)
                for s in suggestions
            ],
            stats=stats,
            gaps=gaps,
        )
