# app/api/routes/__init__.py
"""
API Routes Package
全ルーターのエクスポート.

This module dynamically imports all route modules with fallback handling.
If a module is missing or has import errors, it will log a warning and continue.
"""

import logging
from typing import Any


logger = logging.getLogger(__name__)

# List of (module_name, exported_name) tuples
_ROUTER_DEFINITIONS = [
    ("admin_router", "admin_router"),
    ("admin_healthcheck_router", "admin_healthcheck_router"),
    ("admin_simulate_router", "admin_simulate_router"),
    ("allocations_router", "allocations_router"),
    ("forecast_router", "forecast_router"),
    ("health_router", "health_router"),
    ("integration_router", "integration_router"),
    ("lots_router", "lots_router"),
    ("masters_router", "masters_router"),
    ("orders_router", "orders_router"),
    ("orders_validate_router", "orders_validate_router"),
    ("warehouse_alloc_router", "warehouse_alloc_router"),
]

# Dynamically import routers with error handling
_loaded_routers: dict[str, Any] = {}

for module_name, export_name in _ROUTER_DEFINITIONS:
    try:
        module = __import__(f"app.api.routes.{module_name}", fromlist=["router"])
        router_obj = getattr(module, "router", None)
        if router_obj is not None:
            _loaded_routers[export_name] = router_obj
            globals()[export_name] = router_obj
        else:
            logger.warning(
                f"Module 'app.api.routes.{module_name}' has no 'router' attribute. "
                f"Skipping {export_name}."
            )
    except (ImportError, ModuleNotFoundError) as e:
        logger.warning(
            f"Failed to import module 'app.api.routes.{module_name}': {e}. "
            f"{export_name} will be unavailable."
        )
    except Exception as e:
        logger.error(
            f"Unexpected error importing 'app.api.routes.{module_name}': {e}",
            exc_info=True,
        )

__all__ = list(_loaded_routers.keys())
