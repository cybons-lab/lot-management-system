"""Orders API routes subpackage."""

from app.api.routes.orders.orders_router import router as orders_router
from app.api.routes.orders.orders_validate_router import router as orders_validate_router


__all__ = [
    "orders_router",
    "orders_validate_router",
]
