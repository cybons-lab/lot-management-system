"""Business logic for product group operations.

製品グループは supplier_items と customer_items を紐付けるグルーピングエンティティ。
"""

from __future__ import annotations

from datetime import date
from typing import cast

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app.application.services.common.base_service import BaseService
from app.infrastructure.persistence.models import ProductGroup
from app.infrastructure.persistence.repositories.product_groups_repository import (
    ProductGroupRepository,
)
from app.presentation.schemas.masters.masters_schema import BulkUpsertResponse, BulkUpsertSummary
from app.presentation.schemas.masters.product_groups_schema import (
    ProductGroupBulkRow,
    ProductGroupCreate,
    ProductGroupUpdate,
)


class ProductGroupService(BaseService[ProductGroup, ProductGroupCreate, ProductGroupUpdate, int]):
    """Service layer orchestrating product group use cases.

    Inherits common CRUD operations from BaseService:
    - get_by_id(product_group_id) -> ProductGroup
    - create(payload) -> ProductGroup
    - update(product_group_id, payload) -> ProductGroup
    - delete(product_group_id) -> None

    Custom business logic is implemented below.
    """

    def __init__(self, db: Session) -> None:
        """Initialize ProductGroupService.

        Args:
            db: Database session
        """
        super().__init__(db=db, model=ProductGroup)
        self.repository = ProductGroupRepository(db)

    def get_by_code(self, code: str, *, raise_404: bool = True) -> ProductGroup | None:
        """Get product group by product code (maker_part_code).

        Args:
            code: Product code (maker_part_code)
            raise_404: Whether to raise 404 error if not found

        Returns:
            ProductGroup if found, None otherwise (if raise_404=False)

        Raises:
            HTTPException: 404 if product group not found and raise_404=True
        """
        product_group = cast(
            ProductGroup | None,
            self.db.query(ProductGroup).filter(ProductGroup.maker_part_code == code).first(),
        )
        if not product_group and raise_404:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="製品グループが見つかりません"
            )
        return product_group

    def list_items(
        self,
        skip: int = 0,
        limit: int = 100,
        search: str | None = None,
        *,
        include_inactive: bool = False,
    ) -> list[ProductGroup]:
        """List product groups with optional search.

        Args:
            skip: Number of records to skip
            limit: Maximum number of records to return
            search: Optional search query for product_code or product_name
            include_inactive: If True, include soft-deleted product groups

        Returns:
            List of product groups
        """
        query = self.db.query(ProductGroup)

        # Filter out soft-deleted records by default
        if not include_inactive:
            query = query.filter(ProductGroup.valid_to > func.current_date())

        if search:
            query = query.filter(
                (ProductGroup.maker_part_code.contains(search))
                | (ProductGroup.product_name.contains(search))
            )

        return cast(
            list[ProductGroup],
            query.options(joinedload(ProductGroup.supplier_items))
            .order_by(ProductGroup.maker_part_code)
            .offset(skip)
            .limit(limit)
            .all(),
        )

    def get_all(
        self, skip: int = 0, limit: int = 100, *, include_inactive: bool = False
    ) -> list[ProductGroup]:
        """Get all product groups.

        Returns:
            List of all product groups ordered by product code
        """
        return cast(
            list[ProductGroup],
            self.db.query(ProductGroup)
            .order_by(ProductGroup.maker_part_code)
            .offset(skip)
            .limit(limit)
            .all(),
        )

    def create(self, payload: ProductGroupCreate) -> ProductGroup:
        """Create new product group with field mapping and auto-numbering."""
        data = payload.model_dump()

        # 1. 自動採番 (product_code / maker_part_code)
        input_code = data.get("product_code")
        if input_code:
            data["maker_part_code"] = input_code
        else:
            # P + YYYYMMDD + HHMMSS + Random3
            import random
            import string

            from app.core.time_utils import utcnow

            now = utcnow()
            date_str = now.strftime("%Y%m%d%H%M%S")
            rand_str = "".join(random.choices(string.ascii_uppercase + string.digits, k=3))
            auto_code = f"P{date_str}{rand_str}"
            data["maker_part_code"] = auto_code

        # 不要な product_code フィールドを削除
        data.pop("product_code", None)

        # Remove fields not in model
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
        except IntegrityError as exc:
            self.db.rollback()
            from app.core.db_error_parser import parse_db_error

            user_message = parse_db_error(exc, payload.model_dump())
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=user_message) from exc

    def update(self, id: int, payload: ProductGroupUpdate) -> ProductGroup:
        """Update product group with field mapping."""
        instance = self.get_by_id(id)
        assert instance is not None  # raise_404=True ensures this
        data = payload.model_dump(exclude_unset=True)

        if "product_code" in data:
            data["maker_part_code"] = data.pop("product_code")

        # Remove fields not in model
        data.pop("is_active", None)

        for field, value in data.items():
            setattr(instance, field, value)

        try:
            self.db.commit()
            self.db.refresh(instance)
            return instance
        except IntegrityError as exc:
            self.db.rollback()
            from app.core.db_error_parser import parse_db_error

            user_message = parse_db_error(exc, payload.model_dump())
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=user_message) from exc

    def update_by_code(self, code: str, payload: ProductGroupUpdate) -> ProductGroup:
        """Update product group by product code."""
        product_group = self.get_by_code(code)
        assert product_group is not None  # raise_404=True ensures this
        return self.update(product_group.id, payload)

    def delete_by_code(self, code: str, *, end_date: date | None = None) -> None:
        """Soft delete product group by product code."""
        product_group = self.get_by_code(code)
        assert product_group is not None
        self.delete(product_group.id, end_date=end_date)

    def hard_delete_by_code(self, code: str) -> None:
        """Permanently delete product group by product code."""
        product_group = self.get_by_code(code)
        assert product_group is not None
        self.hard_delete(product_group.id)

    def restore_by_code(self, code: str) -> ProductGroup:
        """Restore a soft-deleted product group by product code."""
        product_group = self.get_by_code(code)
        assert product_group is not None
        return self.restore(product_group.id)

    def list_product_groups(
        self, *, page: int, per_page: int, q: str | None
    ) -> tuple[list[ProductGroup], int]:
        """Return paginated product groups with optional search query.

        Args:
            page: Page number (1-indexed)
            per_page: Items per page
            q: Optional search query

        Returns:
            Tuple of (product groups list, total count)
        """
        return self.repository.list(page=page, per_page=per_page, q=q)

    def bulk_upsert(self, rows: list[ProductGroupBulkRow]) -> BulkUpsertResponse:
        """Bulk upsert product groups by maker_part_code (product_code).

        Args:
            rows: List of product group rows to upsert

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
                data.pop("is_active", None)

                # Set default base_unit if not present
                if "base_unit" not in data:
                    data["base_unit"] = data.get("internal_unit", "CAN")

                # Check if active product group exists by maker_part_code
                existing = (
                    self.db.query(ProductGroup)
                    .filter(ProductGroup.maker_part_code == data["maker_part_code"])
                    .filter(ProductGroup.valid_to > func.current_date())
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
                        self.db.query(ProductGroup)
                        .filter(ProductGroup.maker_part_code == data["maker_part_code"])
                        .filter(ProductGroup.valid_to <= func.current_date())
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
                        new_product_group = ProductGroup(**data)
                        self.db.add(new_product_group)
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
            result_status = "success"
        elif summary["created"] + summary["updated"] > 0:
            result_status = "partial"
        else:
            result_status = "failed"

        return BulkUpsertResponse(
            status=result_status, summary=BulkUpsertSummary(**summary), errors=errors
        )


# Backward compatibility alias
ProductService = ProductGroupService
