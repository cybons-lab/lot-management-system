"""Customer items router (得意先品番マッピングAPI)."""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.masters.customer_items_schema import (
    CustomerItemCreate,
    CustomerItemResponse,
    CustomerItemUpdate,
)
from app.services.masters.customer_items_service import CustomerItemsService


router = APIRouter(prefix="/customer-items", tags=["customer-items"])


@router.get("", response_model=list[CustomerItemResponse])
def list_customer_items(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    customer_id: int | None = Query(None, description="得意先IDでフィルタ"),
    product_id: int | None = Query(None, description="製品IDでフィルタ"),
    db: Session = Depends(get_db),
):
    """
    得意先品番マッピング一覧取得.

    Args:
        skip: スキップ件数
        limit: 取得件数上限
        customer_id: 得意先IDでフィルタ（オプション）
        product_id: 製品IDでフィルタ（オプション）
        db: データベースセッション

    Returns:
        得意先品番マッピングのリスト
    """
    service = CustomerItemsService(db)
    return service.get_all(skip=skip, limit=limit, customer_id=customer_id, product_id=product_id)


@router.get("/{customer_id}", response_model=list[CustomerItemResponse])
def list_customer_items_by_customer(customer_id: int, db: Session = Depends(get_db)):
    """
    特定得意先の品番マッピング一覧取得.

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
    """
    得意先品番マッピング登録.

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
    """
    得意先品番マッピング更新.

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
    updated = service.update(customer_id, external_product_code, item)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer item mapping not found",
        )
    return updated


@router.delete("/{customer_id}/{external_product_code}", status_code=status.HTTP_204_NO_CONTENT)
def delete_customer_item(
    customer_id: int, external_product_code: str, db: Session = Depends(get_db)
):
    """
    得意先品番マッピング削除.

    Args:
        customer_id: 得意先ID
        external_product_code: 得意先品番
        db: データベースセッション

    Raises:
        HTTPException: マッピングが存在しない場合
    """
    service = CustomerItemsService(db)
    deleted = service.delete(customer_id, external_product_code)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer item mapping not found",
        )
    return None
