"""Report endpoints."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.application.services.reports import ReportService
from app.presentation.api.deps import get_db
from app.presentation.api.routes.auth.auth_router import require_role
from app.presentation.schemas.reports.report_schema import MonthlyDestinationReportItem


router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/monthly-by-destination", response_model=list[MonthlyDestinationReportItem])
def get_monthly_by_destination(
    product_id: int = Query(..., description="仕入先品目ID"),
    warehouse_id: int = Query(..., description="倉庫ID"),
    year: int = Query(..., ge=2000, le=2100, description="対象年"),
    month: int = Query(..., ge=1, le=12, description="対象月"),
    db: Session = Depends(get_db),
    current_user=Depends(require_role(["guest", "user", "admin"])),
):
    """納入先別の月次出荷数量を集計して返す."""
    service = ReportService(db)
    return service.get_monthly_aggregation_by_destination(
        product_id=product_id,
        warehouse_id=warehouse_id,
        year=year,
        month=month,
    )
