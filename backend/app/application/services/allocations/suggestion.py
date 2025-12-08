"""Allocation suggestions service (引当推奨サービス)."""

from datetime import UTC
from decimal import Decimal

from sqlalchemy.orm import Session, joinedload

from app.infrastructure.persistence.models.forecast_models import ForecastCurrent
from app.infrastructure.persistence.models.inventory_models import AllocationSuggestion, Lot
from app.infrastructure.persistence.models.orders_models import OrderLine
from app.presentation.schemas.allocations.allocation_suggestions_schema import (
    AllocationGap,
    AllocationStatsPerKey,
    AllocationStatsSummary,
    AllocationSuggestionPreviewResponse,
    AllocationSuggestionResponse,
)


class AllocationSuggestionService:
    """Service for allocation suggestions (引当推奨)."""

    def __init__(self, db: Session):
        """Initialize service with database session."""
        self.db = db

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
        # TODO: Ideally should only delete for the specific forecast lines we are about to re-process generally,
        # but for "Regenerate for periods", wiping clean is the expected behavior.
        self.db.query(AllocationSuggestion).filter(
            AllocationSuggestion.forecast_period.in_(forecast_periods)
        ).delete(synchronize_session=False)

        # 2. Fetch individual forecasts for these periods (Row-level)
        forecasts = (
            self.db.query(ForecastCurrent)
            .filter(ForecastCurrent.forecast_period.in_(forecast_periods))
            # Optional: Sort to prioritize which forecast gets stock first?
            # For now, simplistic order.
            .order_by(ForecastCurrent.forecast_date, ForecastCurrent.id)
            .all()
        )

        new_suggestions: list[AllocationSuggestion] = []
        stats_per_key: list[AllocationStatsPerKey] = []
        gaps: list[AllocationGap] = []

        # Helper to aggregate stats (since we now process row-by-row)
        # Key: (customer_id, delivery_place_id, product_id, forecast_period)
        stats_agg: dict[tuple, dict] = {}

        total_forecast = Decimal("0")
        total_allocated = Decimal("0")
        total_shortage = Decimal("0")

        # Cache lots by product_id to avoid repeated queries
        if not forecasts:
            product_ids = []
        else:
            product_ids = list({f.product_id for f in forecasts})
        lots_by_product = self._fetch_available_lots(product_ids)

        # Track temporary allocations per lot_id across all forecast iterations
        temp_allocations: dict[int, Decimal] = {}

        # 3. Process each forecast row
        for f in forecasts:
            needed = f.forecast_quantity
            total_forecast += needed

            allocated_for_row: Decimal = Decimal("0")

            # Get lots for this product
            lots = lots_by_product.get(f.product_id, [])

            # FEFO Allocation Logic (Delegated to allocator)
            from app.application.services.allocations.allocator import allocate_soft_for_forecast

            alloc_results = allocate_soft_for_forecast(needed, lots, temp_allocations)

            priority_counter = 1  # Reset or continue? Usually per forecast line => starts at 1

            for res in alloc_results:
                # Find the lot object to update temp state
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

                # Update counters
                needed -= res.quantity
                allocated_for_row += res.quantity

                # Update temp_allocations dict for subsequent iterations
                current_temp = temp_allocations.get(allocated_lot.id, Decimal("0"))
                temp_allocations[allocated_lot.id] = current_temp + res.quantity

                priority_counter += 1

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

        # 5. Bulk Insert
        if new_suggestions:
            self.db.add_all(new_suggestions)
            self.db.commit()

        stats_summary = AllocationStatsSummary(
            total_forecast_quantity=total_forecast,
            total_allocated_quantity=total_allocated,
            total_shortage_quantity=total_shortage,
            per_key=stats_per_key,
        )

        # For response, validating models from ORM objects works, though strictly speaking
        # relationships might be unloaded. Validating from attributes is usually fine.
        return AllocationSuggestionPreviewResponse(
            suggestions=[
                AllocationSuggestionResponse.model_validate(s, from_attributes=True)
                for s in new_suggestions
            ],
            stats=stats_summary,
            gaps=gaps,
        )

    def preview_for_order(self, order_line_id: int) -> AllocationSuggestionPreviewResponse:
        """Generate allocation suggestions for a specific order line (preview
        only, no save).
        """
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

            available = lot.current_quantity - lot.allocated_quantity
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
                # Mock relationships for response
                lot=lot,
            )
            # Manually set ID to 0 or None for transient
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

    def _fetch_available_lots(self, product_ids: list[int]) -> dict[int, list[Lot]]:
        """Fetch available lots for given products, sorted by FEFO."""
        if not product_ids:
            return {}

        lots = (
            self.db.query(Lot)
            .filter(
                Lot.product_id.in_(product_ids),
                Lot.status == "active",
                Lot.current_quantity > Lot.allocated_quantity,
            )
            .order_by(Lot.product_id, Lot.expiry_date.asc().nullslast(), Lot.received_date.asc())
            .options(joinedload(Lot.warehouse))
            .all()
        )

        # Group by product_id
        result: dict[int, list[Lot]] = {}
        for lot in lots:
            if lot.product_id not in result:
                result[lot.product_id] = []
            result[lot.product_id].append(lot)

        return result
