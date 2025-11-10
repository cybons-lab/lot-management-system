"""Data access for products."""

from typing import Any

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.models import Product


class ProductRepository:
    """Repository for product persistence."""

    def __init__(self, session: Session) -> None:
        self.session = session

    def list(self, page: int, per_page: int, q: str | None) -> tuple[list[Product], int]:
        """Return products with pagination and optional search."""
        filters: list[Any] = []
        if q:
            pattern = f"%{q}%"
            filters.append(
                or_(
                    Product.product_code.ilike(pattern),
                    Product.product_name.ilike(pattern),
                )
            )

        total_stmt = select(func.count(Product.id)).select_from(Product)
        if filters:
            total_stmt = total_stmt.where(*filters)
        total = self.session.execute(total_stmt).scalar_one()

        stmt = select(Product).order_by(Product.id).offset((page - 1) * per_page).limit(per_page)
        if filters:
            stmt = stmt.where(*filters)

        items = self.session.execute(stmt).scalars().all()
        return items, total

    def get(self, product_id: int) -> Product | None:
        """Fetch a product by id."""
        return self.session.get(Product, product_id)

    def create(self, product: Product) -> Product:
        """Persist a new product."""
        self.session.add(product)
        self.session.flush()
        return product

    def update(self, product: Product) -> Product:
        """Flush changes for an existing product."""
        self.session.flush()
        return product

    def delete(self, product: Product) -> None:
        """Delete a product."""
        self.session.delete(product)
        self.session.flush()
