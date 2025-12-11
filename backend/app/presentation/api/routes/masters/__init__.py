"""Masters API routes subpackage."""

from app.presentation.api.routes.masters.customer_item_delivery_settings_router import (
    router as customer_item_delivery_settings_router,
)
from app.presentation.api.routes.masters.customer_items_router import (
    router as customer_items_router,
)
from app.presentation.api.routes.masters.customers_router import router as customers_router
from app.presentation.api.routes.masters.delivery_places_router import (
    router as delivery_places_router,
)
from app.presentation.api.routes.masters.product_mappings_router import (
    router as product_mappings_router,
)
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
    "customer_item_delivery_settings_router",
    "customer_items_router",
    "customers_router",
    "delivery_places_router",
    "product_mappings_router",
    "products_router",
    "supplier_products_router",
    "suppliers_router",
    "uom_conversions_router",
    "warehouses_router",
]
