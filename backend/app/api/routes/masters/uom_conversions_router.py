"""UOM conversions router (単位換算ルーター)."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.masters_models import Product, ProductUomConversion


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
        ProductUomConversion.conversion_factor,
        ProductUomConversion.remarks,
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
            "conversion_factor": float(r.conversion_factor),
            "remarks": r.remarks,
            "product_code": r.maker_part_code,
            "product_name": r.product_name,
        }
        for r in results
    ]
