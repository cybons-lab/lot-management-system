# backend/app/api/__init__.py
"""
API Package
APIルーティングの集約.
"""

from .routes import (
    admin_router,
    allocations_router,
    lots_router,
    orders_router,
    # orders_validate_router,  # Disabled: requires OrderValidation* schemas not in DDL v2.2
    warehouse_alloc_router,
)


__all__ = [
    "lots_router",
    "orders_router",
    "admin_router",
    "allocations_router",
    "warehouse_alloc_router",
    # "orders_validate_router",  # Disabled: requires OrderValidation* schemas not in DDL v2.2
]
