"""Inventory item (summary) API endpoints."""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.schemas.inventory_schema import InventoryItemResponse
from app.services.inventory_service import InventoryService


router = APIRouter(prefix="/inventory-items", tags=["inventory-items"])


@router.get("", response_model=list[InventoryItemResponse])
def list_inventory_items(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=1000),
    product_id: int | None = None,
    warehouse_id: int | None = None,
    db: Session = Depends(get_db),
):
    """
    在庫サマリ一覧取得.

    Args:
        skip: スキップ件数（ページネーション用）
        limit: 取得件数上限
        product_id: 製品IDでフィルタ
        warehouse_id: 倉庫IDでフィルタ
        db: データベースセッション

    Returns:
        在庫サマリのリスト
    """
    service = InventoryService(db)
    return service.get_inventory_items(
        skip=skip,
        limit=limit,
        product_id=product_id,
        warehouse_id=warehouse_id,
    )


@router.get(
    "/{product_id}/{warehouse_id}",
    response_model=InventoryItemResponse,
)
def get_inventory_item(
    product_id: int,
    warehouse_id: int,
    db: Session = Depends(get_db),
):
    """
    在庫サマリ詳細取得（製品ID + 倉庫ID単位）.

    Args:
        product_id: 製品ID
        warehouse_id: 倉庫ID
        db: データベースセッション

    Returns:
        在庫サマリ

    Raises:
        HTTPException: 在庫サマリが見つからない場合は404
    """
    service = InventoryService(db)
    item = service.get_inventory_item_by_product_warehouse(product_id, warehouse_id)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Inventory item for product_id={product_id} and warehouse_id={warehouse_id} not found",
        )
    return item
