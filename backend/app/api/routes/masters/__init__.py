"""Masters API routes subpackage."""

from app.api.routes.masters.customer_items_router import router as customer_items_router
from app.api.routes.masters.customers_router import router as customers_router
from app.api.routes.masters.masters_bulk_load_router import (
    router as masters_bulk_load_router,
)
from app.api.routes.masters.masters_customers_router import (
    router as masters_customers_router,
)
from app.api.routes.masters.masters_products_router import router as masters_products_router
from app.api.routes.masters.masters_router import router as masters_router
from app.api.routes.masters.masters_suppliers_router import (
    router as masters_suppliers_router,
)
from app.api.routes.masters.masters_warehouses_router import (
    router as masters_warehouses_router,
)
from app.api.routes.masters.products_router import router as products_router
from app.api.routes.masters.suppliers_router import router as suppliers_router
from app.api.routes.masters.warehouses_router import router as warehouses_router


__all__ = [
    "customer_items_router",
    "customers_router",
    "masters_bulk_load_router",
    "masters_customers_router",
    "masters_products_router",
    "masters_router",
    "masters_suppliers_router",
    "masters_warehouses_router",
    "products_router",
    "suppliers_router",
    "warehouses_router",
]
