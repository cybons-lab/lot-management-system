"""Masters API routes subpackage."""

from app.api.routes.masters.customer_items_router import router as customer_items_router
from app.api.routes.masters.customers_router import router as customers_router
from app.api.routes.masters.products_router import router as products_router
from app.api.routes.masters.suppliers_router import router as suppliers_router
from app.api.routes.masters.warehouses_router import router as warehouses_router


__all__ = [
    "customer_items_router",
    "customers_router",
    "products_router",
    "suppliers_router",
    "warehouses_router",
]
