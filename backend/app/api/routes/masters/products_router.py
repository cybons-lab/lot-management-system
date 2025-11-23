"""Product master CRUD endpoints (standalone)."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.masters_models import Product
from app.schemas.masters.products_schema import ProductCreate, ProductOut, ProductUpdate


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
    query = db.query(Product)

    if search:
        query = query.filter(
            (Product.maker_part_code.contains(search)) | (Product.product_name.contains(search))
        )

    products = query.order_by(Product.maker_part_code).offset(skip).limit(limit).all()
    return [_to_product_out(product) for product in products]


@router.get("/{product_code}", response_model=ProductOut)
def get_product(product_code: str, db: Session = Depends(get_db)):
    """Fetch a product by its code (maker_part_code)."""
    product = db.query(Product).filter(Product.maker_part_code == product_code).first()
    if not product:
        raise HTTPException(status_code=404, detail="製品が見つかりません")
    return _to_product_out(product)


@router.post("", response_model=ProductOut, status_code=201)
def create_product(product: ProductCreate, db: Session = Depends(get_db)):
    """Create a new product."""
    exists = db.query(Product).filter(Product.maker_part_code == product.product_code).first()
    if exists:
        raise HTTPException(status_code=400, detail="製品コードが既に存在します")

    db_product = Product(
        maker_part_code=product.product_code,
        product_name=product.product_name,
        base_unit=product.internal_unit,
        internal_unit=product.internal_unit,
        external_unit=product.external_unit,
        qty_per_internal_unit=product.qty_per_internal_unit,
        consumption_limit_days=None,
    )
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    return _to_product_out(db_product)


@router.put("/{product_code}", response_model=ProductOut)
def update_product(product_code: str, product: ProductUpdate, db: Session = Depends(get_db)):
    """Update an existing product (by maker_part_code)."""
    db_product = db.query(Product).filter(Product.maker_part_code == product_code).first()
    if not db_product:
        raise HTTPException(status_code=404, detail="製品が見つかりません")

    updates = product.model_dump(exclude_unset=True)
    if "product_code" in updates:
        db_product.maker_part_code = updates["product_code"]
    if "product_name" in updates:
        db_product.product_name = updates["product_name"]
    if "internal_unit" in updates:
        db_product.internal_unit = updates["internal_unit"]
        db_product.base_unit = updates["internal_unit"]
    if "external_unit" in updates:
        db_product.external_unit = updates["external_unit"]
    if "qty_per_internal_unit" in updates:
        db_product.qty_per_internal_unit = updates["qty_per_internal_unit"]

    db.commit()
    db.refresh(db_product)
    return _to_product_out(db_product)


@router.delete("/{product_code}", status_code=204)
def delete_product(product_code: str, db: Session = Depends(get_db)):
    """Delete a product by its code (maker_part_code)."""
    db_product = db.query(Product).filter(Product.maker_part_code == product_code).first()
    if not db_product:
        raise HTTPException(status_code=404, detail="製品が見つかりません")

    db.delete(db_product)
    db.commit()
    return None
