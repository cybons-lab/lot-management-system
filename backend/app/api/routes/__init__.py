# backend/app/api/routes/__init__.py
"""
API Routes Package
全ルーターのエクスポート
"""

from .admin import router as admin_router
from .admin_presets import router as admin_presets_router
from .allocations import router as allocations_router
from .forecast import router as forecast_router
from .integration import router as integration_router
from .lots import router as lots_router
from .masters import router as masters_router
from .orders import router as orders_router
from .receipts import router as receipts_router
from .warehouse_alloc import router as warehouse_alloc_router  # 🔽 [追加]

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
    "warehouse_alloc_router",  # 🔽 [追加]
]
