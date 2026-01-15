"""API v2 package."""

from fastapi import APIRouter

from app.presentation.api.v2.allocation.router import router as allocation_router
from app.presentation.api.v2.forecast.router import router as forecast_router
from app.presentation.api.v2.inventory.router import router as inventory_router
from app.presentation.api.v2.lot.router import router as lot_router
from app.presentation.api.v2.order.router import router as order_router
from app.presentation.api.v2.reservation.router import router as reservation_router
from app.presentation.api.v2.withdrawals.default_destination_router import (
    router as default_destination_router,
)


api_router = APIRouter()

api_router.include_router(lot_router, prefix="/lot", tags=["v2-lot"])
api_router.include_router(order_router, prefix="/order", tags=["v2-order"])
api_router.include_router(allocation_router, prefix="/allocation", tags=["v2-allocation"])
api_router.include_router(forecast_router, prefix="/forecast", tags=["v2-forecast"])
api_router.include_router(inventory_router, prefix="/inventory", tags=["v2-inventory"])
api_router.include_router(reservation_router, prefix="/reservation", tags=["v2-reservation"])
api_router.include_router(default_destination_router, tags=["v2-withdrawals"])
