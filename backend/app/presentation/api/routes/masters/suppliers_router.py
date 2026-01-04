"""Supplier master CRUD endpoints (standalone).

Supports soft delete (valid_to based) and hard delete (admin only).
"""

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.application.services.common.export_service import ExportService
from app.application.services.masters.supplier_service import SupplierService
from app.core.database import get_db
from app.infrastructure.persistence.models.auth_models import User
from app.presentation.api.routes.auth.auth_router import get_current_admin
from app.presentation.schemas.masters.masters_schema import (
    BulkUpsertResponse,
    SupplierBulkUpsertRequest,
    SupplierCreate,
    SupplierResponse,
    SupplierUpdate,
)


router = APIRouter(prefix="/suppliers", tags=["suppliers"])


@router.get("", response_model=list[SupplierResponse])
def list_suppliers(
    skip: int = 0,
    limit: int = 100,
    include_inactive: bool = Query(False, description="Include soft-deleted (inactive) suppliers"),
    db: Session = Depends(get_db),
):
    """サプライヤー一覧を取得.

    デフォルトでは有効なサプライヤー（valid_to >= 今日）のみを返します。
    論理削除されたサプライヤーも含める場合はinclude_inactive=trueを指定してください。

    Args:
        skip: スキップ件数（ページネーション用）
        limit: 取得件数（最大100件）
        include_inactive: 論理削除済みサプライヤーを含めるか（デフォルト: False）
        db: データベースセッション

    Returns:
        list[SupplierResponse]: サプライヤー情報のリスト
    """
    service = SupplierService(db)
    return service.get_all(skip=skip, limit=limit, include_inactive=include_inactive)


@router.get("/template/download")
def download_suppliers_template(format: str = "csv", include_sample: bool = True):
    """Download supplier import template.

    Args:
        format: 'csv' or 'xlsx' (default: csv)
        include_sample: Whether to include a sample row (default: True)

    Returns:
        Template file for supplier import
    """
    return ExportService.export_template("suppliers", format=format, include_sample=include_sample)


@router.get("/export/download")
def export_suppliers(format: str = "csv", db: Session = Depends(get_db)):
    """Export suppliers to CSV or Excel."""
    service = SupplierService(db)
    suppliers = service.get_all()
    data = [SupplierResponse.model_validate(s).model_dump() for s in suppliers]

    if format == "xlsx":
        return ExportService.export_to_excel(data, "suppliers")
    return ExportService.export_to_csv(data, "suppliers")


@router.get("/{supplier_code}", response_model=SupplierResponse)
def get_supplier(supplier_code: str, db: Session = Depends(get_db)):
    """サプライヤーコードでサプライヤーを取得.

    Args:
        supplier_code: サプライヤーコード
        db: データベースセッション

    Returns:
        SupplierResponse: サプライヤー詳細情報

    Raises:
        HTTPException: サプライヤーが存在しない場合（404）
    """
    service = SupplierService(db)
    return service.get_by_code(supplier_code)


@router.post("", response_model=SupplierResponse, status_code=201)
def create_supplier(supplier: SupplierCreate, db: Session = Depends(get_db)):
    """サプライヤーを新規作成.

    Args:
        supplier: サプライヤー作成リクエストデータ
        db: データベースセッション

    Returns:
        SupplierResponse: 作成されたサプライヤー情報

    Raises:
        HTTPException: サプライヤーコードが既に存在する場合（409）
    """
    service = SupplierService(db)
    # Check if exists
    existing = service.get_by_code(supplier.supplier_code, raise_404=False)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Supplier with this code already exists",
        )
    try:
        return service.create(supplier)
    except Exception as e:
        from sqlalchemy.exc import IntegrityError

        if isinstance(e, IntegrityError):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Supplier with this code already exists",
            )
        raise e


@router.put("/{supplier_code}", response_model=SupplierResponse)
def update_supplier(supplier_code: str, supplier: SupplierUpdate, db: Session = Depends(get_db)):
    """Update supplier."""
    service = SupplierService(db)
    return service.update_by_code(supplier_code, supplier)


@router.delete("/{supplier_code}", status_code=204)
def delete_supplier(
    supplier_code: str,
    end_date: date | None = Query(None, description="End date for soft delete. Defaults to today."),
    db: Session = Depends(get_db),
):
    """Soft delete supplier (set valid_to to end_date or today).

    This marks the supplier as inactive from the specified date.
    The supplier data is preserved for historical reference.
    """
    service = SupplierService(db)
    service.delete_by_code(supplier_code, end_date=end_date)
    return None


@router.delete("/{supplier_code}/permanent", status_code=204)
def permanent_delete_supplier(
    supplier_code: str,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Permanently delete supplier (admin only).

    WARNING: This completely removes the supplier from the database.
    This operation cannot be undone.

    Use this only for incorrectly created records.
    Will fail if the supplier is referenced by other records.
    """
    service = SupplierService(db)
    service.hard_delete_by_code(supplier_code)
    return None


@router.post("/{supplier_code}/restore", response_model=SupplierResponse)
def restore_supplier(supplier_code: str, db: Session = Depends(get_db)):
    """Restore a soft-deleted supplier.

    Sets valid_to back to 9999-12-31 (indefinitely valid).
    """
    service = SupplierService(db)
    return service.restore_by_code(supplier_code)


@router.post("/bulk-upsert", response_model=BulkUpsertResponse)
def bulk_upsert_suppliers(request: SupplierBulkUpsertRequest, db: Session = Depends(get_db)):
    """Bulk upsert suppliers by supplier_code.

    - If a supplier with the same supplier_code exists, it will be updated
    - If not, a new supplier will be created

    Returns summary with counts of created/updated/failed records.
    """
    service = SupplierService(db)
    return service.bulk_upsert(request.rows)
