"""API v2 Forecast router."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.application.services.forecasts.forecast_import_service import ForecastImportService
from app.application.services.forecasts.forecast_service import ForecastService
from app.presentation.api.deps import get_db
from app.presentation.schemas.forecasts.forecast_schema import (
    ForecastBulkImportRequest,
    ForecastBulkImportSummary,
    ForecastListResponse,
    ForecastResponse,
)


router = APIRouter()


@router.get("/", response_model=ForecastListResponse)
async def list_forecasts(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=1000),
    customer_id: int | None = None,
    delivery_place_id: int | None = None,
    product_id: int | None = None,
    db: Session = Depends(get_db),
):
    service = ForecastService(db)
    return service.get_forecasts(
        skip=skip,
        limit=limit,
        customer_id=customer_id,
        delivery_place_id=delivery_place_id,
        product_id=product_id,
    )


@router.get("/{forecast_id}", response_model=ForecastResponse)
async def get_forecast(forecast_id: int, db: Session = Depends(get_db)):
    service = ForecastService(db)
    forecast = service.get_forecast_by_id(forecast_id)
    if not forecast:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Forecast with id={forecast_id} not found",
        )
    return forecast


@router.post("/import", response_model=ForecastBulkImportSummary)
async def import_forecasts(payload: ForecastBulkImportRequest, db: Session = Depends(get_db)):
    service = ForecastImportService(db)
    summary = service.bulk_import(items=payload.items, replace_existing=payload.replace_existing)
    db.commit()
    return summary


@router.get("/grouped", response_model=ForecastListResponse)
async def get_grouped_forecasts(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=1000),
    customer_id: int | None = None,
    delivery_place_id: int | None = None,
    product_id: int | None = None,
    db: Session = Depends(get_db),
):
    service = ForecastService(db)
    return service.get_forecasts(
        skip=skip,
        limit=limit,
        customer_id=customer_id,
        delivery_place_id=delivery_place_id,
        product_id=product_id,
    )
