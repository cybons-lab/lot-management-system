from typing import cast

from sqlalchemy.orm import Session

from app.application.services.common.base_service import BaseService
from app.infrastructure.persistence.models.masters_models import Supplier
from app.presentation.schemas.masters.masters_schema import (
    BulkUpsertResponse,
    BulkUpsertSummary,
    SupplierBulkRow,
    SupplierCreate,
    SupplierUpdate,
)


class SupplierService(BaseService[Supplier, SupplierCreate, SupplierUpdate, int]):
    """Service for managing suppliers."""

    def __init__(self, db: Session):
        super().__init__(db, Supplier)

    def get_by_code(self, code: str, *, raise_404: bool = True) -> Supplier | None:
        """Get supplier by supplier_code."""
        supplier = cast(
            Supplier | None,
            self.db.query(Supplier).filter(Supplier.supplier_code == code).first(),
        )
        if not supplier and raise_404:
            from fastapi import HTTPException, status

            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="仕入先が見つかりません"
            )
        return supplier

    def update_by_code(self, code: str, payload: SupplierUpdate) -> Supplier:
        """Update supplier by supplier_code."""
        supplier = self.get_by_code(code)
        if supplier is None or supplier.id is None:
            raise ValueError("Supplier not found or has no ID")
        return self.update(supplier.id, payload)

    def delete_by_code(self, code: str) -> None:
        """Delete supplier by supplier_code."""
        supplier = self.get_by_code(code)
        if supplier is None or supplier.id is None:
            raise ValueError("Supplier not found or has no ID")
        self.delete(supplier.id)

    def bulk_upsert(self, rows: list[SupplierBulkRow]) -> BulkUpsertResponse:
        """Bulk upsert suppliers by supplier_code.

        Args:
            rows: List of supplier rows to upsert

        Returns:
            BulkUpsertResponse with summary and errors
        """
        summary = {"total": 0, "created": 0, "updated": 0, "failed": 0}
        errors = []

        for row in rows:
            try:
                # Check if supplier exists by supplier_code
                existing = (
                    self.db.query(Supplier)
                    .filter(Supplier.supplier_code == row.supplier_code)
                    .first()
                )

                if existing:
                    # UPDATE
                    existing.supplier_name = row.supplier_name
                    summary["updated"] += 1
                else:
                    # CREATE
                    new_supplier = Supplier(**row.model_dump())
                    self.db.add(new_supplier)
                    summary["created"] += 1

                summary["total"] += 1

            except Exception as e:
                summary["failed"] += 1
                errors.append(f"{row.supplier_code}: {str(e)}")
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
