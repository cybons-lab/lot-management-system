"""Warehouse master CRUD endpoints (standalone)."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.application.services.common.export_service import ExportService
from app.application.services.masters.warehouse_service import WarehouseService
from app.core.database import get_db
from app.presentation.schemas.masters.masters_schema import (
    BulkUpsertResponse,
    WarehouseBulkUpsertRequest,
    WarehouseCreate,
    WarehouseResponse,
    WarehouseUpdate,
)


router = APIRouter(prefix="/warehouses", tags=["warehouses"])


@router.get("", response_model=list[WarehouseResponse])
def list_warehouses(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    """List warehouses."""
    service = WarehouseService(db)
    return service.get_all(skip=skip, limit=limit)


@router.get("/template/download")
def download_warehouses_template(format: str = "csv", include_sample: bool = True):
    """Download warehouse import template.

    Args:
        format: 'csv' or 'xlsx' (default: csv)
        include_sample: Whether to include a sample row (default: True)

    Returns:
        Template file for warehouse import
    """
    return ExportService.export_template("warehouses", format=format, include_sample=include_sample)


@router.get("/export/download")
def export_warehouses(format: str = "csv", db: Session = Depends(get_db)):
    """Export warehouses to CSV or Excel."""
    service = WarehouseService(db)
    warehouses = service.get_all()
    data = [WarehouseResponse.model_validate(w).model_dump() for w in warehouses]

    if format == "xlsx":
        return ExportService.export_to_excel(data, "warehouses")
    return ExportService.export_to_csv(data, "warehouses")


@router.get("/{warehouse_code}", response_model=WarehouseResponse)
def get_warehouse(warehouse_code: str, db: Session = Depends(get_db)):
    """Get warehouse by code."""
    service = WarehouseService(db)
    return service.get_by_code(warehouse_code)


@router.post("", response_model=WarehouseResponse, status_code=201)
def create_warehouse(warehouse: WarehouseCreate, db: Session = Depends(get_db)):
    """Create warehouse."""
    service = WarehouseService(db)
    # Check if exists
    existing = service.get_by_code(warehouse.warehouse_code, raise_404=False)
    if existing:
        from fastapi import HTTPException, status

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Warehouse with this code already exists",
        )
    try:
        return service.create(warehouse)
    except Exception as e:
        from fastapi import HTTPException, status
        from sqlalchemy.exc import IntegrityError

        if isinstance(e, IntegrityError):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Warehouse with this code already exists",
            )
        raise e


@router.put("/{warehouse_code}", response_model=WarehouseResponse)
def update_warehouse(
    warehouse_code: str, warehouse: WarehouseUpdate, db: Session = Depends(get_db)
):
    """Update warehouse."""
    service = WarehouseService(db)
    return service.update_by_code(warehouse_code, warehouse)


@router.delete("/{warehouse_code}", status_code=204)
def delete_warehouse(warehouse_code: str, db: Session = Depends(get_db)):
    """Delete warehouse."""
    service = WarehouseService(db)
    service.delete_by_code(warehouse_code)
    return None


@router.post("/bulk-upsert", response_model=BulkUpsertResponse)
def bulk_upsert_warehouses(request: WarehouseBulkUpsertRequest, db: Session = Depends(get_db)):
    """Bulk upsert warehouses by warehouse_code.

    - If a warehouse with the same warehouse_code exists, it will be updated
    - If not, a new warehouse will be created

    Returns summary with counts of created/updated/failed records.
    """
    service = WarehouseService(db)
    return service.bulk_upsert(request.rows)
