# app/api/routes/__init__.py
"""
API Routes Package
全ルーターのエクスポート（サブパッケージ構造対応版）.

Organized into feature-based subpackages:
- masters/ - Master data management (11 routers)
- orders/ - Order management (2 routers)
- allocations/ - Allocation management (4 routers)
- inventory/ - Inventory management (4 routers)
- forecasts/ - Forecast management (2 routers)
- admin/ - Admin and system management (9 routers)
- integration/ - External integrations (2 routers)
"""

from app.api.routes.admin import (
    admin_healthcheck_router,
    admin_router,
    admin_simulate_router,
    batch_jobs_router,
    business_rules_router,
    health_router,
    operation_logs_router,
    roles_router,
    users_router,
)
from app.api.routes.allocations import (
    allocation_candidates_router,
    allocation_suggestions_router,
    allocations_router,
    warehouse_alloc_router,
)
from app.api.routes.forecasts import forecast_router, forecasts_router
from app.api.routes.integration import integration_router, submissions_router
from app.api.routes.inventory import (
    adjustments_router,
    inbound_plans_router,
    inventory_items_router,
    lots_router,
)
from app.api.routes.masters import (
    customer_items_router,
    customers_router,
    masters_bulk_load_router,
    masters_customers_router,
    masters_products_router,
    masters_router,
    masters_suppliers_router,
    masters_warehouses_router,
    products_router,
    suppliers_router,
    warehouses_router,
)
from app.api.routes.orders import orders_router, orders_validate_router


__all__ = [
    # Masters (11)
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
    # Orders (2)
    "orders_router",
    "orders_validate_router",
    # Allocations (4)
    "allocation_candidates_router",
    "allocation_suggestions_router",
    "allocations_router",
    "warehouse_alloc_router",
    # Inventory (4)
    "adjustments_router",
    "inbound_plans_router",
    "inventory_items_router",
    "lots_router",
    # Forecasts (2)
    "forecast_router",
    "forecasts_router",
    # Admin (9)
    "admin_healthcheck_router",
    "admin_router",
    "admin_simulate_router",
    "batch_jobs_router",
    "business_rules_router",
    "health_router",
    "operation_logs_router",
    "roles_router",
    "users_router",
    # Integration (2)
    "integration_router",
    "submissions_router",
]
