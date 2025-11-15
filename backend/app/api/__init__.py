# backend/app/api/__init__.py
"""
API Package
APIルーティングの集約.
"""

from .routes import (
    admin_router,
    admin_simulate_router,
    allocations_router,
    forecast_router,
    integration_router,
    lots_router,
    masters_router,
    orders_router,
    # orders_validate_router,  # Disabled: requires OrderValidation* schemas not in DDL v2.2
    warehouse_alloc_router,
)


__all__ = [
    "masters_router",
    "lots_router",
    "orders_router",
    "integration_router",
    "admin_router",
    "admin_simulate_router",
    "allocations_router",
    "forecast_router",
    "warehouse_alloc_router",
    # "orders_validate_router",  # Disabled: requires OrderValidation* schemas not in DDL v2.2
]
