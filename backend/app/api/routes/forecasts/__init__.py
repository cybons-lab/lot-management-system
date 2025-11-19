"""Forecasts API routes subpackage."""

from app.api.routes.forecasts.forecasts_router import router as forecasts_router


__all__ = [
    "forecasts_router",
]
