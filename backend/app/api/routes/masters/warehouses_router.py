"""Warehouse master CRUD endpoints (standalone)."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.masters.masters_schema import WarehouseCreate, WarehouseResponse, WarehouseUpdate
from app.services.masters.warehouse_service import WarehouseService


router = APIRouter(prefix="/warehouses", tags=["warehouses"])


@router.get("", response_model=list[WarehouseResponse])
def list_warehouses(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    """List warehouses."""
    service = WarehouseService(db)
    return service.get_all()


@router.get("/{warehouse_code}", response_model=WarehouseResponse)
def get_warehouse(warehouse_code: str, db: Session = Depends(get_db)):
    """Get warehouse by code."""
    service = WarehouseService(db)
    return service.get_by_id(warehouse_code)


@router.post("", response_model=WarehouseResponse, status_code=201)
def create_warehouse(warehouse: WarehouseCreate, db: Session = Depends(get_db)):
    """Create warehouse."""
    service = WarehouseService(db)
    return service.create(warehouse)


@router.put("/{warehouse_code}", response_model=WarehouseResponse)
def update_warehouse(
    warehouse_code: str, warehouse: WarehouseUpdate, db: Session = Depends(get_db)
):
    """Update warehouse."""
    service = WarehouseService(db)
    return service.update(warehouse_code, warehouse)


@router.delete("/{warehouse_code}", status_code=204)
def delete_warehouse(warehouse_code: str, db: Session = Depends(get_db)):
    """Delete warehouse."""
    service = WarehouseService(db)
    service.delete(warehouse_code)
    return None
