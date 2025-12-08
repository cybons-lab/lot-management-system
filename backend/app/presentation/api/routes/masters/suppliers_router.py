"""Supplier master CRUD endpoints (standalone)."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.application.services.common.export_service import ExportService
from app.application.services.masters.supplier_service import SupplierService
from app.core.database import get_db
from app.presentation.schemas.masters.masters_schema import (
    BulkUpsertResponse,
    SupplierBulkUpsertRequest,
    SupplierCreate,
    SupplierResponse,
    SupplierUpdate,
)


router = APIRouter(prefix="/suppliers", tags=["suppliers"])


@router.get("", response_model=list[SupplierResponse])
def list_suppliers(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    """List suppliers."""
    service = SupplierService(db)
    return service.get_all(skip=skip, limit=limit)


@router.get("/template/download")
def download_suppliers_template(format: str = "csv", include_sample: bool = True):
    """Download supplier import template.

    Args:
        format: 'csv' or 'xlsx' (default: csv)
        include_sample: Whether to include a sample row (default: True)

    Returns:
        Template file for supplier import
    """
    return ExportService.export_template("suppliers", format=format, include_sample=include_sample)


@router.get("/export/download")
def export_suppliers(format: str = "csv", db: Session = Depends(get_db)):
    """Export suppliers to CSV or Excel."""
    service = SupplierService(db)
    suppliers = service.get_all()
    data = [SupplierResponse.model_validate(s).model_dump() for s in suppliers]

    if format == "xlsx":
        return ExportService.export_to_excel(data, "suppliers")
    return ExportService.export_to_csv(data, "suppliers")


@router.get("/{supplier_code}", response_model=SupplierResponse)
def get_supplier(supplier_code: str, db: Session = Depends(get_db)):
    """Get supplier by code."""
    service = SupplierService(db)
    return service.get_by_code(supplier_code)


@router.post("", response_model=SupplierResponse, status_code=201)
def create_supplier(supplier: SupplierCreate, db: Session = Depends(get_db)):
    """Create supplier."""
    service = SupplierService(db)
    # Check if exists
    existing = service.get_by_code(supplier.supplier_code, raise_404=False)
    if existing:
        from fastapi import HTTPException, status

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Supplier with this code already exists",
        )
    try:
        return service.create(supplier)
    except Exception as e:
        from fastapi import HTTPException, status
        from sqlalchemy.exc import IntegrityError

        if isinstance(e, IntegrityError):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Supplier with this code already exists",
            )
        raise e


@router.put("/{supplier_code}", response_model=SupplierResponse)
def update_supplier(supplier_code: str, supplier: SupplierUpdate, db: Session = Depends(get_db)):
    """Update supplier."""
    service = SupplierService(db)
    return service.update_by_code(supplier_code, supplier)


@router.delete("/{supplier_code}", status_code=204)
def delete_supplier(supplier_code: str, db: Session = Depends(get_db)):
    """Delete supplier."""
    service = SupplierService(db)
    service.delete_by_code(supplier_code)
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
