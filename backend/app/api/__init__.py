# backend/app/api/__init__.py
"""
API Package
APIルーティングの集約
"""

from .routes import (
    admin_presets_router,
    admin_router,
    allocations_router,
    forecast_router,
    integration_router,
    lots_router,
    masters_router,
    orders_router,
    receipts_router,
    warehouse_alloc_router,  # ⬅️ [修正] 不足していたルータを追加
)

__all__ = [
    "masters_router",
    "lots_router",
    "receipts_router",
    "orders_router",
    "integration_router",
    "admin_router",
    "admin_presets_router",
    "allocations_router",
    "forecast_router",
    "warehouse_alloc_router",  # ⬅️ [修正] __all__ にも追加
]
