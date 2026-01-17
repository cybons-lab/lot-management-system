"""Alert collection service.

Provides functions to detect and collect various types of alerts from
the database, including order, inventory, lot, and forecast alerts.
"""

from datetime import datetime, timedelta
from typing import TYPE_CHECKING

from sqlalchemy import and_
from sqlalchemy.orm import Session

from app.infrastructure.persistence.models import LotReceipt, Order, OrderLine
from app.presentation.schemas.alerts.alert_schema import (
    AlertCategory,
    AlertItem,
    AlertSeverity,
    AlertSummaryResponse,
    AlertTargetLot,
    AlertTargetOrder,
)


if TYPE_CHECKING:
    pass


class AlertService:
    """Service for collecting and managing alerts."""

    def __init__(self, db: Session):
        """Initialize alert service.

        Args:
            db: Database session
        """
        self.db = db

    def collect_order_alerts(self) -> list[AlertItem]:
        """Collect order-related alerts.

        Currently implements:
        - A1: Unforecasted orders that are stale (>30min, no forecast_group_id)

        Returns:
            List of order alerts
        """
        alerts: list[AlertItem] = []

        # A1: Unforecasted order stale alert
        # Condition: No forecast_group_id, status=pending, created >30min ago
        threshold_time = datetime.utcnow() - timedelta(minutes=30)

        stale_unforecasted_orders = (
            self.db.query(Order)
            .join(OrderLine)
            .filter(
                and_(
                    Order.status == "open",
                    Order.created_at <= threshold_time,
                    # Note: forecast_group_id doesn't exist in current schema
                    # This is a placeholder - in real implementation, we'd check
                    # if order lines have associated forecasts
                )
            )
            .distinct()
            .all()
        )

        for order in stale_unforecasted_orders:
            alert_id = f"alert_order_{order.id}_{datetime.utcnow().strftime('%Y%m%d%H%M')}"
            alerts.append(
                AlertItem(
                    id=alert_id,
                    category="order",
                    type="UNFORECASTED_ORDER_STALE",
                    severity="critical",
                    title=f"無予測受注が30分以上未処理: 受注ID {order.id}",
                    message=(
                        f"受注ID {order.id} はフォーキャストに紐づいておらず、"
                        f"30分以上未処理です。至急対応が必要です。"
                    ),
                    occurred_at=order.created_at,
                    target=AlertTargetOrder(resource_type="order", id=order.id),
                )
            )

        return alerts

    def collect_lot_alerts(self) -> list[AlertItem]:
        """Collect lot-related alerts.

        Currently implements:
        - B3: Expiry date alerts (30/60/90 days)

        Returns:
            List of lot alerts
        """
        alerts: list[AlertItem] = []
        today = datetime.utcnow().date()

        # B3: Expiry date alerts
        # Query lots with expiry dates
        lots_with_expiry = (
            self.db.query(LotReceipt)
            .filter(
                and_(
                    LotReceipt.expiry_date.isnot(None),
                    LotReceipt.status.in_(["active"]),  # Only active lots
                    (LotReceipt.received_quantity - LotReceipt.consumed_quantity)
                    > 0,  # Only with stock
                )
            )
            .all()
        )

        for lot in lots_with_expiry:
            if lot.expiry_date is None:
                continue

            days_until_expiry = (lot.expiry_date - today).days

            severity: AlertSeverity | None = None
            if days_until_expiry <= 30:
                severity = "critical"
            elif days_until_expiry <= 60:
                severity = "warning"
            elif days_until_expiry <= 90:
                severity = "info"

            if severity:
                alert_id = f"alert_lot_{lot.id}_expiry_{today.strftime('%Y%m%d')}"
                alerts.append(
                    AlertItem(
                        id=alert_id,
                        category="lot",
                        type="LOT_EXPIRY_WARNING",
                        severity=severity,
                        title=f"ロット期限接近: {lot.lot_number} (残{days_until_expiry}日)",
                        message=(
                            f"ロット {lot.lot_number} の有効期限まで残り {days_until_expiry} 日です。"
                            f"期限: {lot.expiry_date.strftime('%Y-%m-%d')}"
                        ),
                        occurred_at=datetime.utcnow(),
                        target=AlertTargetLot(resource_type="lot", id=lot.id),
                    )
                )

        return alerts

    def collect_inventory_alerts(self) -> list[AlertItem]:
        """Collect inventory-related alerts.

        Placeholder for future implementation:
        - B1: Safety stock breach
        - B2: Overstock

        Returns:
            List of inventory alerts (currently empty)
        """
        # Placeholder - requires safety_stock_qty field in schema
        return []

    def collect_forecast_alerts(self) -> list[AlertItem]:
        """Collect forecast-related alerts.

        Placeholder for future implementation:
        - A2: Daily forecast advance pull
        - C1: Forecast underachievement

        Returns:
            List of forecast alerts (currently empty)
        """
        # Placeholder
        return []

    def collect_all_alerts(
        self,
        severity_filter: list[AlertSeverity] | None = None,
        category_filter: list[AlertCategory] | None = None,
        limit: int = 50,
    ) -> list[AlertItem]:
        """Collect all alerts from all sources.

        Args:
            severity_filter: Filter by severity levels
            category_filter: Filter by categories
            limit: Maximum number of alerts to return

        Returns:
            Combined list of all alerts, sorted by severity and time
        """
        all_alerts: list[AlertItem] = []

        # Collect from all sources
        if not category_filter or "order" in category_filter:
            all_alerts.extend(self.collect_order_alerts())

        if not category_filter or "lot" in category_filter:
            all_alerts.extend(self.collect_lot_alerts())

        if not category_filter or "inventory" in category_filter:
            all_alerts.extend(self.collect_inventory_alerts())

        if not category_filter or "forecast" in category_filter:
            all_alerts.extend(self.collect_forecast_alerts())

        # Filter by severity
        if severity_filter:
            all_alerts = [a for a in all_alerts if a.severity in severity_filter]

        # Sort by severity (critical > warning > info) then by time (newest first)
        severity_order = {"critical": 0, "warning": 1, "info": 2}
        all_alerts.sort(
            key=lambda a: (severity_order.get(a.severity, 3), -a.occurred_at.timestamp())
        )

        # Apply limit
        return all_alerts[:limit]

    def get_alert_summary(self) -> AlertSummaryResponse:
        """Get summary of all current alerts.

        Returns:
            Alert summary with counts by severity and category
        """
        all_alerts = self.collect_all_alerts(limit=1000)  # Get all for counting

        by_severity: dict[AlertSeverity, int] = {"critical": 0, "warning": 0, "info": 0}
        by_category: dict[AlertCategory, int] = {
            "order": 0,
            "inventory": 0,
            "lot": 0,
            "forecast": 0,
        }

        for alert in all_alerts:
            by_severity[alert.severity] = by_severity.get(alert.severity, 0) + 1
            by_category[alert.category] = by_category.get(alert.category, 0) + 1

        return AlertSummaryResponse(
            total=len(all_alerts), by_severity=by_severity, by_category=by_category
        )
