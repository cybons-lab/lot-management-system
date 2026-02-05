"""アラートAPIエンドポイント.

システムアラートとアラートサマリーを取得するREST APIを提供します。
"""

import logging
from typing import cast

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
    """現在のアラート一覧を取得.

    Args:
        severity: 重要度でフィルタ（カンマ区切り: critical,warning,info）
        category: カテゴリでフィルタ（カンマ区切り: order,inventory,lot,forecast）
        limit: 取得件数上限（デフォルト: 50、最大: 500）
        only_open: オープンなアラートのみ表示（デフォルト: true）
        db: データベースセッション

    Returns:
        重要度と時間でソートされたアラートアイテムのリスト
    """
    service = AlertService(db)

    # Parse severity filter
    severity_filter: list[AlertSeverity] | None = None
    if severity:
        valid_severities: set[AlertSeverity] = {"critical", "warning", "info"}
        severity_filter = []
        for raw in severity.split(","):
            item = raw.strip()
            if item in valid_severities:
                severity_filter.append(cast(AlertSeverity, item))

    # Parse category filter
    category_filter: list[AlertCategory] | None = None
    if category:
        valid_categories: set[AlertCategory] = {"order", "inventory", "lot", "forecast"}
        category_filter = []
        for raw in category.split(","):
            item = raw.strip()
            if item in valid_categories:
                category_filter.append(cast(AlertCategory, item))

    alerts = service.collect_all_alerts(
        severity_filter=severity_filter, category_filter=category_filter, limit=limit
    )

    logger.info(f"Retrieved {len(alerts)} alerts")
    return alerts


@router.get("/summary", response_model=AlertSummaryResponse)
def get_alert_summary(db: Session = Depends(get_db)) -> AlertSummaryResponse:
    """現在のアラートサマリーを取得.

    Args:
        db: データベースセッション

    Returns:
        重要度とカテゴリ別にグループ化されたアラート件数
    """
    service = AlertService(db)
    summary = service.get_alert_summary()

    logger.info(
        f"Alert summary: {summary.total} total, {summary.by_severity.get('critical', 0)} critical"
    )
    return summary
