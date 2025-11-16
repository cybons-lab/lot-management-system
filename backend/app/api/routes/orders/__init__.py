"""Orders API routes subpackage."""

from app.api.routes.orders.orders_router import router as orders_router


# orders_validate_router is disabled: requires OrderValidation* schemas not in DDL v2.2
# from app.api.routes.orders.orders_validate_router import router as orders_validate_router


__all__ = [
    "orders_router",
    # "orders_validate_router",  # Disabled: requires OrderValidation* schemas
]
