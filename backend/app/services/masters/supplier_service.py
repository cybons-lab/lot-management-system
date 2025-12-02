from sqlalchemy.orm import Session

from app.models.masters_models import Supplier
from app.schemas.masters.masters_schema import (
    BulkUpsertResponse,
    BulkUpsertSummary,
    SupplierBulkRow,
    SupplierCreate,
    SupplierUpdate,
)
from app.services.common.base_service import BaseService


class SupplierService(BaseService[Supplier, SupplierCreate, SupplierUpdate, str]):
    """Service for managing suppliers."""

    def __init__(self, db: Session):
        super().__init__(db, Supplier)

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
