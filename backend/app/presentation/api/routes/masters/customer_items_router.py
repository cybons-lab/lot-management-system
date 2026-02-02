"""Customer items router (得意先品番マッピングAPI).

Updated: サロゲートキー（id）ベースに移行
- パスパラメータを /{id} に変更
- external_product_code → customer_part_no
- 後方互換性: /{customer_id}/{customer_part_no} も維持
"""

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.application.services.common.export_service import ExportService
from app.application.services.masters.customer_items_service import CustomerItemsService
from app.core.database import get_db
from app.infrastructure.persistence.models.auth_models import User
from app.presentation.api.routes.auth.auth_router import (
    get_current_admin,
    get_current_user_optional,
)
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
    supplier_item_id: int | None = Query(None, description="仕入先品目IDでフィルタ"),
    supplier_id: int | None = Query(None, description="仕入先IDでフィルタ（supplier_items経由）"),
    include_inactive: bool = Query(False, description="無効なマッピングを含めるか"),
    db: Session = Depends(get_db),
):
    """得意先品番マッピング一覧取得.

    Phase1: product_group_id → supplier_item_id に変更

    Args:
        skip: スキップ件数
        limit: 取得件数上限
        customer_id: 得意先IDでフィルタ（オプション）
        supplier_item_id: 仕入先品目IDでフィルタ（オプション）
        supplier_id: 仕入先IDでフィルタ（オプション、supplier_items経由）
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
        supplier_item_id=supplier_item_id,
        supplier_id=supplier_id,
        include_inactive=include_inactive,
    )


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


@router.get("/by-customer/{customer_id}", response_model=list[CustomerItemResponse])
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


@router.get("/{id}", response_model=CustomerItemResponse)
def get_customer_item(id: int, db: Session = Depends(get_db)):
    """得意先品番マッピング詳細取得.

    Args:
        id: 得意先品番マッピングID
        db: データベースセッション

    Returns:
        品番マッピング詳細

    Raises:
        HTTPException: マッピングが存在しない場合
    """
    service = CustomerItemsService(db)
    item = service.get_by_id_enriched(id)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer item mapping not found",
        )
    return item


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

    # Check if mapping already exists (business key check)
    existing = service.get_by_key(item.customer_id, item.customer_part_no)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Customer item mapping already exists",
        )

    return service.create(item)


@router.put("/{id}", response_model=CustomerItemResponse)
def update_customer_item(
    id: int,
    item: CustomerItemUpdate,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    """得意先品番マッピング更新.

    Args:
        id: 得意先品番マッピングID
        item: 更新する品番マッピング情報
        db: データベースセッション
        current_user: 認証済みユーザー（オプション）

    Returns:
        更新された品番マッピング

    Raises:
        HTTPException: マッピングが存在しない場合
    """
    service = CustomerItemsService(db)
    # 管理者かどうかを判定
    is_admin = False
    if current_user:
        roles = [ur.role.role_code for ur in current_user.user_roles]
        is_admin = "admin" in roles

    updated = service.update_by_id(id, item, is_admin=is_admin)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer item mapping not found",
        )
    return updated


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_customer_item(
    id: int,
    end_date: date | None = Query(None),
    db: Session = Depends(get_db),
):
    """得意先品番マッピング削除.

    Args:
        id: 得意先品番マッピングID
        end_date: 無効化日（指定がない場合は即時）
        db: データベースセッション

    Raises:
        HTTPException: マッピングが存在しない場合
    """
    service = CustomerItemsService(db)
    deleted = service.delete_by_id(id, end_date)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer item mapping not found",
        )
    return None


@router.delete("/{id}/permanent", status_code=status.HTTP_204_NO_CONTENT)
def permanent_delete_customer_item(
    id: int,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """得意先品番マッピング完全削除.

    Args:
        id: 得意先品番マッピングID
        current_user: 認証済み管理者ユーザー
        db: データベースセッション

    Raises:
        HTTPException: マッピングが存在しない場合
    """
    service = CustomerItemsService(db)
    deleted = service.permanent_delete_by_id(id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer item mapping not found",
        )
    return None


@router.post("/{id}/restore", response_model=CustomerItemResponse)
def restore_customer_item(id: int, db: Session = Depends(get_db)):
    """得意先品番マッピング復元.

    Args:
        id: 得意先品番マッピングID
        db: データベースセッション

    Returns:
        復元された品番マッピング

    Raises:
        HTTPException: マッピングが存在しない場合
    """
    service = CustomerItemsService(db)
    restored = service.restore_by_id(id)
    if not restored:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer item mapping not found",
        )
    return restored


@router.post("/bulk-upsert", response_model=BulkUpsertResponse)
def bulk_upsert_customer_items(
    request: CustomerItemBulkUpsertRequest, db: Session = Depends(get_db)
):
    """得意先品番マッピング一括登録/更新.

    ビジネスキー（customer_id, customer_part_no）で判定し、
    既存レコードがあれば更新、なければ新規作成します。

    Args:
        request: 一括登録/更新リクエスト
        db: データベースセッション

    Returns:
        BulkUpsertResponse: 作成/更新/失敗件数のサマリー
    """
    service = CustomerItemsService(db)
    return service.bulk_upsert(request.rows)
