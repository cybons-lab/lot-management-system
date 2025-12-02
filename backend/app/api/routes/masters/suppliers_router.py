"""Supplier master CRUD endpoints (standalone)."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.masters.masters_schema import (
    BulkUpsertResponse,
    SupplierBulkUpsertRequest,
    SupplierCreate,
    SupplierResponse,
    SupplierUpdate,
)
from app.services.common.export_service import ExportService
from app.services.masters.supplier_service import SupplierService


router = APIRouter(prefix="/suppliers", tags=["suppliers"])


@router.get("", response_model=list[SupplierResponse])
def list_suppliers(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    """List suppliers."""
    service = SupplierService(db)
    return service.get_all()


@router.get("/{supplier_code}", response_model=SupplierResponse)
def get_supplier(supplier_code: str, db: Session = Depends(get_db)):
    """Get supplier by code."""
    service = SupplierService(db)
    return service.get_by_id(supplier_code)


@router.post("", response_model=SupplierResponse, status_code=201)
def create_supplier(supplier: SupplierCreate, db: Session = Depends(get_db)):
    """Create supplier."""
    service = SupplierService(db)
    return service.create(supplier)


@router.put("/{supplier_code}", response_model=SupplierResponse)
def update_supplier(supplier_code: str, supplier: SupplierUpdate, db: Session = Depends(get_db)):
    """Update supplier."""
    service = SupplierService(db)
    return service.update(supplier_code, supplier)


@router.delete("/{supplier_code}", status_code=204)
def delete_supplier(supplier_code: str, db: Session = Depends(get_db)):
    """Delete supplier."""
    service = SupplierService(db)
    service.delete(supplier_code)
    return None


@router.post("/bulk-upsert", response_model=BulkUpsertResponse)
def bulk_upsert_suppliers(request: SupplierBulkUpsertRequest, db: Session = Depends(get_db)):
    """Bulk upsert suppliers by supplier_code.
    
    - If a supplier with the same supplier_code exists, it will be updated
    - If not, a new supplier will be created
    
    Returns summary with counts of created/updated/failed records.
    """
    service = SupplierService(db)
    return service.bulk_upsert(request.rows)
