"""Product master CRUD endpoints (standalone)."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.masters_models import Product
from app.schemas.masters_schema import ProductCreate, ProductResponse, ProductUpdate


router = APIRouter(prefix="/products", tags=["products"])


@router.get("", response_model=list[ProductResponse])
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
    return products


@router.get("/{product_code}", response_model=ProductResponse)
def get_product(product_code: str, db: Session = Depends(get_db)):
    """Fetch a product by its code (maker_part_code)."""
    product = db.query(Product).filter(Product.maker_part_code == product_code).first()
    if not product:
        raise HTTPException(status_code=404, detail="製品が見つかりません")
    return product


@router.post("", response_model=ProductResponse, status_code=201)
def create_product(product: ProductCreate, db: Session = Depends(get_db)):
    """Create a new product."""
    exists = db.query(Product).filter(Product.maker_part_code == product.maker_part_code).first()
    if exists:
        raise HTTPException(status_code=400, detail="製品コードが既に存在します")

    payload = product.model_dump()
    payload.pop("packaging", None)
    # requires_lot_number is stored as integer flags in the DB
    requires_lot_number = payload.get("requires_lot_number")
    if requires_lot_number is not None:
        payload["requires_lot_number"] = 1 if requires_lot_number else 0

    db_product = Product(**payload)
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    return db_product


@router.put("/{product_code}", response_model=ProductResponse)
def update_product(product_code: str, product: ProductUpdate, db: Session = Depends(get_db)):
    """Update an existing product (by maker_part_code)."""
    db_product = db.query(Product).filter(Product.maker_part_code == product_code).first()
    if not db_product:
        raise HTTPException(status_code=404, detail="製品が見つかりません")

    updates = product.model_dump(exclude_unset=True)
    updates.pop("packaging", None)
    if "requires_lot_number" in updates and updates["requires_lot_number"] is not None:
        updates["requires_lot_number"] = 1 if updates["requires_lot_number"] else 0

    for key, value in updates.items():
        setattr(db_product, key, value)

    db.commit()
    db.refresh(db_product)
    return db_product


@router.delete("/{product_code}", status_code=204)
def delete_product(product_code: str, db: Session = Depends(get_db)):
    """Delete a product by its code (maker_part_code)."""
    db_product = db.query(Product).filter(Product.maker_part_code == product_code).first()
    if not db_product:
        raise HTTPException(status_code=404, detail="製品が見つかりません")

    db.delete(db_product)
    db.commit()
    return None
