"""Customer master CRUD endpoints (standalone).

Supports soft delete (valid_to based) and hard delete (admin only).
"""

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.application.services.common.export_service import ExportService
from app.application.services.masters.customer_service import CustomerService
from app.core.database import get_db
from app.infrastructure.persistence.models.auth_models import User
from app.presentation.api.routes.auth.auth_router import get_current_admin, get_current_user
from app.presentation.schemas.masters.masters_schema import (
    BulkUpsertResponse,
    CustomerBulkUpsertRequest,
    CustomerCreate,
    CustomerResponse,
    CustomerUpdate,
)


router = APIRouter(prefix="/customers", tags=["customers"])


@router.get("", response_model=list[CustomerResponse])
def list_customers(
    skip: int = 0,
    limit: int = 100,
    include_inactive: bool = Query(False, description="Include soft-deleted (inactive) customers"),
    db: Session = Depends(get_db),
):
    """顧客一覧を取得.

    デフォルトでは有効な顧客（valid_to >= 今日）のみを返します。
    論理削除された顧客も含める場合はinclude_inactive=trueを指定してください。

    Args:
        skip: スキップ件数（ページネーション用）
        limit: 取得件数（最大100件）
        include_inactive: 論理削除済み顧客を含めるか（デフォルト: False）
        db: データベースセッション

    Returns:
        list[CustomerResponse]: 顧客情報のリスト
    """
    service = CustomerService(db)
    return service.get_all(skip=skip, limit=limit, include_inactive=include_inactive)


@router.get("/template/download")
def download_customers_template(format: str = "csv", include_sample: bool = True):
    """顧客インポートテンプレートをダウンロード.

    Args:
        format: ファイル形式（'csv' または 'xlsx'、デフォルト: csv）
        include_sample: サンプル行を含めるか（デフォルト: True）

    Returns:
        顧客インポート用テンプレートファイル
    """
    return ExportService.export_template("customers", format=format, include_sample=include_sample)


@router.get("/export/download")
def export_customers(format: str = "csv", db: Session = Depends(get_db)):
    """顧客データをCSVまたはExcelでエクスポート.

    Args:
        format: エクスポート形式（'csv' または 'xlsx'、デフォルト: csv）
        db: データベースセッション

    Returns:
        StreamingResponse: エクスポートファイル
    """
    service = CustomerService(db)
    customers = service.get_all()
    data = [CustomerResponse.model_validate(c).model_dump() for c in customers]

    if format == "xlsx":
        return ExportService.export_to_excel(data, "customers")
    return ExportService.export_to_csv(data, "customers")


@router.get("/{customer_code}", response_model=CustomerResponse)
def get_customer(customer_code: str, db: Session = Depends(get_db)):
    """顧客コードで顧客を取得.

    Args:
        customer_code: 顧客コード
        db: データベースセッション

    Returns:
        CustomerResponse: 顧客詳細情報

    Raises:
        HTTPException: 顧客が存在しない場合（404）
    """
    service = CustomerService(db)
    return service.get_by_code(customer_code)


@router.post("", response_model=CustomerResponse, status_code=201)
def create_customer(
    customer: CustomerCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """顧客を新規作成.

    Args:
        customer: 作成する得意先情報
        db: データベースセッション
        current_user: 現在のユーザー（管理者権限が必要）

    Returns:
        CustomerResponse: 作成された顧客情報

    Raises:
        HTTPException: 顧客コードが既に存在する場合（409）
    """
    service = CustomerService(db)
    existing = service.get_by_code(customer.customer_code, raise_404=False)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Customer with this code already exists",
        )
    try:
        user_id = current_user.id if current_user else None
        return service.create(customer, user_id=user_id)
    except Exception as e:
        from sqlalchemy.exc import IntegrityError

        if isinstance(e, IntegrityError):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Customer with this code already exists",
            )
        raise e


@router.put("/{customer_code}", response_model=CustomerResponse)
def update_customer(
    customer_code: str,
    customer: CustomerUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a customer."""
    service = CustomerService(db)
    is_admin = any(ur.role.role_code == "admin" for ur in current_user.user_roles)
    return service.update_by_code(
        customer_code, customer, is_admin=is_admin, user_id=current_user.id
    )


@router.delete("/{customer_code}", status_code=204)
def delete_customer(
    customer_code: str,
    end_date: date | None = Query(None, description="End date for soft delete"),
    version: int = Query(..., description="楽観的ロック用バージョン"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Soft delete customer (set valid_to to end_date or today)."""
    service = CustomerService(db)
    service.delete_by_code(
        customer_code,
        end_date=end_date,
        expected_version=version,
        user_id=current_user.id,
    )
    return None


@router.delete("/{customer_code}/permanent", status_code=204)
def permanent_delete_customer(
    customer_code: str,
    version: int = Query(..., description="楽観的ロック用バージョン"),
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Permanently delete customer (admin only)."""
    service = CustomerService(db)
    service.hard_delete_by_code(customer_code, expected_version=version, user_id=current_user.id)
    return None


@router.post("/{customer_code}/restore", response_model=CustomerResponse)
def restore_customer(
    customer_code: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Restore a soft-deleted customer."""
    service = CustomerService(db)
    return service.restore_by_code(customer_code, user_id=current_user.id)


@router.post("/bulk-upsert", response_model=BulkUpsertResponse)
def bulk_upsert_customers(request: CustomerBulkUpsertRequest, db: Session = Depends(get_db)):
    """Bulk upsert customers by customer_code."""
    service = CustomerService(db)
    return service.bulk_upsert(request.rows)
