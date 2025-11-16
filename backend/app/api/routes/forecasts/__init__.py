"""Forecasts API routes subpackage."""

from app.api.routes.forecasts.forecast_router import router as forecast_router
from app.api.routes.forecasts.forecasts_router import router as forecasts_router


__all__ = [
    "forecast_router",
    "forecasts_router",
]
