from typing import cast

from sqlalchemy.orm import Session

from app.models.masters_models import Customer
from app.schemas.masters.masters_schema import (
    BulkUpsertResponse,
    BulkUpsertSummary,
    CustomerBulkRow,
    CustomerCreate,
    CustomerUpdate,
)
from app.services.common.base_service import BaseService


class CustomerService(BaseService[Customer, CustomerCreate, CustomerUpdate, str]):
    """Service for managing customers."""

    def __init__(self, db: Session):
        super().__init__(db, Customer)

    def get_by_code(self, code: str, *, raise_404: bool = True) -> Customer | None:
        """Get customer by customer_code."""
        customer = cast(
            Customer | None,
            self.db.query(Customer).filter(Customer.customer_code == code).first(),
        )
        if not customer and raise_404:
            from fastapi import HTTPException, status

            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="得意先が見つかりません"
            )
        return customer

    def update_by_code(self, code: str, payload: CustomerUpdate) -> Customer:
        """Update customer by customer_code."""
        customer = self.get_by_code(code)
        assert customer is not None  # raise_404=True ensures this
        return self.update(customer.id, payload)

    def delete_by_code(self, code: str) -> None:
        """Delete customer by customer_code."""
        customer = self.get_by_code(code)
        assert customer is not None  # raise_404=True ensures this
        self.delete(customer.id)

    def bulk_upsert(self, rows: list[CustomerBulkRow]) -> BulkUpsertResponse:
        """Bulk upsert customers by customer_code.

        Args:
            rows: List of customer rows to upsert

        Returns:
            BulkUpsertResponse with summary and errors
        """
        summary = {"total": 0, "created": 0, "updated": 0, "failed": 0}
        errors = []

        for row in rows:
            try:
                # Check if customer exists by customer_code
                existing = (
                    self.db.query(Customer)
                    .filter(Customer.customer_code == row.customer_code)
                    .first()
                )

                if existing:
                    # UPDATE
                    existing.customer_name = row.customer_name
                    summary["updated"] += 1
                else:
                    # CREATE
                    new_customer = Customer(**row.model_dump())
                    self.db.add(new_customer)
                    summary["created"] += 1

                summary["total"] += 1

            except Exception as e:
                summary["failed"] += 1
                errors.append(f"{row.customer_code}: {str(e)}")
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
