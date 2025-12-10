"""Forecast API v2."""

import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.application.services.allocations.suggestion import AllocationSuggestionService
from app.application.services.forecasts.forecast_import_service import ForecastImportService
from app.application.services.forecasts.forecast_service import ForecastService
from app.core.database import get_db
from app.infrastructure.persistence.models.inventory_models import AllocationSuggestion, Lot
from app.presentation.schemas.allocations.allocation_suggestions_schema import (
    AllocationSuggestionListResponse,
    AllocationSuggestionPreviewResponse,
    AllocationSuggestionRequest,
    AllocationSuggestionResponse,
)
from app.presentation.schemas.forecasts.forecast_schema import (
    ForecastBulkImportRequest,
    ForecastBulkImportSummary,
    ForecastListResponse,
)


logger = logging.getLogger(__name__)

# Prefix will be '/api/v2/forecast' defined in v2 router registration
router = APIRouter()


# ===== Forecast CRUD Endpoints =====


@router.get("/", response_model=ForecastListResponse)
def list_forecasts(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    customer_id: int | None = Query(None),
    delivery_place_id: int | None = Query(None),
    product_id: int | None = Query(None),
    db: Session = Depends(get_db),
) -> Any:
    """フォーキャスト一覧取得（グループ化）."""
    service = ForecastService(db)
    return service.get_forecasts(
        skip=skip,
        limit=limit,
        customer_id=customer_id,
        delivery_place_id=delivery_place_id,
        product_id=product_id,
    )


@router.post("/import", response_model=ForecastBulkImportSummary)
def import_forecasts(
    payload: ForecastBulkImportRequest,
    db: Session = Depends(get_db),
) -> Any:
    """フォーキャスト一括インポート."""
    service = ForecastImportService(db)
    return service.bulk_import(
        items=payload.items,
        replace_existing=payload.replace_existing,
    )


# ===== Allocation Suggestion Endpoints =====


@router.post("/suggestions/preview", response_model=AllocationSuggestionPreviewResponse)
def preview_allocation_suggestions(
    request: AllocationSuggestionRequest,
    db: Session = Depends(get_db),
) -> Any:
    """引当推奨の生成・プレビュー.

    Mode:
    - forecast: 指定期間のForecastに対して引当推奨を一括再生成（DB保存あり）
    - order: 指定オーダー行に対して引当プレビュー（DB保存なし）
    """
    service = AllocationSuggestionService(db)

    if request.mode == "forecast":
        if not request.forecast_scope or not request.forecast_scope.forecast_periods:
            raise HTTPException(
                status_code=400, detail="Forecast periods required for forecast mode"
            )

        return service.regenerate_for_periods(request.forecast_scope.forecast_periods)

    elif request.mode == "order":
        if not request.order_scope or not request.order_scope.order_line_id:
            raise HTTPException(status_code=400, detail="Order line ID required for order mode")

        return service.preview_for_order(request.order_scope.order_line_id)

    else:
        raise HTTPException(status_code=400, detail=f"Invalid mode: {request.mode}")


@router.get("/suggestions", response_model=AllocationSuggestionListResponse)
def list_allocation_suggestions(
    skip: int = Query(0, ge=0, description="スキップ件数"),
    limit: int = Query(100, ge=1, le=1000, description="取得件数上限"),
    forecast_period: str | None = Query(None, description="期間 (YYYY-MM)"),
    product_id: int | None = Query(None, description="製品ID"),
    customer_id: int | None = Query(None, description="得意先ID"),
    db: Session = Depends(get_db),
) -> Any:
    """引当推奨一覧取得."""
    query = db.query(AllocationSuggestion)

    if forecast_period:
        query = query.filter(AllocationSuggestion.forecast_period == forecast_period)
    if product_id:
        query = query.filter(AllocationSuggestion.product_id == product_id)
    if customer_id:
        query = query.filter(AllocationSuggestion.customer_id == customer_id)

    total = query.count()
    suggestions = (
        query.order_by(AllocationSuggestion.created_at.desc()).offset(skip).limit(limit).all()
    )

    return AllocationSuggestionListResponse(
        suggestions=[
            AllocationSuggestionResponse.model_validate(s, from_attributes=True)
            for s in suggestions
        ],
        total=total,
    )


@router.get("/suggestions/group-summary")
def get_allocation_suggestions_by_group(
    customer_id: int = Query(..., description="得意先ID"),
    delivery_place_id: int = Query(..., description="納入先ID"),
    product_id: int = Query(..., description="製品ID"),
    forecast_period: str | None = Query(None, description="期間 (YYYY-MM)"),
    db: Session = Depends(get_db),
) -> Any:
    """フォーキャストグループ別の計画引当サマリを取得."""
    from decimal import Decimal

    # Base query
    query = db.query(AllocationSuggestion).filter(
        AllocationSuggestion.customer_id == customer_id,
        AllocationSuggestion.delivery_place_id == delivery_place_id,
        AllocationSuggestion.product_id == product_id,
    )

    if forecast_period:
        query = query.filter(AllocationSuggestion.forecast_period == forecast_period)

    suggestions = query.all()

    if not suggestions:
        return {
            "has_data": False,
            "total_planned_quantity": Decimal("0"),
            "lot_breakdown": [],
            "by_period": [],
        }

    # Aggregate by lot
    lot_totals: dict[int, Decimal] = {}
    period_totals: dict[str, Decimal] = {}

    for s in suggestions:
        # lot_id is nullable in schema but should exist for suggestions created by FEFO
        if s.lot_id:
            lot_totals[s.lot_id] = lot_totals.get(s.lot_id, Decimal("0")) + s.quantity

        if s.forecast_period:
            period_totals[s.forecast_period] = (
                period_totals.get(s.forecast_period, Decimal("0")) + s.quantity
            )

    total_planned = sum(lot_totals.values())

    # Get lot info
    lot_ids = list(lot_totals.keys())
    lots = []
    if lot_ids:
        lots = db.query(Lot).filter(Lot.id.in_(lot_ids)).all()

    lot_map = {lot.id: lot for lot in lots}

    lot_breakdown = []
    for lot_id, qty in sorted(lot_totals.items(), key=lambda x: x[0]):
        lot = lot_map.get(lot_id)
        lot_breakdown.append(
            {
                "lot_id": lot_id,
                "lot_number": lot.lot_number if lot else None,
                "expiry_date": lot.expiry_date.isoformat() if lot and lot.expiry_date else None,
                "planned_quantity": qty,
            }
        )

    by_period = [
        {"forecast_period": period, "planned_quantity": qty}
        for period, qty in sorted(period_totals.items())
    ]

    return {
        "has_data": True,
        "total_planned_quantity": total_planned,
        "lot_breakdown": lot_breakdown,
        "by_period": by_period,
    }
