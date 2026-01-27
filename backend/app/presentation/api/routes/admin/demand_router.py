from datetime import date
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.application.services.demand.estimator import DemandEstimator, DemandForecast
from app.application.services.demand.repository import DemandRepository
from app.application.services.demand.statistical.ewma import EWMAEstimator
from app.application.services.demand.statistical.moving_average import MovingAverageEstimator
from app.application.services.demand.statistical.outlier import OutlierHandler
from app.application.services.demand.statistical.seasonal import SeasonalEstimator
from app.presentation.api.deps import get_db


class DailyDemand(BaseModel):
    date: date
    quantity: Decimal


class GetHistoryResponse(BaseModel):
    daily_demands: list[DailyDemand]
    total: Decimal
    avg_daily: Decimal
    std_daily: Decimal


router = APIRouter()


@router.get("/forecast", response_model=DemandForecast)
def get_demand_forecast(
    product_group_id: int,
    warehouse_id: int | None = None,
    horizon_days: int = 30,
    method: str = "moving_average_seasonal",
    as_of_date: date | None = None,
    db: Session = Depends(get_db),
):
    """Get demand forecast for a product."""
    if as_of_date is None:
        from app.core.time_utils import utcnow

        as_of_date = utcnow().date()

    repo = DemandRepository(db)

    # Estimator factory logic (duplicated from Engine, could be refactored)
    estimator: DemandEstimator
    if method == "ewma":
        estimator = EWMAEstimator(repo, alpha=0.3)
    else:
        # Default: MA + Seasonal
        ma = MovingAverageEstimator(repo, window_days=30)
        seasonal = SeasonalEstimator(ma)
        estimator = OutlierHandler(seasonal)

    try:
        forecast = estimator.estimate(
            product_group_id=product_group_id,
            warehouse_id=warehouse_id,
            horizon_days=horizon_days,
            as_of_date=as_of_date,
        )
        return forecast
    except Exception as e:
        import logging

        logging.getLogger(__name__).exception(f"Forecast failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/history", response_model=GetHistoryResponse)
def get_demand_history(
    product_group_id: int,
    start_date: date,
    end_date: date,
    warehouse_id: int | None = None,
    include_non_demand: bool = False,
    db: Session = Depends(get_db),
):
    """Get demand history for a product."""
    repo = DemandRepository(db)

    demand_types = ["order_manual", "order_auto"]
    if include_non_demand:
        demand_types.extend(["internal_use", "sample", "disposal", "other"])

    try:
        history = repo.get_demand_history(
            product_group_id=product_group_id,
            warehouse_id=warehouse_id,
            start_date=start_date,
            end_date=end_date,
            demand_types=demand_types,
        )

        daily_demands = [DailyDemand(date=d, quantity=q) for d, q in history]
        quantities = [q for _, q in history]

        total = sum(quantities) if quantities else Decimal(0)

        import statistics

        avg_daily = Decimal(str(statistics.mean(quantities))) if quantities else Decimal(0)
        std_daily = (
            Decimal(str(statistics.stdev(quantities))) if len(quantities) > 1 else Decimal(0)
        )

        return GetHistoryResponse(
            daily_demands=daily_demands,
            total=Decimal(str(total)),
            avg_daily=avg_daily,
            std_daily=std_daily,
        )
    except Exception as e:
        import logging

        logging.getLogger(__name__).exception(f"History fetch failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
