"""Product master CRUD endpoints (standalone)."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.masters_models import Product
from app.schemas.masters.products_schema import ProductCreate, ProductOut, ProductUpdate
from app.services.masters.product_service import ProductService


router = APIRouter(prefix="/products", tags=["products"])


def _to_product_out(product: Product) -> ProductOut:
    """Map a Product ORM model to the canonical ProductOut schema."""
    return ProductOut(
        id=product.id,
        product_code=product.maker_part_code,
        product_name=product.product_name,
        internal_unit=product.internal_unit,
        external_unit=product.external_unit,
        qty_per_internal_unit=float(product.qty_per_internal_unit),
        customer_part_no=None,
        maker_item_code=None,
        is_active=True,
        created_at=product.created_at,
        updated_at=product.updated_at,
    )


@router.get("", response_model=list[ProductOut])
def list_products(
    skip: int = 0,
    limit: int = 100,
    search: str | None = None,
    db: Session = Depends(get_db),
):
    """Return a paginated list of products."""
    """Return a paginated list of products."""
    service = ProductService(db)
    products = service.list(skip=skip, limit=limit, search=search)
    return [_to_product_out(product) for product in products]


@router.get("/{product_code}", response_model=ProductOut)
def get_product(product_code: str, db: Session = Depends(get_db)):
    """Fetch a product by its code (maker_part_code)."""
    """Fetch a product by its code (maker_part_code)."""
    service = ProductService(db)
    product = service.get_by_code(product_code)
    return _to_product_out(product)


@router.post("", response_model=ProductOut, status_code=201)
def create_product(product: ProductCreate, db: Session = Depends(get_db)):
    """Create a new product."""
    """Create a new product."""
    service = ProductService(db)
    db_product = service.create(product)
    return _to_product_out(db_product)


@router.put("/{product_code}", response_model=ProductOut)
def update_product(product_code: str, product: ProductUpdate, db: Session = Depends(get_db)):
    """Update an existing product (by maker_part_code)."""
    """Update an existing product (by maker_part_code)."""
    service = ProductService(db)
    db_product = service.update(product_code, product)
    return _to_product_out(db_product)


@router.delete("/{product_code}", status_code=204)
def delete_product(product_code: str, db: Session = Depends(get_db)):
    """Delete a product by its code (maker_part_code)."""
    """Delete a product by its code (maker_part_code)."""
    service = ProductService(db)
    service.delete(product_code)
    return None
