"""Data access for product groups.

製品グループは supplier_items と customer_items を紐付けるグルーピングエンティティ。
"""

from typing import Any, cast

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.infrastructure.persistence.models import ProductGroup


class ProductGroupRepository:
    """Repository for product group persistence."""

    def __init__(self, session: Session) -> None:
        self.session = session

    def list(self, page: int, per_page: int, q: str | None) -> tuple[list[ProductGroup], int]:
        """Return product groups with pagination and optional search."""
        filters: list[Any] = []
        if q:
            pattern = f"%{q}%"
            filters.append(
                or_(
                    ProductGroup.maker_part_code.ilike(pattern),
                    ProductGroup.product_name.ilike(pattern),
                )
            )

        total_stmt = select(func.count(ProductGroup.id)).select_from(ProductGroup)
        if filters:
            total_stmt = total_stmt.where(*filters)
        total = self.session.execute(total_stmt).scalar_one()

        stmt = (
            select(ProductGroup)
            .order_by(ProductGroup.id)
            .offset((page - 1) * per_page)
            .limit(per_page)
        )
        if filters:
            stmt = stmt.where(*filters)

        items = cast(list[ProductGroup], self.session.execute(stmt).scalars().all())
        return items, total

    def get(self, product_group_id: int) -> ProductGroup | None:
        """Fetch a product group by id."""
        return cast(ProductGroup | None, self.session.get(ProductGroup, product_group_id))

    def create(self, product_group: ProductGroup) -> ProductGroup:
        """Persist a new product group."""
        self.session.add(product_group)
        self.session.flush()
        return product_group

    def update(self, product_group: ProductGroup) -> ProductGroup:
        """Flush changes for an existing product group."""
        self.session.flush()
        return product_group

    def delete(self, product_group: ProductGroup) -> None:
        """Delete a product group."""
        self.session.delete(product_group)
        self.session.flush()


# Backward compatibility alias
ProductRepository = ProductGroupRepository
