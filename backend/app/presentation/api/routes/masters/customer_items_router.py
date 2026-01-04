"""Customer items router (得意先品番マッピングAPI)."""

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.application.services.common.export_service import ExportService
from app.application.services.masters.customer_items_service import CustomerItemsService
from app.core.database import get_db
from app.infrastructure.persistence.models.auth_models import User
from app.presentation.api.routes.auth.auth_router import get_current_admin
from app.presentation.schemas.masters.customer_items_schema import (
    CustomerItemBulkUpsertRequest,
    CustomerItemCreate,
    CustomerItemResponse,
    CustomerItemUpdate,
)
from app.presentation.schemas.masters.masters_schema import BulkUpsertResponse


router = APIRouter(prefix="/customer-items", tags=["customer-items"])


@router.get("", response_model=list[CustomerItemResponse])
def list_customer_items(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    customer_id: int | None = Query(None, description="得意先IDでフィルタ"),
    product_id: int | None = Query(None, description="製品IDでフィルタ"),
    include_inactive: bool = Query(False, description="無効なマッピングを含めるか"),
    db: Session = Depends(get_db),
):
    """得意先品番マッピング一覧取得.

    Args:
        skip: スキップ件数
        limit: 取得件数上限
        customer_id: 得意先IDでフィルタ（オプション）
        product_id: 製品IDでフィルタ（オプション）
        include_inactive: 無効なマッピングを含めるか
        db: データベースセッション

    Returns:
        得意先品番マッピングのリスト
    """
    service = CustomerItemsService(db)
    return service.get_all(
        skip=skip,
        limit=limit,
        customer_id=customer_id,
        product_id=product_id,
        include_inactive=include_inactive,
    )


@router.get("/{customer_id}", response_model=list[CustomerItemResponse])
def list_customer_items_by_customer(customer_id: int, db: Session = Depends(get_db)):
    """特定得意先の品番マッピング一覧取得.

    Args:
        customer_id: 得意先ID
        db: データベースセッション

    Returns:
        該当得意先の品番マッピングリスト
    """
    service = CustomerItemsService(db)
    return service.get_by_customer(customer_id)


@router.post("", response_model=CustomerItemResponse, status_code=status.HTTP_201_CREATED)
def create_customer_item(item: CustomerItemCreate, db: Session = Depends(get_db)):
    """得意先品番マッピング登録.

    Args:
        item: 登録する品番マッピング情報
        db: データベースセッション

    Returns:
        登録された品番マッピング

    Raises:
        HTTPException: 既に同じマッピングが存在する場合
    """
    service = CustomerItemsService(db)

    # Check if mapping already exists
    existing = service.get_by_key(item.customer_id, item.external_product_code)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Customer item mapping already exists",
        )

    return service.create(item)


@router.put("/{customer_id}/{external_product_code}", response_model=CustomerItemResponse)
def update_customer_item(
    customer_id: int,
    external_product_code: str,
    item: CustomerItemUpdate,
    db: Session = Depends(get_db),
):
    """得意先品番マッピング更新.

    Args:
        customer_id: 得意先ID
        external_product_code: 得意先品番
        item: 更新する品番マッピング情報
        db: データベースセッション

    Returns:
        更新された品番マッピング

    Raises:
        HTTPException: マッピングが存在しない場合
    """
    service = CustomerItemsService(db)
    updated = service.update_by_key(customer_id, external_product_code, item)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer item mapping not found",
        )
    return updated


@router.delete("/{customer_id}/{external_product_code}", status_code=status.HTTP_204_NO_CONTENT)
def delete_customer_item(
    customer_id: int,
    external_product_code: str,
    end_date: date | None = Query(None),
    db: Session = Depends(get_db),
):
    """得意先品番マッピング削除.

    Args:
        customer_id: 得意先ID
        external_product_code: 得意先品番
        end_date: 無効化日（指定がない場合は即時）
        db: データベースセッション

    Raises:
        HTTPException: マッピングが存在しない場合
    """
    service = CustomerItemsService(db)
    deleted = service.delete_by_key(customer_id, external_product_code, end_date)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer item mapping not found",
        )
    return None


@router.delete(
    "/{customer_id}/{external_product_code}/permanent", status_code=status.HTTP_204_NO_CONTENT
)
def permanent_delete_customer_item(
    customer_id: int,
    external_product_code: str,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """得意先品番マッピング完全削除.

    Args:
        customer_id: 得意先ID
        external_product_code: 得意先品番
        db: データベースセッション

    Raises:
        HTTPException: マッピングが存在しない場合
    """
    service = CustomerItemsService(db)
    deleted = service.permanent_delete_by_key(customer_id, external_product_code)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer item mapping not found",
        )
    return None


@router.post("/{customer_id}/{external_product_code}/restore", response_model=CustomerItemResponse)
def restore_customer_item(
    customer_id: int, external_product_code: str, db: Session = Depends(get_db)
):
    """得意先品番マッピング復元.

    Args:
        customer_id: 得意先ID
        external_product_code: 得意先品番
        db: データベースセッション

    Returns:
        復元された品番マッピング

    Raises:
        HTTPException: マッピングが存在しない場合
    """
    service = CustomerItemsService(db)
    restored = service.restore_by_key(customer_id, external_product_code)
    if not restored:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer item mapping not found",
        )
    return restored


@router.get("/export/download")
def export_customer_items(format: str = "csv", db: Session = Depends(get_db)):
    """得意先品番マッピングをエクスポート.

    Args:
        format: エクスポート形式（'csv' または 'xlsx'）
        db: データベースセッション

    Returns:
        Excel形式またはCSV形式のファイルレスポンス
    """
    service = CustomerItemsService(db)
    items = service.get_all()

    if format == "xlsx":
        return ExportService.export_to_excel(items, "customer_items")
    return ExportService.export_to_csv(items, "customer_items")


@router.post("/bulk-upsert", response_model=BulkUpsertResponse)
def bulk_upsert_customer_items(
    request: CustomerItemBulkUpsertRequest, db: Session = Depends(get_db)
):
    """得意先品番マッピング一括登録/更新.

    複合キー（customer_id, external_product_code）で判定し、
    既存レコードがあれば更新、なければ新規作成します。

    Args:
        request: 一括登録/更新リクエスト
        db: データベースセッション

    Returns:
        BulkUpsertResponse: 作成/更新/失敗件数のサマリー
    """
    service = CustomerItemsService(db)
    return service.bulk_upsert(request.rows)
