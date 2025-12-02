# backend/app/services/masters/uom_conversion_service.py
"""UOM conversion service (単位換算マスタ管理)."""

from datetime import datetime

from sqlalchemy.orm import Session

from app.models.masters_models import ProductUomConversion
from app.schemas.masters.masters_schema import BulkUpsertResponse, BulkUpsertSummary
from app.schemas.masters.uom_conversions_schema import (
    UomConversionBulkRow,
    UomConversionCreate,
    UomConversionUpdate,
)
from app.services.common.base_service import BaseService


class UomConversionService(
    BaseService[ProductUomConversion, UomConversionCreate, UomConversionUpdate, int]
):
    """Service for managing UOM conversions."""

    def __init__(self, db: Session):
        """Initialize service with database session."""
        super().__init__(db=db, model=ProductUomConversion)

    def get_by_key(self, product_id: int, external_unit: str) -> ProductUomConversion | None:
        """Get UOM conversion by composite key."""
        return (
            self.db.query(ProductUomConversion)
            .filter(
                ProductUomConversion.product_id == product_id,
                ProductUomConversion.external_unit == external_unit,
            )
            .first()
        )

    def bulk_upsert(self, rows: list[UomConversionBulkRow]) -> BulkUpsertResponse:
        """Bulk upsert UOM conversions by composite key (product_code, external_unit).

        Args:
            rows: List of UOM conversion rows to upsert

        Returns:
            BulkUpsertResponse with summary and errors
        """
        from app.models.masters_models import Product

        summary = {"total": 0, "created": 0, "updated": 0, "failed": 0}
        errors = []

        # 1. Collect all codes to resolve IDs efficiently
        product_codes = {row.product_code for row in rows}

        # 2. Resolve IDs
        products = (
            self.db.query(Product.product_code, Product.id)
            .filter(Product.product_code.in_(product_codes))
            .all()
        )
        product_map = {code: id for code, id in products}

        # 3. Process rows
        for row in rows:
            try:
                # Resolve IDs
                product_id = product_map.get(row.product_code)
                if not product_id:
                    raise ValueError(f"Product code not found: {row.product_code}")

                # Check if UOM conversion exists by composite key
                existing = self.get_by_key(product_id, row.external_unit)

                if existing:
                    # UPDATE
                    existing.factor = row.factor
                    existing.updated_at = datetime.now()
                    summary["updated"] += 1
                else:
                    # CREATE
                    new_conversion = ProductUomConversion(
                        product_id=product_id, external_unit=row.external_unit, factor=row.factor
                    )
                    self.db.add(new_conversion)
                    summary["created"] += 1

                summary["total"] += 1

            except Exception as e:
                summary["failed"] += 1
                errors.append(f"product={row.product_code}, ext_unit={row.external_unit}: {str(e)}")
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
