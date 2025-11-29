"""Supplier products router (仕入先商品ルーター).

CustomerItem テーブルから supplier_id が NOT NULL のレコードを仕入先商品として扱う。
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.masters_models import CustomerItem, Product, Supplier
from app.services.common.export_service import ExportService


router = APIRouter(prefix="/supplier-products", tags=["masters"])


@router.get("")
def list_supplier_products(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    supplier_id: int | None = Query(None),
    db: Session = Depends(get_db),
):
    """Get supplier products (仕入先商品一覧).

    CustomerItem テーブルから supplier_id が NOT NULL のレコードを取得。
    """
    query = (
        select(
            CustomerItem.customer_id,
            CustomerItem.external_product_code,
            CustomerItem.product_id,
            CustomerItem.supplier_id,
            CustomerItem.pack_unit,
            CustomerItem.pack_quantity,
            Product.maker_part_code,
            Product.product_name,
            Supplier.supplier_code,
            Supplier.supplier_name,
        )
        .join(Product, CustomerItem.product_id == Product.id)
        .join(Supplier, CustomerItem.supplier_id == Supplier.id)
        .where(CustomerItem.supplier_id.isnot(None))
    )

    if supplier_id is not None:
        query = query.where(CustomerItem.supplier_id == supplier_id)

    query = query.offset(skip).limit(limit)
    results = db.execute(query).all()

    return [
        {
            "customer_id": r.customer_id,
            "external_product_code": r.external_product_code,
            "product_id": r.product_id,
            "supplier_id": r.supplier_id,
            "order_unit": r.pack_unit,
            "order_lot_size": float(r.pack_quantity) if r.pack_quantity else None,
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
            CustomerItem.customer_id,
            CustomerItem.external_product_code,
            CustomerItem.product_id,
            CustomerItem.supplier_id,
            CustomerItem.pack_unit,
            CustomerItem.pack_quantity,
            Product.maker_part_code,
            Product.product_name,
            Supplier.supplier_code,
            Supplier.supplier_name,
        )
        .join(Product, CustomerItem.product_id == Product.id)
        .join(Supplier, CustomerItem.supplier_id == Supplier.id)
        .where(CustomerItem.supplier_id.isnot(None))
    )
    results = db.execute(query).all()

    data = [
        {
            "customer_id": r.customer_id,
            "external_product_code": r.external_product_code,
            "product_id": r.product_id,
            "supplier_id": r.supplier_id,
            "order_unit": r.pack_unit,
            "order_lot_size": float(r.pack_quantity) if r.pack_quantity else None,
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
