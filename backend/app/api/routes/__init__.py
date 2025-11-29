# app/api/routes/__init__.py
"""
API Routes Package
全ルーターのエクスポート（サブパッケージ構造対応版）.

Organized into feature-based subpackages:
- masters/ - Master data management (5 routers)
- orders/ - Order management (1 router)
- allocations/ - Allocation management (4 routers)
- inventory/ - Inventory management (4 routers)
- forecasts/ - Forecast management (2 routers)
- admin/ - Admin and system management (9 routers)
"""

from app.api.routes.admin import (
    admin_healthcheck_router,
    admin_router,
    batch_jobs_router,
    business_rules_router,
    health_router,
    operation_logs_router,
    roles_router,
    test_data_router,
    users_router,
)
from app.api.routes.alerts import alerts_router
from app.api.routes.allocations import (
    allocation_candidates_router,
    allocation_suggestions_router,
    allocations_router,
    warehouse_alloc_router,
)
from app.api.routes.assignments.assignment_router import router as assignments_router
from app.api.routes.forecasts import forecasts_router
from app.api.routes.integration.sap_router import router as sap_router
from app.api.routes.inventory import (
    adjustments_router,
    inbound_plans_router,
    inventory_items_router,
    lots_router,
)
from app.api.routes.masters import (
    customer_items_router,
    customers_router,
    products_router,
    supplier_products_router,
    suppliers_router,
    uom_conversions_router,
    warehouses_router,
)
from app.api.routes.orders import confirmed_lines_router, order_lines_router, orders_router


# orders_validate_router is disabled: requires OrderValidation* schemas not in DDL v2.2
# from app.api.routes.orders import orders_validate_router


__all__ = [
    # Masters (7)
    "customer_items_router",
    "customers_router",
    "products_router",
    "supplier_products_router",
    "suppliers_router",
    "uom_conversions_router",
    "warehouses_router",
    # Orders (2 - validate router disabled)
    "orders_router",
    "order_lines_router",
    "confirmed_lines_router",
    # "orders_validate_router",  # Disabled: requires OrderValidation* schemas
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
    # Forecasts (1)
    "forecasts_router",
    # Alerts (1)
    "alerts_router",
    # Admin (8)
    "admin_healthcheck_router",
    "admin_router",
    "assignments_router",
    "batch_jobs_router",
    "business_rules_router",
    "health_router",
    "operation_logs_router",
    "roles_router",
    "users_router",
    "test_data_router",
    # Integration (1)
    "sap_router",
]
