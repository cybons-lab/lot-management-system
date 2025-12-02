"""UOM conversions router (単位換算ルーター)."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.masters_models import Product, ProductUomConversion
from app.schemas.masters.masters_schema import BulkUpsertResponse
from app.schemas.masters.uom_conversions_schema import UomConversionBulkUpsertRequest
from app.services.common.export_service import ExportService
from app.services.masters.uom_conversion_service import UomConversionService


router = APIRouter(prefix="/uom-conversions", tags=["masters"])


@router.get("")
def list_uom_conversions(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    product_id: int | None = Query(None),
    db: Session = Depends(get_db),
):
    """Get UOM conversions (単位換算一覧)."""
    query = select(
        ProductUomConversion.conversion_id,
        ProductUomConversion.product_id,
        ProductUomConversion.external_unit,
        ProductUomConversion.factor,
        Product.maker_part_code,
        Product.product_name,
    ).join(Product, ProductUomConversion.product_id == Product.id)

    if product_id is not None:
        query = query.where(ProductUomConversion.product_id == product_id)

    query = query.offset(skip).limit(limit)
    results = db.execute(query).all()

    return [
        {
            "conversion_id": r.conversion_id,
            "product_id": r.product_id,
            "external_unit": r.external_unit,
            "conversion_factor": float(r.factor),
            "remarks": None,
            "product_code": r.maker_part_code,
            "product_name": r.product_name,
        }
        for r in results
    ]


@router.get("/export/download")
def export_uom_conversions(format: str = "csv", db: Session = Depends(get_db)):
    """Export UOM conversions."""
    query = select(
        ProductUomConversion.conversion_id,
        ProductUomConversion.product_id,
        ProductUomConversion.external_unit,
        ProductUomConversion.factor,
        Product.maker_part_code,
        Product.product_name,
    ).join(Product, ProductUomConversion.product_id == Product.id)

    results = db.execute(query).all()

    data = [
        {
            "conversion_id": r.conversion_id,
            "product_id": r.product_id,
            "external_unit": r.external_unit,
            "conversion_factor": float(r.factor),
            "remarks": None,
            "product_code": r.maker_part_code,
            "product_name": r.product_name,
        }
        for r in results
    ]

    if format == "xlsx":
        return ExportService.export_to_excel(data, "uom_conversions")
    return ExportService.export_to_csv(data, "uom_conversions")


@router.post("/bulk-upsert", response_model=BulkUpsertResponse)
def bulk_upsert_uom_conversions(
    request: UomConversionBulkUpsertRequest, db: Session = Depends(get_db)
):
    """Bulk upsert UOM conversions by composite key (product_id, external_unit).

    - If a UOM conversion with the same composite key exists, it will be updated
    - If not, a new UOM conversion will be created

    Returns summary with counts of created/updated/failed records.
    """
    service = UomConversionService(db)
    return service.bulk_upsert(request.rows)
