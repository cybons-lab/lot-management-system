"""Supplier master CRUD endpoints (standalone)."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.masters_models import Supplier
from app.schemas.masters.masters_schema import SupplierCreate, SupplierResponse, SupplierUpdate


router = APIRouter(prefix="/suppliers", tags=["suppliers"])


@router.get("", response_model=list[SupplierResponse])
def list_suppliers(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    """List suppliers."""
    suppliers = db.query(Supplier).order_by(Supplier.supplier_code).offset(skip).limit(limit).all()
    return suppliers


@router.get("/{supplier_code}", response_model=SupplierResponse)
def get_supplier(supplier_code: str, db: Session = Depends(get_db)):
    """Get supplier by code."""
    supplier = db.query(Supplier).filter(Supplier.supplier_code == supplier_code).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="仕入先が見つかりません")
    return supplier


@router.post("", response_model=SupplierResponse, status_code=201)
def create_supplier(supplier: SupplierCreate, db: Session = Depends(get_db)):
    """Create supplier."""
    exists = db.query(Supplier).filter(Supplier.supplier_code == supplier.supplier_code).first()
    if exists:
        raise HTTPException(status_code=400, detail="仕入先コードが既に存在します")

    db_supplier = Supplier(**supplier.model_dump())
    db.add(db_supplier)
    db.commit()
    db.refresh(db_supplier)
    return db_supplier


@router.put("/{supplier_code}", response_model=SupplierResponse)
def update_supplier(supplier_code: str, supplier: SupplierUpdate, db: Session = Depends(get_db)):
    """Update supplier."""
    db_supplier = db.query(Supplier).filter(Supplier.supplier_code == supplier_code).first()
    if not db_supplier:
        raise HTTPException(status_code=404, detail="仕入先が見つかりません")

    for key, value in supplier.model_dump(exclude_unset=True).items():
        setattr(db_supplier, key, value)

    db.commit()
    db.refresh(db_supplier)
    return db_supplier


@router.delete("/{supplier_code}", status_code=204)
def delete_supplier(supplier_code: str, db: Session = Depends(get_db)):
    """Delete supplier."""
    db_supplier = db.query(Supplier).filter(Supplier.supplier_code == supplier_code).first()
    if not db_supplier:
        raise HTTPException(status_code=404, detail="仕入先が見つかりません")

    db.delete(db_supplier)
    db.commit()
    return None
