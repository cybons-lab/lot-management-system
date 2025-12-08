"""Alert API endpoints.

Provides REST API for retrieving system alerts and alert summaries.
"""

import logging

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.application.services.alerts.alert_service import AlertService
from app.presentation.api.deps import get_db
from app.presentation.schemas.alerts.alert_schema import (
    AlertCategory,
    AlertItem,
    AlertSeverity,
    AlertSummaryResponse,
)


logger = logging.getLogger(__name__)
router = APIRouter(prefix="/alerts", tags=["alerts"])


@router.get("", response_model=list[AlertItem])
def list_alerts(
    severity: str | None = Query(
        None, description="Comma-separated severity levels: critical,warning,info"
    ),
    category: str | None = Query(
        None, description="Comma-separated categories: order,inventory,lot,forecast"
    ),
    limit: int = Query(50, ge=1, le=500, description="Maximum number of alerts to return"),
    only_open: bool = Query(True, description="Only return open/active alerts"),
    db: Session = Depends(get_db),
) -> list[AlertItem]:
    """Get list of current alerts.

    Query parameters:
    - severity: Filter by severity (comma-separated: critical,warning,info)
    - category: Filter by category (comma-separated: order,inventory,lot,forecast)
    - limit: Max alerts to return (default: 50, max: 500)
    - only_open: Only show open alerts (default: true)

    Returns:
        List of alert items sorted by severity and time
    """
    service = AlertService(db)

    # Parse severity filter
    severity_filter: list[AlertSeverity] | None = None
    if severity:
        valid_severities: set[AlertSeverity] = {"critical", "warning", "info"}
        severity_filter = [
            s.strip()  # type: ignore[misc]
            for s in severity.split(",")
            if s.strip() in valid_severities
        ]

    # Parse category filter
    category_filter: list[AlertCategory] | None = None
    if category:
        valid_categories: set[AlertCategory] = {"order", "inventory", "lot", "forecast"}
        category_filter = [
            c.strip()  # type: ignore[misc]
            for c in category.split(",")
            if c.strip() in valid_categories
        ]

    alerts = service.collect_all_alerts(
        severity_filter=severity_filter, category_filter=category_filter, limit=limit
    )

    logger.info(f"Retrieved {len(alerts)} alerts")
    return alerts


@router.get("/summary", response_model=AlertSummaryResponse)
def get_alert_summary(db: Session = Depends(get_db)) -> AlertSummaryResponse:
    """Get summary of all current alerts.

    Returns:
        Alert counts grouped by severity and category
    """
    service = AlertService(db)
    summary = service.get_alert_summary()

    logger.info(
        f"Alert summary: {summary.total} total, {summary.by_severity.get('critical', 0)} critical"
    )
    return summary
