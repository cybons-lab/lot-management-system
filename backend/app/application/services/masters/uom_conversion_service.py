# backend/app/services/masters/uom_conversion_service.py
"""UOM conversion service (単位換算マスタ管理)."""

from datetime import date
from typing import cast

from sqlalchemy.orm import Session

from app.application.services.common.base_service import BaseService
from app.application.services.common.optimistic_lock import (
    hard_delete_with_version,
    soft_delete_with_version,
    update_with_version,
)
from app.core.time_utils import utcnow
from app.infrastructure.persistence.models.masters_models import ProductUomConversion
from app.infrastructure.persistence.models.supplier_item_model import SupplierItem
from app.presentation.schemas.masters.masters_schema import BulkUpsertResponse, BulkUpsertSummary
from app.presentation.schemas.masters.uom_conversions_schema import (
    UomConversionBulkRow,
    UomConversionCreate,
    UomConversionUpdate,
)


class UomConversionService(
    BaseService[ProductUomConversion, UomConversionCreate, UomConversionUpdate, int]
):
    """Service for managing UOM conversions."""

    def __init__(self, db: Session):
        """Initialize service with database session."""
        super().__init__(db=db, model=ProductUomConversion)

    def get_by_key(self, supplier_item_id: int, external_unit: str) -> ProductUomConversion | None:
        """Get UOM conversion by composite key."""
        return cast(
            ProductUomConversion | None,
            self.db.query(ProductUomConversion)
            .filter(
                ProductUomConversion.supplier_item_id == supplier_item_id,
                ProductUomConversion.external_unit == external_unit,
            )
            .first(),
        )

    def get_by_id(self, id: int, *, raise_404: bool = True) -> ProductUomConversion | None:
        """Get UOM conversion by ID."""
        from fastapi import HTTPException, status
        from sqlalchemy.orm import joinedload

        conversion = cast(
            ProductUomConversion | None,
            self.db.query(ProductUomConversion)
            .options(joinedload(ProductUomConversion.supplier_item))
            .filter(ProductUomConversion.conversion_id == id)
            .first(),
        )
        if conversion is None and raise_404:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"UOM conversion with ID {id} not found",
            )
        return conversion

    def update_by_id(self, conversion_id: int, data: UomConversionUpdate) -> ProductUomConversion:
        """Update UOM conversion by ID.

        Args:
            conversion_id: ID of the conversion to update
            data: Update data

        Returns:
            Updated conversion

        Raises:
            HTTPException: If conversion not found
        """
        from fastapi import HTTPException, status

        conversion = self.get_by_id(conversion_id, raise_404=False)
        if not conversion:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"UOM conversion with ID {conversion_id} not found",
            )

        update_data = data.model_dump(exclude_unset=True, exclude={"version"})
        update_data["updated_at"] = utcnow()
        updated = update_with_version(
            self.db,
            ProductUomConversion,
            filters=[ProductUomConversion.conversion_id == conversion_id],
            update_values=update_data,
            expected_version=data.version,
            not_found_detail=f"UOM conversion with ID {conversion_id} not found",
        )
        assert isinstance(updated, ProductUomConversion)
        return updated

    def delete_by_id(
        self, conversion_id: int, end_date: date | None, expected_version: int
    ) -> None:
        """Soft delete UOM conversion by ID.

        Args:
            conversion_id: ID of the conversion to delete
            end_date: Optional end date for validity
            expected_version: Expected version for optimistic lock check

        Raises:
            HTTPException: If conversion not found
        """
        soft_delete_with_version(
            self.db,
            ProductUomConversion,
            filters=[ProductUomConversion.conversion_id == conversion_id],
            expected_version=expected_version,
            end_date=end_date,
            not_found_detail=f"UOM conversion with ID {conversion_id} not found",
        )

    def permanent_delete_by_id(self, conversion_id: int, expected_version: int) -> None:
        """Permanently delete UOM conversion by ID.

        Args:
            conversion_id: ID of the conversion to delete

            expected_version: Expected version for optimistic lock check
        Raises:
            HTTPException: If conversion not found
        """
        hard_delete_with_version(
            self.db,
            ProductUomConversion,
            filters=[ProductUomConversion.conversion_id == conversion_id],
            expected_version=expected_version,
            not_found_detail=f"UOM conversion with ID {conversion_id} not found",
        )

    def restore_by_id(self, conversion_id: int) -> ProductUomConversion:
        """Restore soft-deleted UOM conversion.

        Args:
            conversion_id: ID of the conversion to restore

        Returns:
            Restored conversion

        Raises:
            HTTPException: If conversion not found
        """
        from fastapi import HTTPException, status

        conversion = self.get_by_id(conversion_id, raise_404=False)
        if not conversion:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"UOM conversion with ID {conversion_id} not found",
            )

        conversion.restore()
        self.db.commit()
        self.db.refresh(conversion)
        return conversion

    def bulk_upsert(self, rows: list[UomConversionBulkRow]) -> BulkUpsertResponse:
        """Bulk upsert UOM conversions by composite key (supplier_item_id,
        external_unit).

        Args:
            rows: List of UOM conversion rows to upsert

        Returns:
            BulkUpsertResponse with summary and errors
        """
        # ProductGroup removed

        summary = {"total": 0, "created": 0, "updated": 0, "failed": 0}
        errors = []

        # 1. Collect all codes to resolve IDs efficiently
        product_codes = {row.product_code for row in rows}

        # 2. Resolve IDs
        products = (
            self.db.query(SupplierItem.maker_part_no, SupplierItem.id)
            .filter(SupplierItem.maker_part_no.in_(product_codes))
            .all()
        )
        product_map = {code: id for code, id in products}

        # 3. Process rows
        for row in rows:
            try:
                # Resolve IDs
                supplier_item_id = product_map.get(row.product_code)
                if not supplier_item_id:
                    raise ValueError(f"Product code not found: {row.product_code}")

                # Check if UOM conversion exists by composite key
                existing = self.get_by_key(supplier_item_id, row.external_unit)

                if existing:
                    # UPDATE
                    existing.factor = row.factor
                    existing.updated_at = utcnow()
                    summary["updated"] += 1
                else:
                    # CREATE
                    new_conversion = ProductUomConversion(
                        supplier_item_id=supplier_item_id,
                        external_unit=row.external_unit,
                        factor=row.factor,
                    )
                    self.db.add(new_conversion)
                    summary["created"] += 1

                summary["total"] += 1

            except Exception as e:
                summary["failed"] += 1
                errors.append(f"product={row.product_code}, ext_unit={row.external_unit}: {e!s}")
                self.db.rollback()
                continue

        # Commit all successful operations
        if summary["created"] + summary["updated"] > 0:
            try:
                self.db.commit()
            except Exception as e:
                self.db.rollback()
                errors.append(f"Commit failed: {e!s}")
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
