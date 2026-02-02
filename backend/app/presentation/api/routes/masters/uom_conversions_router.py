"""UOM conversions router (単位換算ルーター)."""

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.application.services.common.export_service import ExportService
from app.application.services.masters.uom_conversion_service import UomConversionService
from app.core.database import get_db
from app.infrastructure.persistence.models.auth_models import User
from app.infrastructure.persistence.models.masters_models import ProductUomConversion
from app.infrastructure.persistence.models.supplier_item_model import SupplierItem
from app.presentation.api.routes.auth.auth_router import get_current_admin
from app.presentation.schemas.masters.masters_schema import BulkUpsertResponse
from app.presentation.schemas.masters.uom_conversions_schema import (
    UomConversionBulkUpsertRequest,
    UomConversionCreate,
    UomConversionResponse,
    UomConversionUpdate,
)


router = APIRouter(prefix="/uom-conversions", tags=["masters"])


@router.get("")
def list_uom_conversions(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    supplier_item_id: int | None = Query(None),
    include_inactive: bool = Query(False),
    db: Session = Depends(get_db),
):
    """Get UOM conversions (単位換算一覧)."""
    query = select(
        ProductUomConversion.conversion_id,
        ProductUomConversion.supplier_item_id,
        ProductUomConversion.external_unit,
        ProductUomConversion.factor,
        SupplierItem.maker_part_no,
        SupplierItem.display_name,
        ProductUomConversion.valid_to,
    ).join(SupplierItem, ProductUomConversion.supplier_item_id == SupplierItem.id)

    if supplier_item_id is not None:
        query = query.where(ProductUomConversion.supplier_item_id == supplier_item_id)

    if not include_inactive:
        query = query.where(ProductUomConversion.get_active_filter())

    query = query.offset(skip).limit(limit)
    results = db.execute(query).all()

    return [
        {
            "conversion_id": r.conversion_id,
            "supplier_item_id": r.supplier_item_id,
            "external_unit": r.external_unit,
            "conversion_factor": float(r.factor),
            "remarks": None,
            "product_code": r.maker_part_no,
            "product_name": r.display_name,
            "valid_to": r.valid_to,
        }
        for r in results
    ]


@router.get("/export/download")
def export_uom_conversions(format: str = "csv", db: Session = Depends(get_db)):
    """Export UOM conversions."""
    query = select(
        ProductUomConversion.conversion_id,
        ProductUomConversion.supplier_item_id,
        ProductUomConversion.external_unit,
        ProductUomConversion.factor,
        SupplierItem.maker_part_no,
        SupplierItem.display_name,
    ).join(SupplierItem, ProductUomConversion.supplier_item_id == SupplierItem.id)

    results = db.execute(query).all()

    data = [
        {
            "conversion_id": r.conversion_id,
            "supplier_item_id": r.supplier_item_id,
            "external_unit": r.external_unit,
            "conversion_factor": float(r.factor),
            "remarks": None,
            "product_code": r.maker_part_no,
            "product_name": r.display_name,
        }
        for r in results
    ]

    if format == "xlsx":
        return ExportService.export_to_excel(data, "uom_conversions")
    return ExportService.export_to_csv(data, "uom_conversions")


@router.post("", status_code=status.HTTP_201_CREATED)
def create_uom_conversion(data: UomConversionCreate, db: Session = Depends(get_db)):
    """Create a new UOM conversion.

    Args:
        data: UOM conversion data (supplier_item_id, external_unit, factor)
        db: Database session

    Returns:
        Created UOM conversion with product info
    """
    service = UomConversionService(db)

    # Check if product exists
    product = db.query(SupplierItem).filter(SupplierItem.id == data.supplier_item_id).first()
    if not product:
        raise HTTPException(status_code=400, detail="Product not found")

    # Check for duplicate
    existing = service.get_by_key(data.supplier_item_id, data.external_unit)
    if existing:
        raise HTTPException(
            status_code=400,
            detail="UOM conversion for this product and external unit already exists",
        )

    # Create new conversion
    new_conversion = ProductUomConversion(
        supplier_item_id=data.supplier_item_id,
        external_unit=data.external_unit,
        factor=data.factor,
    )
    db.add(new_conversion)
    db.commit()
    db.refresh(new_conversion)

    return {
        "conversion_id": new_conversion.conversion_id,
        "supplier_item_id": new_conversion.supplier_item_id,
        "external_unit": new_conversion.external_unit,
        "conversion_factor": float(new_conversion.factor),
        "remarks": None,
        "product_code": product.maker_part_no,
        "product_name": product.display_name,
        "valid_to": new_conversion.valid_to,
    }


@router.post("/bulk-upsert", response_model=BulkUpsertResponse)
def bulk_upsert_uom_conversions(
    request: UomConversionBulkUpsertRequest, db: Session = Depends(get_db)
):
    """Bulk upsert UOM conversions by composite key (supplier_item_id,
    external_unit).

    - If a UOM conversion with the same composite key exists, it will be updated
    - If not, a new UOM conversion will be created

    Returns summary with counts of created/updated/failed records.
    """
    service = UomConversionService(db)
    return service.bulk_upsert(request.rows)


@router.put("/{conversion_id}", response_model=UomConversionResponse)
def update_uom_conversion(
    conversion_id: int,
    data: UomConversionUpdate,
    db: Session = Depends(get_db),
):
    """Update a UOM conversion by ID.

    Args:
        conversion_id: ID of the conversion to update
        data: Update data (factor)
        db: Database session

    Returns:
        Updated UOM conversion
    """
    service = UomConversionService(db)
    return service.update_by_id(conversion_id, data)


@router.delete("/{conversion_id}", status_code=204)
def delete_uom_conversion(
    conversion_id: int,
    end_date: date | None = Query(None),
    db: Session = Depends(get_db),
):
    """Delete a UOM conversion by ID.

    Args:
        conversion_id: ID of the conversion to delete
        end_date: Optional end date for validity
        db: Database session
    """
    service = UomConversionService(db)
    service.delete_by_id(conversion_id, end_date)
    return None


@router.delete("/{conversion_id}/permanent", status_code=204)
def permanent_delete_uom_conversion(
    conversion_id: int,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Permanently delete a UOM conversion by ID.

    Args:
        conversion_id: ID of the conversion to delete
        current_user: Authenticated admin user
        db: Database session
    """
    service = UomConversionService(db)
    service.permanent_delete_by_id(conversion_id)
    return None


@router.post("/{conversion_id}/restore", response_model=UomConversionResponse)
def restore_uom_conversion(
    conversion_id: int,
    db: Session = Depends(get_db),
):
    """Restore a soft-deleted UOM conversion.

    Args:
        conversion_id: ID of the conversion to restore
        db: Database session

    Returns:
        Restored UOM conversion
    """
    service = UomConversionService(db)
    return service.restore_by_id(conversion_id)
