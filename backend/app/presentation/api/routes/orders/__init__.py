"""Orders API routes module."""

from app.presentation.api.routes.orders.confirmed_lines_router import (
    router as confirmed_lines_router,
)
from app.presentation.api.routes.orders.order_lines_router import router as order_lines_router
from app.presentation.api.routes.orders.orders_router import router as orders_router


# orders_validate_router is disabled: requires OrderValidation* schemas not in DDL v2.2
# from app.presentation.api.routes.orders.orders_validate_router import router as orders_validate_router


__all__ = [
    "confirmed_lines_router",
    "order_lines_router",
    "orders_router",
    # "orders_validate_router",  # Disabled: requires OrderValidation* schemas
]
