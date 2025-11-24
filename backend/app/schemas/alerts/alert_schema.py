"""Alert management Pydantic schemas.

Provides type definitions for the alert system including severity levels,
categories, and alert items with their targets.
"""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

# Alert severity levels
AlertSeverity = Literal["info", "warning", "critical"]

# Alert categories
AlertCategory = Literal["order", "inventory", "lot", "forecast"]


class AlertTargetOrder(BaseModel):
    """Alert target for order resources."""

    resource_type: Literal["order"] = "order"
    id: int


class AlertTargetInventoryItem(BaseModel):
    """Alert target for inventory item resources."""

    resource_type: Literal["inventory_item"] = "inventory_item"
    id: int


class AlertTargetLot(BaseModel):
    """Alert target for lot resources."""

    resource_type: Literal["lot"] = "lot"
    id: int


class AlertTargetForecastDaily(BaseModel):
    """Alert target for daily forecast resources."""

    resource_type: Literal["forecast_daily"] = "forecast_daily"
    id: int


# Union type for all alert targets
AlertTarget = (
    AlertTargetOrder | AlertTargetInventoryItem | AlertTargetLot | AlertTargetForecastDaily
)


class AlertItem(BaseModel):
    """Represents a single alert item.

    Attributes:
        id: Unique identifier for the alert
        category: Alert category (order, inventory, lot, forecast)
        type: Specific alert type code (e.g., 'UNFORECASTED_ORDER_STALE')
        severity: Alert severity level
        title: Short description displayed in alert list
        message: Detailed explanation (optional)
        occurred_at: When the alert condition was detected
        target: Resource this alert is about (for navigation)
    """

    id: str = Field(..., description="Unique alert identifier")
    category: AlertCategory = Field(..., description="Alert category")
    type: str = Field(..., description="Specific alert type code")
    severity: AlertSeverity = Field(..., description="Alert severity level")
    title: str = Field(..., description="Short alert description")
    message: str = Field(default="", description="Detailed explanation")
    occurred_at: datetime = Field(..., description="Alert occurrence timestamp")
    target: AlertTarget = Field(..., description="Target resource for navigation")

    model_config = {"json_schema_extra": {"example": {
        "id": "alert_order_12345_20231124",
        "category": "order",
        "type": "UNFORECASTED_ORDER_STALE",
        "severity": "critical",
        "title": "無予測受注が30分以上未処理",
        "message": "受注番号 ORD-12345 はフォーキャストに紐づいておらず、30分以上未処理です。",
        "occurred_at": "2023-11-24T10:30:00Z",
        "target": {"resource_type": "order", "id": 12345},
    }}}


class AlertSummaryResponse(BaseModel):
    """Summary of alert counts by severity and category.

    Attributes:
        total: Total number of alerts
        by_severity: Count of alerts grouped by severity
        by_category: Count of alerts grouped by category
    """

    total: int = Field(..., description="Total alert count")
    by_severity: dict[AlertSeverity, int] = Field(
        default_factory=dict, description="Alert counts by severity"
    )
    by_category: dict[AlertCategory, int] = Field(
        default_factory=dict, description="Alert counts by category"
    )

    model_config = {"json_schema_extra": {"example": {
        "total": 23,
        "by_severity": {"critical": 3, "warning": 12, "info": 8},
        "by_category": {"order": 5, "inventory": 7, "lot": 6, "forecast": 5},
    }}}
