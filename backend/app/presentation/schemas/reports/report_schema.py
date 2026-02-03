"""Report schemas."""

from decimal import Decimal

from app.presentation.schemas.common.base import BaseSchema


class MonthlyDestinationReportItem(BaseSchema):
    """Monthly aggregation by destination."""

    delivery_place_id: int
    destination_name: str
    customer_name: str
    total_quantity: Decimal
    lot_count: int
