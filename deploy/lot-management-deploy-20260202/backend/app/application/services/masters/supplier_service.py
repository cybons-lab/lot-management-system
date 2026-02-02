from datetime import date
from typing import cast

from fastapi import HTTPException, status
from sqlalchemy import func
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
    """Service for managing suppliers.

    Supports soft delete (valid_to based) and hard delete (admin only).
    """

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

    def update_by_code(
        self,
        code: str,
        payload: SupplierUpdate,
        *,
        is_admin: bool = False,
    ) -> Supplier:
        """Update supplier by supplier_code.

        コード変更はID参照のため安全に変更可能（リレーションは壊れない）。
        ただし重複チェックと管理者権限チェックは実施。

        Args:
            code: 現在の仕入先コード
            payload: 更新データ
            is_admin: 管理者権限フラグ（コード変更時に必要）

        Returns:
            更新後の仕入先
        """
        supplier = self.get_by_code(code)
        if supplier is None or supplier.id is None:
            raise ValueError("Supplier not found or has no ID")

        # コード変更のチェック
        if payload.supplier_code and payload.supplier_code != supplier.supplier_code:
            # 1. 権限チェック（管理者のみ）
            if not is_admin:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="仕入先コードの変更は管理者のみ許可されています。",
                )

            # 2. 重複チェック
            existing = self.get_by_code(payload.supplier_code, raise_404=False)
            if existing and existing.id != supplier.id:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"仕入先コード '{payload.supplier_code}' は既に存在します。",
                )

        return self.update(supplier.id, payload)

    def delete_by_code(self, code: str, *, end_date: date | None = None) -> None:
        """Soft delete supplier by supplier_code.

        Args:
            code: Supplier code
            end_date: End date for validity. Defaults to today.
        """
        supplier = self.get_by_code(code)
        if supplier is None or supplier.id is None:
            raise ValueError("Supplier not found or has no ID")
        self.delete(supplier.id, end_date=end_date)

    def hard_delete_by_code(self, code: str) -> None:
        """Permanently delete supplier by supplier_code.

        This physically removes the supplier from the database.
        Only for admin use with incorrectly created records.
        """
        supplier = self.get_by_code(code)
        if supplier is None or supplier.id is None:
            raise ValueError("Supplier not found or has no ID")
        self.hard_delete(supplier.id)

    def restore_by_code(self, code: str) -> Supplier:
        """Restore a soft-deleted supplier by supplier_code.

        Sets valid_to back to 9999-12-31 (indefinitely valid).
        """
        supplier = self.get_by_code(code)
        if supplier is None or supplier.id is None:
            raise ValueError("Supplier not found or has no ID")
        return self.restore(supplier.id)

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
                # Check if active supplier exists by supplier_code
                existing = (
                    self.db.query(Supplier)
                    .filter(Supplier.supplier_code == row.supplier_code)
                    .filter(Supplier.valid_to > func.current_date())
                    .first()
                )

                if existing:
                    # UPDATE active record
                    existing.supplier_name = row.supplier_name
                    summary["updated"] += 1
                else:
                    # Check for soft-deleted record
                    deleted = (
                        self.db.query(Supplier)
                        .filter(Supplier.supplier_code == row.supplier_code)
                        .filter(Supplier.valid_to <= func.current_date())
                        .first()
                    )
                    if deleted:
                        # Restore and update soft-deleted record
                        deleted.supplier_name = row.supplier_name
                        deleted.valid_to = date(9999, 12, 31)
                        summary["updated"] += 1
                    else:
                        # CREATE new record
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
