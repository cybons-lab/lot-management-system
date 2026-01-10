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
    CustomerCreate,
    CustomerUpdate,
)

# Avoid circular import by importing inside methods or using TYPE_CHECKING
# from app.application.services.admin.operation_logs_service import OperationLogService


class CustomerService(BaseService[Customer, CustomerCreate, CustomerUpdate, int]):
    """Service for managing customers.

    Supports soft delete (valid_to based) and hard delete (admin only).
    """

    def __init__(self, db: Session):
        super().__init__(db, Customer)

    def _log_operation(self, user_id: int | None, operation_type: str, target_id: int | None, changes: dict | None = None) -> None:
        if not user_id:
            return
        from app.application.services.admin.operation_logs_service import OperationLogService
        log_service = OperationLogService(self.db)
        log_service.log_operation(
            user_id=user_id,
            operation_type=operation_type,
            target_table="customers",
            target_id=target_id,
            changes=changes,
        )

    def create(self, payload: CustomerCreate, *, user_id: int | None = None) -> Customer:
        """Create new customer."""
        customer = Customer(**payload.model_dump())
        self.db.add(customer)
        self.db.flush()
        
        self._log_operation(user_id, "create", customer.id, payload.model_dump(mode="json"))
        
        self.db.commit()
        self.db.refresh(customer)
        return customer

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

    def update_by_code(
        self, code: str, payload: CustomerUpdate, *, is_admin: bool = False, user_id: int | None = None
    ) -> Customer:
        """Update customer by customer_code."""
        customer = self.get_by_code(code)
        assert customer is not None  # raise_404=True ensures this

        # Capture old values if needed for detailed diff (skipping for now, just logging payload)
        
        # Check for code change
        if payload.customer_code and payload.customer_code != customer.customer_code:
            # ... (existing checks) ...
            relation_checker = RelationCheckService(self.db)
            if relation_checker.customer_has_related_data(customer.id):
                summary = relation_checker.get_related_data_summary("customer", customer.id)
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"この得意先には関連データが存在するためコードを変更できません。関連データ: {summary}",
                )

            # 2. 権限チェック (管理者のみ)
            if not is_admin:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="得意先コードの変更は管理者のみ許可されています。",
                )
            
            # 3. 重複チェック
            existing = self.get_by_code(payload.customer_code, raise_404=False)
            if existing and existing.id != customer.id:
                 raise HTTPException(
                     status_code=status.HTTP_409_CONFLICT,
                     detail=f"得意先コード '{payload.customer_code}' は既に存在します。",
                 )

        updated_customer = self.update(customer.id, payload)
        self._log_operation(user_id, "update", customer.id, payload.model_dump(exclude_unset=True, mode="json"))
        return updated_customer

    def delete_by_code(
        self, code: str, *, end_date: date | None = None, user_id: int | None = None
    ) -> None:
        """Soft delete customer by customer_code."""
        customer = self.get_by_code(code)
        assert customer is not None

        # Transition related orders
        self._transition_customer_orders(customer.id)

        # Perform soft delete
        self.delete(customer.id, end_date=end_date)
        
        self._log_operation(user_id, "delete", customer.id, {"type": "soft", "end_date": str(end_date) if end_date else None})

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
                order.cancel_reason = "Related customer deleted"
            elif all_on_hold:
                order.status = "on_hold"
                order.cancel_reason = "Related customer deleted"
            else:
                order.status = "part_allocated"  # 混在状態
                order.cancel_reason = "Related customer deleted (Partial)"

    def hard_delete_by_code(self, code: str, *, user_id: int | None = None) -> None:
        """Permanently delete customer by customer_code.

        Only allowed if customer has no related data (orders, withdrawals, etc.).

        Args:
            code: Customer code
            user_id: User performing the action

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

        customer_id = customer.id
        self.hard_delete(customer.id)
        
        self._log_operation(user_id, "delete", customer_id, {"type": "hard"})

    def restore_by_code(self, code: str, *, user_id: int | None = None) -> Customer:
        """Restore a soft-deleted customer."""
        customer = self.get_by_code(code)
        assert customer is not None
        restored = self.restore(customer.id)
        
        self._log_operation(user_id, "update", customer.id, {"type": "restore"})
        return restored

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
