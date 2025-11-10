"""Aggregate router for master endpoints."""

import logging

from fastapi import APIRouter


logger = logging.getLogger(__name__)

router = APIRouter(prefix="/masters", tags=["masters"])

# Safe import with fallback for optional sub-routers
_sub_routers = [
    ("masters_products", "products_router"),
    ("masters_customers", "customers_router"),
    ("masters_suppliers", "suppliers_router"),
    ("masters_warehouses", "warehouses_router"),
    ("masters_bulk_load", "bulk_router"),
]

for module_name, _ in _sub_routers:
    try:
        module = __import__(f"app.api.routes.{module_name}", fromlist=["router"])
        sub_router = getattr(module, "router", None)
        if sub_router:
            router.include_router(sub_router)
            logger.info(f"Successfully loaded sub-router: {module_name}")
        else:
            logger.warning(f"Module {module_name} has no 'router' attribute")
    except (ImportError, ModuleNotFoundError) as e:
        logger.warning(
            f"Failed to import {module_name}: {e}. Related endpoints will be unavailable."
        )
