from typing import cast

from sqlalchemy.orm import Session

from app.models.masters_models import Warehouse
from app.schemas.masters.masters_schema import (
    BulkUpsertResponse,
    BulkUpsertSummary,
    WarehouseBulkRow,
    WarehouseCreate,
    WarehouseUpdate,
)
from app.services.common.base_service import BaseService


class WarehouseService(BaseService[Warehouse, WarehouseCreate, WarehouseUpdate, str]):
    """Service for managing warehouses."""

    def __init__(self, db: Session):
        super().__init__(db, Warehouse)

    def get_by_code(self, code: str, *, raise_404: bool = True) -> Warehouse | None:
        """Get warehouse by warehouse_code."""
        warehouse = cast(
            Warehouse | None,
            self.db.query(Warehouse).filter(Warehouse.warehouse_code == code).first(),
        )
        if not warehouse and raise_404:
            from fastapi import HTTPException, status

            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="倉庫が見つかりません"
            )
        return warehouse

    def update_by_code(self, code: str, payload: WarehouseUpdate) -> Warehouse:
        """Update warehouse by warehouse_code."""
        warehouse = self.get_by_code(code)
        assert warehouse is not None  # raise_404=True ensures this
        return self.update(warehouse.id, payload)

    def delete_by_code(self, code: str) -> None:
        """Delete warehouse by warehouse_code."""
        warehouse = self.get_by_code(code)
        assert warehouse is not None  # raise_404=True ensures this
        self.delete(warehouse.id)

    def bulk_upsert(self, rows: list[WarehouseBulkRow]) -> BulkUpsertResponse:
        """Bulk upsert warehouses by warehouse_code.

        Args:
            rows: List of warehouse rows to upsert

        Returns:
            BulkUpsertResponse with summary and errors
        """
        summary = {"total": 0, "created": 0, "updated": 0, "failed": 0}
        errors = []

        for row in rows:
            try:
                # Check if warehouse exists by warehouse_code
                existing = (
                    self.db.query(Warehouse)
                    .filter(Warehouse.warehouse_code == row.warehouse_code)
                    .first()
                )

                if existing:
                    # UPDATE
                    existing.warehouse_name = row.warehouse_name
                    existing.warehouse_type = row.warehouse_type
                    summary["updated"] += 1
                else:
                    # CREATE
                    new_warehouse = Warehouse(**row.model_dump())
                    self.db.add(new_warehouse)
                    summary["created"] += 1

                summary["total"] += 1

            except Exception as e:
                summary["failed"] += 1
                errors.append(f"{row.warehouse_code}: {str(e)}")
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
