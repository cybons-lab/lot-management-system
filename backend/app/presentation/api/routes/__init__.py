# app/api/routes/__init__.py
"""API Routes Package 全ルーターのエクスポート（サブパッケージ構造対応版）.

Organized into feature-based subpackages:
- masters/ - Master data management (5 routers)
- orders/ - Order management (1 router)
- allocations/ - Allocation management (4 routers)
- inventory/ - Inventory management (4 routers)
- forecasts/ - Forecast management (2 routers)
- admin/ - Admin and system management (9 routers)
"""

from fastapi import FastAPI

from app.core.config import settings
from app.presentation.api.routes.admin import (
    admin_healthcheck_router,
    admin_router,
    batch_jobs_router,
    business_rules_router,
    health_router,
    master_import_router,
    operation_logs_router,
    roles_router,
    test_data_router,
    users_router,
)
from app.presentation.api.routes.alerts import alerts_router
from app.presentation.api.routes.allocations import allocations_router

# from app.presentation.api.routes.allocations import allocation_suggestions_router
from app.presentation.api.routes.assignments.assignment_router import router as assignments_router
from app.presentation.api.routes.auth.auth_router import router as auth_router
from app.presentation.api.routes.forecasts import forecasts_router
from app.presentation.api.routes.integration.sap_router import router as sap_router
from app.presentation.api.routes.inventory import (
    adjustments_router,
    inbound_plans_router,
    lots_router,
    withdrawals_router,
)
from app.presentation.api.routes.masters import (
    customer_item_delivery_settings_router,
    customer_items_router,
    customers_router,
    delivery_places_router,
    product_mappings_router,
    products_router,
    supplier_products_router,
    suppliers_router,
    uom_conversions_router,
    warehouse_delivery_routes_router,
    warehouses_router,
)
from app.presentation.api.routes.ocr import router as ocr_router
from app.presentation.api.routes.orders import (
    confirmed_lines_router,
    order_lines_router,
    orders_router,
)
from app.presentation.api.routes.rpa import (
    cloud_flow_router,
    layer_code_router,
    material_delivery_note_router,
    rpa_router,
    smartread_router,
)
from app.presentation.api.routes.system.system_router import router as system_router
from app.presentation.api.v2 import api_router as api_v2_router


# orders_validate_router is disabled: requires OrderValidation* schemas not in DDL v2.2
# from app.presentation.api.routes.orders import orders_validate_router


def register_all_routers(app: FastAPI) -> None:
    """全ルーターをアプリケーションに登録.

    Args:
        app: FastAPIアプリケーションインスタンス
    """
    prefix = settings.API_PREFIX

    # v2 API
    app.include_router(api_v2_router, prefix=settings.API_V2_STR)

    # Core business endpoints
    app.include_router(lots_router, prefix=prefix)
    app.include_router(confirmed_lines_router, prefix=prefix)  # Must be before orders_router
    app.include_router(order_lines_router, prefix=prefix)
    app.include_router(orders_router, prefix=prefix)

    # Forecast & Alert endpoints
    app.include_router(forecasts_router, prefix=prefix)
    app.include_router(alerts_router, prefix=prefix)

    # Allocations
    app.include_router(
        allocations_router.router, prefix=f"{prefix}/allocations", tags=["allocations"]
    )
    # app.include_router(allocation_suggestions_router, prefix=prefix)

    # Inventory endpoints
    app.include_router(inbound_plans_router, prefix=prefix)
    app.include_router(adjustments_router, prefix=prefix)
    app.include_router(withdrawals_router, prefix=prefix)

    # Master data endpoints
    masters_prefix = f"{prefix}/masters"
    app.include_router(customers_router, prefix=masters_prefix)
    app.include_router(delivery_places_router, prefix=masters_prefix)
    app.include_router(products_router, prefix=masters_prefix)
    app.include_router(suppliers_router, prefix=masters_prefix)
    app.include_router(supplier_products_router, prefix=masters_prefix)
    app.include_router(uom_conversions_router, prefix=masters_prefix)
    app.include_router(warehouses_router, prefix=masters_prefix)
    app.include_router(customer_items_router, prefix=masters_prefix)
    app.include_router(customer_item_delivery_settings_router, prefix=masters_prefix)
    app.include_router(product_mappings_router, prefix=masters_prefix)
    app.include_router(warehouse_delivery_routes_router, prefix=masters_prefix)

    # Auth & User management
    app.include_router(auth_router, prefix=f"{prefix}/auth")
    app.include_router(system_router, prefix=f"{prefix}/system")
    app.include_router(users_router, prefix=prefix)
    app.include_router(roles_router, prefix=prefix)
    app.include_router(assignments_router, prefix=prefix)

    # Admin & System endpoints
    app.include_router(admin_router, prefix=prefix)
    app.include_router(admin_healthcheck_router, prefix=prefix)
    app.include_router(test_data_router, prefix=f"{prefix}/admin/test-data")
    app.include_router(master_import_router, prefix=f"{prefix}/admin")
    app.include_router(health_router, prefix=prefix)

    # Operations endpoints
    app.include_router(operation_logs_router, prefix=prefix)
    app.include_router(business_rules_router, prefix=prefix)
    app.include_router(batch_jobs_router, prefix=prefix)

    # Integration endpoints
    app.include_router(sap_router, prefix=prefix)
    app.include_router(rpa_router, prefix=prefix)
    app.include_router(material_delivery_note_router, prefix=prefix)
    app.include_router(cloud_flow_router, prefix=prefix)
    app.include_router(layer_code_router, prefix=prefix)
    app.include_router(smartread_router, prefix=prefix)

    # OCR endpoints
    app.include_router(ocr_router, prefix=prefix)


__all__ = [
    # Masters (9)
    "customer_item_delivery_settings_router",
    "customer_items_router",
    "customers_router",
    "product_mappings_router",
    "products_router",
    "supplier_products_router",
    "suppliers_router",
    "uom_conversions_router",
    "warehouse_delivery_routes_router",
    "warehouses_router",
    # Orders (2 - validate router disabled)
    "orders_router",
    "order_lines_router",
    "confirmed_lines_router",
    # "orders_validate_router",  # Disabled: requires OrderValidation* schemas
    "adjustments_router",
    "inbound_plans_router",
    "lots_router",
    "withdrawals_router",
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
    "master_import_router",
    # Auth & System (2)
    "auth_router",
    "system_router",
    # Integration (1)
    "sap_router",
    # RPA (1)
    "rpa_router",
    "smartread_router",
    # Helper function
    "register_all_routers",
]
