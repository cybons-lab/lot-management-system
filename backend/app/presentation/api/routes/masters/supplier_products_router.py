"""Supplier products router (仕入先商品ルーター).

product_suppliers テーブルから製品と仕入先の関連を取得。
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.application.services.common.export_service import ExportService
from app.core.database import get_db
from app.infrastructure.persistence.models.masters_models import Product, Supplier
from app.infrastructure.persistence.models.product_supplier_models import ProductSupplier
from app.presentation.schemas.masters.masters_schema import (
    SupplierProductCreate,
    SupplierProductResponse,
    SupplierProductUpdate,
)


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
            ProductSupplier.id,
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
            "id": r.id,
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
            ProductSupplier.id,
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
            "id": r.id,
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


@router.get("/{id}", response_model=SupplierProductResponse)
def get_supplier_product(id: int, db: Session = Depends(get_db)):
    """Get a supplier product by ID."""
    sp = db.query(ProductSupplier).filter(ProductSupplier.id == id).first()
    if not sp:
        raise HTTPException(status_code=404, detail="Supplier product not found")

    # Reload relationships to ensure we have product and supplier info
    db.refresh(sp)

    return {
        "id": sp.id,
        "product_id": sp.product_id,
        "supplier_id": sp.supplier_id,
        "is_primary": sp.is_primary,
        "lead_time_days": sp.lead_time_days,
        "product_code": sp.product.maker_part_code,
        "product_name": sp.product.product_name,
        "supplier_code": sp.supplier.supplier_code,
        "supplier_name": sp.supplier.supplier_name,
        "created_at": sp.created_at,
        "updated_at": sp.updated_at,
    }


@router.post("", response_model=SupplierProductResponse, status_code=status.HTTP_201_CREATED)
def create_supplier_product(data: SupplierProductCreate, db: Session = Depends(get_db)):
    """Create a new supplier product."""
    # Check if exists
    existing = (
        db.query(ProductSupplier)
        .filter(
            ProductSupplier.product_id == data.product_id,
            ProductSupplier.supplier_id == data.supplier_id,
        )
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="This product-supplier pair already exists")

    # If is_primary is True, unset others for this product
    if data.is_primary:
        db.query(ProductSupplier).filter(
            ProductSupplier.product_id == data.product_id, ProductSupplier.is_primary.is_(True)
        ).update({"is_primary": False})

    sp = ProductSupplier(
        product_id=data.product_id,
        supplier_id=data.supplier_id,
        is_primary=data.is_primary,
        lead_time_days=data.lead_time_days,
    )
    db.add(sp)
    db.commit()
    db.refresh(sp)

    return {
        "id": sp.id,
        "product_id": sp.product_id,
        "supplier_id": sp.supplier_id,
        "is_primary": sp.is_primary,
        "lead_time_days": sp.lead_time_days,
        "product_code": sp.product.maker_part_code,
        "product_name": sp.product.product_name,
        "supplier_code": sp.supplier.supplier_code,
        "supplier_name": sp.supplier.supplier_name,
        "created_at": sp.created_at,
        "updated_at": sp.updated_at,
    }


@router.put("/{id}", response_model=SupplierProductResponse)
def update_supplier_product(id: int, data: SupplierProductUpdate, db: Session = Depends(get_db)):
    """Update a supplier product."""
    sp = db.query(ProductSupplier).filter(ProductSupplier.id == id).first()
    if not sp:
        raise HTTPException(status_code=404, detail="Supplier product not found")

    update_data = data.model_dump(exclude_unset=True)

    # If setting is_primary=True, unset others for this product
    if update_data.get("is_primary"):
        db.query(ProductSupplier).filter(
            ProductSupplier.product_id == sp.product_id,
            ProductSupplier.id != id,
            ProductSupplier.is_primary.is_(True),
        ).update({"is_primary": False})

    for field, value in update_data.items():
        setattr(sp, field, value)

    db.commit()
    db.refresh(sp)

    return {
        "id": sp.id,
        "product_id": sp.product_id,
        "supplier_id": sp.supplier_id,
        "is_primary": sp.is_primary,
        "lead_time_days": sp.lead_time_days,
        "product_code": sp.product.maker_part_code,
        "product_name": sp.product.product_name,
        "supplier_code": sp.supplier.supplier_code,
        "supplier_name": sp.supplier.supplier_name,
        "created_at": sp.created_at,
        "updated_at": sp.updated_at,
    }


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_supplier_product(id: int, db: Session = Depends(get_db)):
    """Delete a supplier product."""
    sp = db.query(ProductSupplier).filter(ProductSupplier.id == id).first()
    if not sp:
        raise HTTPException(status_code=404, detail="Supplier product not found")

    db.delete(sp)
    db.commit()
    return None
