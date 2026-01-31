"""API v2 Inventory router."""

from __future__ import annotations

from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.application.services.inventory.inventory_service import InventoryService
from app.infrastructure.persistence.models.auth_models import User
from app.presentation.api.deps import get_db
from app.presentation.api.routes.auth.auth_router import get_current_user_optional
from app.presentation.schemas.common.base import BaseSchema
from app.presentation.schemas.inventory.inventory_schema import (
    InventoryByProductResponse,
    InventoryBySupplierResponse,
    InventoryByWarehouseResponse,
    InventoryFilterOptions,
    InventoryItemResponse,
    InventoryListResponse,
)


router = APIRouter()


class InventoryStats(BaseSchema):
    total_products: int
    total_warehouses: int
    total_quantity: Decimal


@router.get("/", response_model=InventoryListResponse)
async def list_inventory(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=1000),
    product_group_id: int | None = None,
    warehouse_id: int | None = None,
    supplier_id: int | None = None,
    tab: str = Query(default="all", pattern="^(in_stock|no_stock|all)$"),
    group_by: str = Query(
        default="supplier_product_warehouse",
        pattern="^(supplier_product_warehouse|product_warehouse)$",
        description="Grouping mode: 'supplier_product_warehouse' (default) or 'product_warehouse'",
    ),
    assigned_staff_only: bool = Query(default=False),
    current_user: User | None = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    if assigned_staff_only and not current_user:
        raise HTTPException(status_code=401, detail="Authentication required for this filter")

    service = InventoryService(db)
    return service.get_inventory_items(
        skip=skip,
        limit=limit,
        product_group_id=product_group_id,
        warehouse_id=warehouse_id,
        supplier_id=supplier_id,
        tab=tab,
        group_by=group_by,
        assigned_staff_only=assigned_staff_only,
        current_user_id=current_user.id if current_user else None,
    )


@router.get("/filter-options", response_model=InventoryFilterOptions)
async def get_filter_options(
    product_group_id: int | None = None,
    warehouse_id: int | None = None,
    supplier_id: int | None = None,
    tab: str = Query(default="all", pattern="^(in_stock|no_stock|all)$"),
    assigned_staff_only: bool = Query(default=False),
    mode: str = Query(default="stock", pattern="^(stock|master)$"),
    current_user: User | None = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    """Get filter options (products, suppliers, warehouses) based on current selection."""
    if assigned_staff_only and not current_user:
        raise HTTPException(status_code=401, detail="Authentication required for this filter")
    service = InventoryService(db)
    return service.get_filter_options(
        product_group_id=product_group_id,
        warehouse_id=warehouse_id,
        supplier_id=supplier_id,
        tab=tab,
        assigned_staff_only=assigned_staff_only,
        current_user_id=current_user.id if current_user else None,
        mode=mode,
    )


@router.get("/{product_group_id}/{warehouse_id}", response_model=InventoryItemResponse)
async def get_inventory_item(
    product_group_id: int, warehouse_id: int, db: Session = Depends(get_db)
):
    service = InventoryService(db)
    item = service.get_inventory_item_by_product_warehouse(product_group_id, warehouse_id)
    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    return item


@router.get("/stats", response_model=InventoryStats)
async def get_inventory_stats(db: Session = Depends(get_db)):
    service = InventoryService(db)
    by_product = service.get_inventory_by_product()
    total_quantity = sum(
        (Decimal(str(item.get("total_quantity", 0))) for item in by_product), Decimal("0")
    )
    warehouse_ids = set()
    product_group_ids = set()
    for item in by_product:
        product_group_ids.add(item.get("product_group_id"))
        # available warehouse count not in product item; derive from by_warehouse
    by_warehouse = service.get_inventory_by_warehouse()
    for warehouse in by_warehouse:
        warehouse_ids.add(warehouse.get("warehouse_id"))

    return InventoryStats(
        total_products=len(product_group_ids),
        total_warehouses=len(warehouse_ids),
        total_quantity=total_quantity,
    )


@router.get("/by-supplier", response_model=list[InventoryBySupplierResponse])
async def list_inventory_by_supplier(db: Session = Depends(get_db)):
    service = InventoryService(db)
    return service.get_inventory_by_supplier()


@router.get("/by-warehouse", response_model=list[InventoryByWarehouseResponse])
async def list_inventory_by_warehouse(db: Session = Depends(get_db)):
    service = InventoryService(db)
    return service.get_inventory_by_warehouse()


@router.get("/by-product", response_model=list[InventoryByProductResponse])
async def list_inventory_by_product(db: Session = Depends(get_db)):
    service = InventoryService(db)
    return service.get_inventory_by_product()
