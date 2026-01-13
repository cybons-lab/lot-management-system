"""Master status router."""

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.infrastructure.persistence.models.masters_models import (
    CustomerItem,
    Product,
)
from app.infrastructure.persistence.models.product_supplier_models import ProductSupplier
from app.presentation.api.deps import get_db


router = APIRouter()


@router.get("/status")
def get_master_status(db: Session = Depends(get_db)):
    """Get master data status including unmapped counts."""
    # 1. Unmapped Customer Items (No supplier assigned)
    unmapped_customer_items_count = (
        db.query(func.count(CustomerItem.customer_id))
        .filter(CustomerItem.supplier_id.is_(None))
        .scalar()
    )

    # 2. Unmapped Products (No supplier assigned in ProductSupplier)
    # products table LEFT JOIN product_suppliers table
    unmapped_products_count = (
        db.query(func.count(Product.id))
        .outerjoin(ProductSupplier, Product.id == ProductSupplier.product_id)
        .filter(ProductSupplier.id.is_(None))
        .scalar()
    )

    return {
        "unmapped_customer_items_count": unmapped_customer_items_count,
        "unmapped_products_count": unmapped_products_count,
    }
