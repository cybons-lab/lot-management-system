"""Report services."""

from __future__ import annotations

from sqlalchemy import distinct, func
from sqlalchemy.orm import Session

from app.infrastructure.persistence.models.inventory_models import AllocationSuggestion
from app.infrastructure.persistence.models.lot_receipt_models import LotReceipt
from app.infrastructure.persistence.models.masters_models import Customer, DeliveryPlace


class ReportService:
    """Reporting service for aggregation queries."""

    def __init__(self, db: Session):
        self.db = db

    def get_monthly_aggregation_by_destination(
        self,
        product_id: int,
        warehouse_id: int,
        year: int,
        month: int,
    ) -> list[dict]:
        """Aggregate shipment quantities by destination within a month."""
        period_prefix = f"{year:04d}-{month:02d}"

        rows = (
            self.db.query(
                AllocationSuggestion.delivery_place_id.label("delivery_place_id"),
                DeliveryPlace.delivery_place_name.label("destination_name"),
                Customer.customer_name.label("customer_name"),
                func.coalesce(func.sum(AllocationSuggestion.quantity), 0).label("total_quantity"),
                func.count(distinct(AllocationSuggestion.lot_id)).label("lot_count"),
            )
            .join(
                DeliveryPlace,
                AllocationSuggestion.delivery_place_id == DeliveryPlace.id,
            )
            .join(
                Customer,
                AllocationSuggestion.customer_id == Customer.id,
            )
            .join(
                LotReceipt,
                AllocationSuggestion.lot_id == LotReceipt.id,
            )
            .filter(AllocationSuggestion.supplier_item_id == product_id)
            .filter(LotReceipt.warehouse_id == warehouse_id)
            .filter(AllocationSuggestion.forecast_period.like(f"{period_prefix}%"))
            .filter(AllocationSuggestion.quantity > 0)
            .group_by(
                AllocationSuggestion.delivery_place_id,
                DeliveryPlace.delivery_place_name,
                Customer.customer_name,
            )
            .order_by(func.sum(AllocationSuggestion.quantity).desc())
            .all()
        )

        return [
            {
                "delivery_place_id": row.delivery_place_id,
                "destination_name": row.destination_name,
                "customer_name": row.customer_name,
                "total_quantity": row.total_quantity,
                "lot_count": int(row.lot_count or 0),
            }
            for row in rows
        ]
