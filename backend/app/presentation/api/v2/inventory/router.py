"""API v2 Inventory router."""

from __future__ import annotations

from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.application.services.inventory.inventory_service import InventoryService
from app.presentation.api.deps import get_db
from app.presentation.schemas.common.base import BaseSchema
from app.presentation.schemas.inventory.inventory_schema import (
    InventoryByProductResponse,
    InventoryBySupplierResponse,
    InventoryByWarehouseResponse,
    InventoryItemResponse,
)


router = APIRouter()


class InventoryStats(BaseSchema):
    total_products: int
    total_warehouses: int
    total_quantity: Decimal


@router.get("/", response_model=list[InventoryItemResponse])
async def list_inventory(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=1000),
    product_id: int | None = None,
    warehouse_id: int | None = None,
    supplier_id: int | None = None,
    tab: str = Query(default="all", regex="^(in_stock|no_stock|all)$"),
    db: Session = Depends(get_db),
):
    service = InventoryService(db)
    return service.get_inventory_items(
        skip=skip,
        limit=limit,
        product_id=product_id,
        warehouse_id=warehouse_id,
        supplier_id=supplier_id,
        tab=tab,
    )


@router.get("/{product_id}/{warehouse_id}", response_model=InventoryItemResponse)
async def get_inventory_item(product_id: int, warehouse_id: int, db: Session = Depends(get_db)):
    service = InventoryService(db)
    item = service.get_inventory_item_by_product_warehouse(product_id, warehouse_id)
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
    product_ids = set()
    for item in by_product:
        product_ids.add(item.get("product_id"))
        # available warehouse count not in product item; derive from by_warehouse
    by_warehouse = service.get_inventory_by_warehouse()
    for warehouse in by_warehouse:
        warehouse_ids.add(warehouse.get("warehouse_id"))

    return InventoryStats(
        total_products=len(product_ids),
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
