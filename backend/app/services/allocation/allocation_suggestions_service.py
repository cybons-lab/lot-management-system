"""Allocation suggestions service (引当推奨サービス)."""

from decimal import Decimal
from typing import Any

from sqlalchemy import func, tuple_
from sqlalchemy.orm import Session, joinedload

from app.models.forecast_models import ForecastCurrent
from app.models.inventory_models import AllocationSuggestion, Lot
from app.models.orders_models import OrderLine
from app.schemas.allocations.allocation_suggestions_schema import (
    AllocationGap,
    AllocationStatsPerKey,
    AllocationStatsSummary,
    AllocationSuggestionCreate,
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
        """
        Regenerate allocation suggestions for specified forecast periods.
        
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
            self.db.query(
                ForecastCurrent.forecast_period,
                ForecastCurrent.customer_id,
                ForecastCurrent.delivery_place_id,
                ForecastCurrent.product_id,
                func.sum(ForecastCurrent.forecast_quantity).label("total_quantity"),
            )
            .filter(ForecastCurrent.forecast_period.in_(forecast_periods))
            .group_by(
                ForecastCurrent.forecast_period,
                ForecastCurrent.customer_id,
                ForecastCurrent.delivery_place_id,
                ForecastCurrent.product_id,
            )
            .all()
        )
        
        new_suggestions: list[AllocationSuggestion] = []
        stats_per_key: list[AllocationStatsPerKey] = []
        gaps: list[AllocationGap] = []
        
        total_forecast = Decimal("0")
        total_allocated = Decimal("0")
        total_shortage = Decimal("0")

        # Cache lots by product_id to avoid repeated queries
        # In a real scenario with many products, we might want to fetch in batches or lazily
        product_ids = list({f.product_id for f in forecasts})
        lots_by_product = self._fetch_available_lots(product_ids)

        # 3. Process each forecast group
        for f in forecasts:
            needed = Decimal(str(f.total_quantity))
            total_forecast += needed
            
            allocated_for_key = Decimal("0")
            
            # Get lots for this product
            lots = lots_by_product.get(f.product_id, [])
            
            # FEFO Allocation Logic
            for lot in lots:
                if needed <= 0:
                    break
                
                # Calculate available quantity for this lot (considering what we've already allocated in this loop)
                # Note: In a single regeneration run, we track usage in memory.
                # 'lot' object is shared reference, so we can attach a temporary attribute or track usage separately.
                # Here we use a temporary attribute '_temp_allocated' on the lot object.
                if not hasattr(lot, "_temp_allocated"):
                    lot._temp_allocated = Decimal("0")
                
                available_real = lot.current_quantity - lot.allocated_quantity
                available_now = available_real - lot._temp_allocated
                
                if available_now <= 0:
                    continue
                
                alloc_qty = min(needed, available_now)
                
                suggestion = AllocationSuggestion(
                    forecast_period=f.forecast_period,
                    customer_id=f.customer_id,
                    delivery_place_id=f.delivery_place_id,
                    product_id=f.product_id,
                    lot_id=lot.id,
                    quantity=alloc_qty,
                    allocation_type="soft",
                    source="forecast_import",
                )
                new_suggestions.append(suggestion)
                
                # Update counters
                needed -= alloc_qty
                allocated_for_key += alloc_qty
                lot._temp_allocated += alloc_qty
            
            shortage = max(Decimal("0"), needed)
            
            # Stats
            stats_per_key.append(
                AllocationStatsPerKey(
                    customer_id=f.customer_id,
                    delivery_place_id=f.delivery_place_id,
                    product_id=f.product_id,
                    forecast_period=f.forecast_period,
                    forecast_quantity=Decimal(str(f.total_quantity)),
                    allocated_quantity=allocated_for_key,
                    shortage_quantity=shortage,
                )
            )
            
            if shortage > 0:
                gaps.append(
                    AllocationGap(
                        customer_id=f.customer_id,
                        delivery_place_id=f.delivery_place_id,
                        product_id=f.product_id,
                        forecast_period=f.forecast_period,
                        shortage_quantity=shortage,
                    )
                )
                total_shortage += shortage
            
            total_allocated += allocated_for_key

        # 4. Bulk Insert
        if new_suggestions:
            self.db.add_all(new_suggestions)
            self.db.commit()
            
            # Refresh to get IDs and relationships if needed, but for bulk performance we might skip full refresh
            # If response needs full details, we might need to re-query or refresh.
            # For now, let's just return what we have.
        
        stats_summary = AllocationStatsSummary(
            total_forecast_quantity=total_forecast,
            total_allocated_quantity=total_allocated,
            total_shortage_quantity=total_shortage,
            per_key=stats_per_key,
        )
        
        # Convert DB models to Response schemas
        # We need to manually construct response objects or let Pydantic handle it from attributes
        # Since new_suggestions are not refreshed, relationships like lot/warehouse are missing.
        # If the frontend needs them immediately, we should fetch them.
        # For this implementation, we'll return the basic info.
        
        return AllocationSuggestionPreviewResponse(
            suggestions=[AllocationSuggestionResponse.model_validate(s, from_attributes=True) for s in new_suggestions],
            stats=stats_summary,
            gaps=gaps,
        )

    def preview_for_order(self, order_line_id: int) -> AllocationSuggestionPreviewResponse:
        """
        Generate allocation suggestions for a specific order line (Preview only, no save).
        """
        order_line = self.db.query(OrderLine).filter(OrderLine.id == order_line_id).first()
        if not order_line:
            return AllocationSuggestionPreviewResponse(
                suggestions=[],
                stats=AllocationStatsSummary(
                    total_forecast_quantity=Decimal(0),
                    total_allocated_quantity=Decimal(0),
                    total_shortage_quantity=Decimal(0),
                    per_key=[]
                ),
                gaps=[]
            )

        needed = order_line.quantity
        product_id = order_line.product_id
        
        # Fetch lots
        lots = self._fetch_available_lots([product_id]).get(product_id, [])
        
        suggestions = []
        allocated_total = Decimal("0")
        
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
                forecast_period="PREVIEW", # Dummy
                customer_id=order_line.order.customer_id, # Assuming order has customer_id
                delivery_place_id=order_line.order.delivery_place_id, # Assuming order has delivery_place_id
                product_id=product_id,
                lot_id=lot.id,
                quantity=alloc_qty,
                allocation_type="soft",
                source="order_preview",
                # Mock relationships for response
                lot=lot,
            )
            # Manually set ID to 0 or None for transient
            s.id = 0 
            s.created_at = func.now()
            s.updated_at = func.now()
            
            suggestions.append(s)
            needed -= alloc_qty
            allocated_total += alloc_qty
            
        shortage = max(Decimal("0"), needed)
        
        stats = AllocationStatsSummary(
            total_forecast_quantity=order_line.quantity,
            total_allocated_quantity=allocated_total,
            total_shortage_quantity=shortage,
            per_key=[]
        )
        
        gaps = []
        if shortage > 0:
            gaps.append(AllocationGap(
                customer_id=order_line.order.customer_id,
                delivery_place_id=order_line.order.delivery_place_id,
                product_id=product_id,
                forecast_period="PREVIEW",
                shortage_quantity=shortage
            ))
            
        return AllocationSuggestionPreviewResponse(
            suggestions=[AllocationSuggestionResponse.model_validate(s, from_attributes=True) for s in suggestions],
            stats=stats,
            gaps=gaps
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
                Lot.current_quantity > Lot.allocated_quantity
            )
            .order_by(
                Lot.product_id,
                Lot.expiry_date.asc().nullslast(),
                Lot.received_date.asc()
            )
            .options(joinedload(Lot.warehouse))
            .all()
        )
        
        # Group by product_id
        result = {}
        for lot in lots:
            if lot.product_id not in result:
                result[lot.product_id] = []
            result[lot.product_id].append(lot)
            
        return result

