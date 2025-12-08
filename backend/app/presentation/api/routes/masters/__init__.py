"""Masters API routes subpackage."""

from app.presentation.api.routes.masters.customer_items_router import (
    router as customer_items_router,
)
from app.presentation.api.routes.masters.customers_router import router as customers_router
from app.presentation.api.routes.masters.products_router import router as products_router
from app.presentation.api.routes.masters.supplier_products_router import (
    router as supplier_products_router,
)
from app.presentation.api.routes.masters.suppliers_router import router as suppliers_router
from app.presentation.api.routes.masters.uom_conversions_router import (
    router as uom_conversions_router,
)
from app.presentation.api.routes.masters.warehouses_router import router as warehouses_router


__all__ = [
    "customer_items_router",
    "customers_router",
    "products_router",
    "supplier_products_router",
    "suppliers_router",
    "uom_conversions_router",
    "warehouses_router",
]
