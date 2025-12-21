"""Base class and shared utilities for allocation suggestion services."""

from decimal import Decimal

from sqlalchemy.orm import Session, joinedload

from app.application.services.inventory.stock_calculation import get_available_quantity
from app.infrastructure.persistence.models.inventory_models import Lot
from app.presentation.schemas.allocations.allocation_suggestions_schema import (
    AllocationGap,
    AllocationStatsPerKey,
    AllocationStatsSummary,
)


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
