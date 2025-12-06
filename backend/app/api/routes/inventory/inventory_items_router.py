"""Inventory item (summary) API endpoints."""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.schemas.inventory.inventory_schema import (
    InventoryByProductResponse,
    InventoryBySupplierResponse,
    InventoryByWarehouseResponse,
    InventoryItemResponse,
)
from app.services.inventory.inventory_service import InventoryService
from app.services.assignments.assignment_service import (
    UserSupplierAssignmentService,
)
from app.models.auth_models import User
from app.api.routes.auth.auth_router import get_current_user_optional


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


@router.get("/by-supplier", response_model=list[InventoryBySupplierResponse])
def list_inventory_by_supplier(
    prioritize_primary: bool = True,
    current_user: User | None = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    """
    在庫サマリ（仕入先別集計）取得.

    Returns:
        仕入先ごとの在庫集計リスト
    """
    service = InventoryService(db)
    items = service.get_inventory_by_supplier()

    if prioritize_primary and current_user:
        assignment_service = UserSupplierAssignmentService(db)
        assignments = assignment_service.get_user_suppliers(current_user.id)
        primary_supplier_ids = {a.supplier_id for a in assignments if a.is_primary}
        
        for item in items:
            item["is_primary_supplier"] = item["supplier_id"] in primary_supplier_ids

    return items


@router.get("/by-warehouse", response_model=list[InventoryByWarehouseResponse])
def list_inventory_by_warehouse(db: Session = Depends(get_db)):
    """
    在庫サマリ（倉庫別集計）取得.

    Returns:
        倉庫ごとの在庫集計リスト
    """
    service = InventoryService(db)
    return service.get_inventory_by_warehouse()


@router.get("/by-product", response_model=list[InventoryByProductResponse])
def list_inventory_by_product(db: Session = Depends(get_db)):
    """
    在庫サマリ（製品別集計）取得.

    Returns:
        製品ごとの在庫集計リスト（全倉庫合計）
    """
    service = InventoryService(db)
    return service.get_inventory_by_product()
