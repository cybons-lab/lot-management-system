"""Supplier products router (仕入先商品ルーター).

product_suppliers テーブルから製品と仕入先の関連を取得。
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.application.services.common.export_service import ExportService
from app.core.database import get_db
from app.infrastructure.persistence.models.masters_models import Product, Supplier
from app.infrastructure.persistence.models.product_supplier_models import ProductSupplier


router = APIRouter(prefix="/supplier-products", tags=["masters"])


@router.get("")
def list_supplier_products(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    supplier_id: int | None = Query(None),
    db: Session = Depends(get_db),
):
    """Get supplier products (仕入先商品一覧).

    product_suppliers テーブルから製品-仕入先の関連を取得。
    """
    query = (
        select(
            ProductSupplier.product_id,
            ProductSupplier.supplier_id,
            ProductSupplier.is_primary,
            ProductSupplier.lead_time_days,
            Product.maker_part_code,
            Product.product_name,
            Supplier.supplier_code,
            Supplier.supplier_name,
        )
        .join(Product, ProductSupplier.product_id == Product.id)
        .join(Supplier, ProductSupplier.supplier_id == Supplier.id)
    )

    if supplier_id is not None:
        query = query.where(ProductSupplier.supplier_id == supplier_id)

    query = query.offset(skip).limit(limit)
    results = db.execute(query).all()

    return [
        {
            "product_id": r.product_id,
            "supplier_id": r.supplier_id,
            "is_primary": r.is_primary,
            "lead_time_days": r.lead_time_days,
            "product_code": r.maker_part_code,
            "product_name": r.product_name,
            "supplier_code": r.supplier_code,
            "supplier_name": r.supplier_name,
        }
        for r in results
    ]


@router.get("/export/download")
def export_supplier_products(format: str = "csv", db: Session = Depends(get_db)):
    """Export supplier products."""
    query = (
        select(
            ProductSupplier.product_id,
            ProductSupplier.supplier_id,
            ProductSupplier.is_primary,
            ProductSupplier.lead_time_days,
            Product.maker_part_code,
            Product.product_name,
            Supplier.supplier_code,
            Supplier.supplier_name,
        )
        .join(Product, ProductSupplier.product_id == Product.id)
        .join(Supplier, ProductSupplier.supplier_id == Supplier.id)
    )
    results = db.execute(query).all()

    data = [
        {
            "product_id": r.product_id,
            "supplier_id": r.supplier_id,
            "is_primary": r.is_primary,
            "lead_time_days": r.lead_time_days,
            "product_code": r.maker_part_code,
            "product_name": r.product_name,
            "supplier_code": r.supplier_code,
            "supplier_name": r.supplier_name,
        }
        for r in results
    ]

    if format == "xlsx":
        return ExportService.export_to_excel(data, "supplier_products")
    return ExportService.export_to_csv(data, "supplier_products")
