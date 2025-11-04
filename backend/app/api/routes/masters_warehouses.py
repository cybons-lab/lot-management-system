"""Warehouse master CRUD endpoints."""
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.models import Warehouse
from app.schemas import WarehouseCreate, WarehouseResponse, WarehouseUpdate

router = APIRouter(prefix="/warehouses")


@router.get("", response_model=List[WarehouseResponse])
def list_warehouses(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    """List warehouses."""

    warehouses = (
        db.query(Warehouse)
        .order_by(Warehouse.warehouse_code)
        .offset(skip)
        .limit(limit)
        .all()
    )
    return warehouses


@router.get("/{warehouse_code}", response_model=WarehouseResponse)
def get_warehouse(warehouse_code: str, db: Session = Depends(get_db)):
    """Get warehouse by code."""

    warehouse = (
        db.query(Warehouse)
        .filter(Warehouse.warehouse_code == warehouse_code)
        .first()
    )
    if not warehouse:
        raise HTTPException(status_code=404, detail="倉庫が見つかりません")
    return warehouse


@router.post("", response_model=WarehouseResponse, status_code=201)
def create_warehouse(warehouse: WarehouseCreate, db: Session = Depends(get_db)):
    """Create warehouse."""

    exists = (
        db.query(Warehouse)
        .filter(Warehouse.warehouse_code == warehouse.warehouse_code)
        .first()
    )
    if exists:
        raise HTTPException(status_code=400, detail="倉庫コードが既に存在します")

    db_warehouse = Warehouse(**warehouse.model_dump())
    db.add(db_warehouse)
    db.commit()
    db.refresh(db_warehouse)
    return db_warehouse


@router.put("/{warehouse_code}", response_model=WarehouseResponse)
def update_warehouse(
    warehouse_code: str, warehouse: WarehouseUpdate, db: Session = Depends(get_db)
):
    """Update warehouse."""

    db_warehouse = (
        db.query(Warehouse)
        .filter(Warehouse.warehouse_code == warehouse_code)
        .first()
    )
    if not db_warehouse:
        raise HTTPException(status_code=404, detail="倉庫が見つかりません")

    for key, value in warehouse.model_dump(exclude_unset=True).items():
        setattr(db_warehouse, key, value)

    db.commit()
    db.refresh(db_warehouse)
    return db_warehouse


@router.delete("/{warehouse_code}", status_code=204)
def delete_warehouse(warehouse_code: str, db: Session = Depends(get_db)):
    """Delete warehouse."""

    db_warehouse = (
        db.query(Warehouse)
        .filter(Warehouse.warehouse_code == warehouse_code)
        .first()
    )
    if not db_warehouse:
        raise HTTPException(status_code=404, detail="倉庫が見つかりません")

    db.delete(db_warehouse)
    db.commit()
    return None
