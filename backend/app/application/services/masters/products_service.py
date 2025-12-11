"""Business logic for product operations."""

from __future__ import annotations

from datetime import date
from typing import cast

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.application.services.common.base_service import BaseService
from app.infrastructure.persistence.models import Product
from app.infrastructure.persistence.repositories.products_repository import ProductRepository
from app.presentation.schemas.masters.masters_schema import BulkUpsertResponse, BulkUpsertSummary
from app.presentation.schemas.masters.products_schema import (
    ProductBulkRow,
    ProductCreate,
    ProductUpdate,
)


class ProductService(BaseService[Product, ProductCreate, ProductUpdate, int]):
    """Service layer orchestrating product use cases.

    Inherits common CRUD operations from BaseService:
    - get_by_id(product_id) -> Product
    - create(payload) -> Product
    - update(product_id, payload) -> Product
    - delete(product_id) -> None

    Custom business logic is implemented below.
    """

    def __init__(self, db: Session) -> None:
        """Initialize ProductService.

        Args:
            db: Database session (parameter name changed from 'session' to 'db' for Router compatibility)
        """
        super().__init__(db=db, model=Product)
        self.repository = ProductRepository(db)

    def get_by_code(self, code: str, *, raise_404: bool = True) -> Product | None:
        """Get product by product code (maker_part_code).

        Args:
            code: Product code (maker_part_code)
            raise_404: Whether to raise 404 error if not found

        Returns:
            Product if found, None otherwise (if raise_404=False)

        Raises:
            HTTPException: 404 if product not found and raise_404=True
        """
        product = cast(
            Product | None,
            self.db.query(Product).filter(Product.maker_part_code == code).first(),
        )
        if not product and raise_404:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="製品が見つかりません"
            )
        return product

    def list_items(
        self,
        skip: int = 0,
        limit: int = 100,
        search: str | None = None,
        *,
        include_inactive: bool = False,
    ) -> list[Product]:
        """List products with optional search.

        Args:
            skip: Number of records to skip
            limit: Maximum number of records to return
            search: Optional search query for product_code or product_name
            include_inactive: If True, include soft-deleted products

        Returns:
            List of products
        """
        from sqlalchemy import func

        query = self.db.query(Product)

        # Filter out soft-deleted records by default
        if not include_inactive:
            query = query.filter(Product.valid_to > func.current_date())

        if search:
            query = query.filter(
                (Product.maker_part_code.contains(search)) | (Product.product_name.contains(search))
            )

        return cast(
            list[Product],
            query.options(joinedload(Product.product_suppliers))
            .order_by(Product.maker_part_code)
            .offset(skip)
            .limit(limit)
            .all(),
        )

    def get_all(self) -> list[Product]:  # type: ignore[override]
        """Get all products.

        Returns:
            List of all products ordered by product code
        """
        return cast(list[Product], self.db.query(Product).order_by(Product.maker_part_code).all())

    def create(self, payload: ProductCreate) -> Product:
        """Create new product with field mapping."""
        data = payload.model_dump()
        # Map schema fields to model fields
        if "product_code" in data:
            data["maker_part_code"] = data.pop("product_code")

        # Remove fields not in model
        data.pop("customer_part_no", None)
        data.pop("maker_item_code", None)
        data.pop("is_active", None)

        # Set default base_unit if not present (Model requires it)
        if "base_unit" not in data:
            data["base_unit"] = data.get("internal_unit", "CAN")

        instance = self.model(**data)
        self.db.add(instance)
        try:
            self.db.commit()
            self.db.refresh(instance)
            return instance
        except Exception as exc:
            self.db.rollback()
            raise exc

    def update(self, id: int, payload: ProductUpdate) -> Product:
        """Update product with field mapping."""
        instance = self.get_by_id(id)
        assert instance is not None  # raise_404=True ensures this
        data = payload.model_dump(exclude_unset=True)

        if "product_code" in data:
            data["maker_part_code"] = data.pop("product_code")

        # Remove fields not in model
        data.pop("customer_part_no", None)
        data.pop("maker_item_code", None)
        data.pop("is_active", None)

        for field, value in data.items():
            setattr(instance, field, value)

        try:
            self.db.commit()
            self.db.refresh(instance)
            return instance
        except Exception as exc:
            self.db.rollback()
            raise exc

    def update_by_code(self, code: str, payload: ProductUpdate) -> Product:
        """Update product by product code."""
        product = self.get_by_code(code)
        assert product is not None  # raise_404=True ensures this
        return self.update(product.id, payload)

    def delete_by_code(self, code: str, *, end_date: date | None = None) -> None:
        """Soft delete product by product code."""
        product = self.get_by_code(code)
        assert product is not None
        self.delete(product.id, end_date=end_date)

    def hard_delete_by_code(self, code: str) -> None:
        """Permanently delete product by product code."""
        product = self.get_by_code(code)
        assert product is not None
        self.hard_delete(product.id)

    def restore_by_code(self, code: str) -> Product:
        """Restore a soft-deleted product by product code."""
        product = self.get_by_code(code)
        assert product is not None
        return self.restore(product.id)

    def list_products(
        self, *, page: int, per_page: int, q: str | None
    ) -> tuple[list[Product], int]:
        """Return paginated products with optional search query.

        Args:
            page: Page number (1-indexed)
            per_page: Items per page
            q: Optional search query

        Returns:
            Tuple of (products list, total count)
        """
        return self.repository.list(page=page, per_page=per_page, q=q)

    def bulk_upsert(self, rows: list[ProductBulkRow]) -> BulkUpsertResponse:
        """Bulk upsert products by maker_part_code (product_code).

        Args:
            rows: List of product rows to upsert

        Returns:
            BulkUpsertResponse with summary and errors
        """
        summary = {"total": 0, "created": 0, "updated": 0, "failed": 0}
        errors = []

        for row in rows:
            try:
                # Map product_code to maker_part_code
                data = row.model_dump()
                product_code = data.pop("product_code", None)
                if product_code:
                    data["maker_part_code"] = product_code

                # Remove fields not in model
                data.pop("customer_part_no", None)
                data.pop("maker_item_code", None)
                data.pop("is_active", None)

                # Set default base_unit if not present
                if "base_unit" not in data:
                    data["base_unit"] = data.get("internal_unit", "CAN")

                # Check if active product exists by maker_part_code
                existing = (
                    self.db.query(Product)
                    .filter(Product.maker_part_code == data["maker_part_code"])
                    .filter(Product.valid_to > func.current_date())
                    .first()
                )

                if existing:
                    # UPDATE active record
                    for field, value in data.items():
                        if field != "maker_part_code":  # Don't update the key field
                            setattr(existing, field, value)
                    summary["updated"] += 1
                else:
                    # Check for soft-deleted record
                    deleted = (
                        self.db.query(Product)
                        .filter(Product.maker_part_code == data["maker_part_code"])
                        .filter(Product.valid_to <= func.current_date())
                        .first()
                    )
                    if deleted:
                        # Restore and update soft-deleted record
                        for field, value in data.items():
                            if field != "maker_part_code":
                                setattr(deleted, field, value)
                        deleted.valid_to = date(9999, 12, 31)
                        summary["updated"] += 1
                    else:
                        # CREATE new record
                        new_product = Product(**data)
                        self.db.add(new_product)
                        summary["created"] += 1

                summary["total"] += 1

            except Exception as e:
                summary["failed"] += 1
                errors.append(f"{row.product_code}: {str(e)}")
                self.db.rollback()
                continue

        # Commit all successful operations
        if summary["created"] + summary["updated"] > 0:
            try:
                self.db.commit()
            except Exception as e:
                self.db.rollback()
                errors.append(f"Commit failed: {str(e)}")
                summary["failed"] = summary["total"]
                summary["created"] = 0
                summary["updated"] = 0

        # Determine status
        if summary["failed"] == 0:
            status = "success"
        elif summary["created"] + summary["updated"] > 0:
            status = "partial"
        else:
            status = "failed"

        return BulkUpsertResponse(
            status=status, summary=BulkUpsertSummary(**summary), errors=errors
        )
