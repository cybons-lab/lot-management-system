from datetime import date
from typing import cast

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.application.services.common.base_service import BaseService
from app.application.services.common.relation_check_service import (
    RelationCheckService,
)
from app.infrastructure.persistence.models.masters_models import Customer
from app.presentation.schemas.masters.masters_schema import (
    BulkUpsertResponse,
    BulkUpsertSummary,
    CustomerBulkRow,
    CustomerCreate,
    CustomerUpdate,
)


class CustomerService(BaseService[Customer, CustomerCreate, CustomerUpdate, int]):
    """Service for managing customers.

    Supports soft delete (valid_to based) and hard delete (admin only).
    """

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

    def delete_by_code(self, code: str, *, end_date: date | None = None) -> None:
        """Soft delete customer by customer_code.

        When customer is soft-deleted:
        - Unallocated orders are cancelled (status='cancelled')
        - Allocated orders are put on hold (status='on_hold')

        Args:
            code: Customer code
            end_date: End date for validity. Defaults to today.
        """
        customer = self.get_by_code(code)
        assert customer is not None

        # Transition related orders
        self._transition_customer_orders(customer.id)

        # Perform soft delete
        self.delete(customer.id, end_date=end_date)

    def _transition_customer_orders(self, customer_id: int) -> None:
        """得意先無効化時の受注状態遷移.

        - 未引当受注 → cancelled
        - 引当済み受注 → on_hold
        """
        from app.infrastructure.persistence.models.orders_models import Order, OrderLine
        from app.infrastructure.persistence.models.lot_reservations_model import (
            LotReservation,
        )

        # この得意先の受注を取得
        orders = self.db.query(Order).filter(Order.customer_id == customer_id).all()

        for order in orders:
            # 受注明細ごとに引当状況をチェック
            for line in order.order_lines:
                # 引当があるかチェック
                has_allocation = (
                    self.db.query(LotReservation)
                    .filter(
                        LotReservation.source_type == "order",
                        LotReservation.source_id == line.id,
                    )
                    .first()
                    is not None
                )

                if has_allocation:
                    # 引当済み → on_hold（要対応）
                    line.status = "on_hold"
                else:
                    # 未引当 → cancelled
                    line.status = "cancelled"

            # 受注ヘッダーのステータス更新
            all_cancelled = all(line.status == "cancelled" for line in order.order_lines)
            all_on_hold = all(line.status == "on_hold" for line in order.order_lines)

            if all_cancelled:
                order.status = "closed"
            elif all_on_hold:
                order.status = "on_hold"
            else:
                order.status = "part_allocated"  # 混在状態

    def hard_delete_by_code(self, code: str) -> None:
        """Permanently delete customer by customer_code.

        Only allowed if customer has no related data (orders, withdrawals, etc.).

        Args:
            code: Customer code

        Raises:
            HTTPException: 409 if customer has related data
        """
        customer = self.get_by_code(code)
        assert customer is not None

        # Check for related data
        relation_checker = RelationCheckService(self.db)
        if relation_checker.customer_has_related_data(customer.id):
            summary = relation_checker.get_related_data_summary("customer", customer.id)
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"この得意先には関連データが存在するため削除できません。論理削除を使用してください。"
                f"関連データ: {summary}",
            )

        self.hard_delete(customer.id)

    def restore_by_code(self, code: str) -> Customer:
        """Restore a soft-deleted customer by customer_code."""
        customer = self.get_by_code(code)
        assert customer is not None
        return self.restore(customer.id)

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
                # Check if active customer exists by customer_code
                existing = (
                    self.db.query(Customer)
                    .filter(Customer.customer_code == row.customer_code)
                    .filter(Customer.valid_to > func.current_date())
                    .first()
                )

                if existing:
                    # UPDATE active record
                    existing.customer_name = row.customer_name
                    summary["updated"] += 1
                else:
                    # Check for soft-deleted record
                    deleted = (
                        self.db.query(Customer)
                        .filter(Customer.customer_code == row.customer_code)
                        .filter(Customer.valid_to <= func.current_date())
                        .first()
                    )
                    if deleted:
                        # Restore and update soft-deleted record
                        deleted.customer_name = row.customer_name
                        deleted.valid_to = date(9999, 12, 31)
                        summary["updated"] += 1
                    else:
                        # CREATE new record
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
