from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.masters_models import Product
from app.schemas.masters.products_schema import ProductCreate, ProductUpdate
from app.services.common.base_service import BaseService


class ProductService(BaseService[Product, ProductCreate, ProductUpdate, int]):
    """Service for managing products."""

    def __init__(self, db: Session):
        super().__init__(db, Product)

    def get_by_code(self, code: str, *, raise_404: bool = True) -> Product | None:
        """Get product by product code (maker_part_code)."""
        product = self.db.query(Product).filter(Product.maker_part_code == code).first()
        if not product and raise_404:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="製品が見つかりません"
            )
        return product

    def list(self, skip: int = 0, limit: int = 100, search: str | None = None) -> list[Product]:
        """List products with optional search."""
        query = self.db.query(Product)

        if search:
            query = query.filter(
                (Product.maker_part_code.contains(search)) | (Product.product_name.contains(search))
            )

        return query.order_by(Product.maker_part_code).offset(skip).limit(limit).all()

    def get_all(self) -> "list[Product]":
        """Get all products."""
        return self.db.query(Product).order_by(Product.maker_part_code).all()

    def create(self, schema: ProductCreate) -> Product:
        """Create a new product with field mapping."""
        exists = self.get_by_code(schema.product_code, raise_404=False)
        if exists:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="製品コードが既に存在します"
            )

        db_product = Product(
            maker_part_code=schema.product_code,
            product_name=schema.product_name,
            base_unit=schema.internal_unit,
            internal_unit=schema.internal_unit,
            external_unit=schema.external_unit,
            qty_per_internal_unit=schema.qty_per_internal_unit,
            consumption_limit_days=None,
        )
        self.db.add(db_product)
        self.db.commit()
        self.db.refresh(db_product)
        return db_product

    def update(self, id: int | str, schema: ProductUpdate) -> Product:
        """Update existing product.

        Args:
            id: Can be product_code (str) or id (int). Here we expect product_code.
            schema: Update data schema.
        """
        # Note: The router passes product_code as id
        if isinstance(id, str):
            db_product = self.get_by_code(id)
        else:
            db_product = self.get_by_id(id)

        if not db_product:
            raise HTTPException(status_code=404, detail="製品が見つかりません")

        updates = schema.model_dump(exclude_unset=True)
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

        self.db.commit()
        self.db.refresh(db_product)
        return db_product

    def delete(self, id: int | str) -> None:
        """Delete product."""
        if isinstance(id, str):
            db_product = self.get_by_code(id)
        else:
            db_product = self.get_by_id(id)

        if not db_product:
            raise HTTPException(status_code=404, detail="製品が見つかりません")

        self.db.delete(db_product)
        self.db.commit()
