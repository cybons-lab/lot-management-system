"""Business logic for product operations."""

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import Product
from app.repositories.products_repository import ProductRepository
from app.schemas.masters.products_schema import ProductCreate, ProductUpdate


class ProductService:
    """Service layer orchestrating product use cases."""

    def __init__(self, session: Session) -> None:
        self.session = session
        self.repository = ProductRepository(session)

    def list_products(
        self, *, page: int, per_page: int, q: str | None
    ) -> tuple[list[Product], int]:
        """Return paginated products."""
        return self.repository.list(page=page, per_page=per_page, q=q)

    def get_product(self, product_id: int) -> Product:
        """Retrieve a single product or raise 404."""
        product = self.repository.get(product_id)
        if product is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
        return product

    def create_product(self, payload: ProductCreate) -> Product:
        """Create a product entry."""
        product = Product(**payload.model_dump())
        try:
            return self.repository.create(product)
        except IntegrityError as exc:  # TODO: inspect constraint name for precise messaging
            self.session.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Product code already exists",
            ) from exc

    def update_product(self, product_id: int, payload: ProductUpdate) -> Product:
        """Update an existing product."""
        product = self.get_product(product_id)
        for field, value in payload.model_dump(exclude_unset=True).items():
            setattr(product, field, value)

        try:
            return self.repository.update(product)
        except IntegrityError as exc:  # TODO: inspect constraint name for precise messaging
            self.session.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Product code already exists",
            ) from exc

    def delete_product(self, product_id: int) -> None:
        """Delete a product entry."""
        product = self.get_product(product_id)
        self.repository.delete(product)
