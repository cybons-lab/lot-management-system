"""Aggregate router for master endpoints."""
from fastapi import APIRouter

from .masters_bulk_load import router as bulk_router
from .masters_customers import router as customers_router
from .masters_products import router as products_router
from .masters_suppliers import router as suppliers_router
from .masters_warehouses import router as warehouses_router

router = APIRouter(prefix="/masters", tags=["masters"])

router.include_router(products_router)
router.include_router(customers_router)
router.include_router(suppliers_router)
router.include_router(warehouses_router)
router.include_router(bulk_router)

