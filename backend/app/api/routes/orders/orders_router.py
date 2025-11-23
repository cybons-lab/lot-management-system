# backend/app/api/routes/orders/orders_router.py
"""
受注エンドポイント（全修正版）
I/O整形のみを責務とし、例外変換はグローバルハンドラに委譲.
"""

from datetime import date
import logging

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_uow
from app.models import Allocation, Order, OrderLine  # 追加
from app.schemas.orders.orders_schema import (
    OrderCreate,
    OrderWithLinesResponse,
)
from app.services.allocation.allocations_service import allocate_manually, cancel_allocation  # 追加
from app.services.common.uow_service import UnitOfWork
from app.services.orders.order_service import OrderService


logger = logging.getLogger(__name__)
router = APIRouter(prefix="/orders", tags=["orders"])


@router.get("", response_model=list[OrderWithLinesResponse])
def list_orders(
    skip: int = 0,
    limit: int = 100,
    status: str | None = None,
    customer_code: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    db: Session = Depends(get_db),
):
    """受注一覧取得（読み取り専用）."""
    service = OrderService(db)
    return service.get_orders(
        skip=skip,
        limit=limit,
        status=status,
        customer_code=customer_code,
        date_from=date_from,
        date_to=date_to,
    )


@router.get("/{order_id}", response_model=OrderWithLinesResponse)
def get_order(order_id: int, db: Session = Depends(get_db)):
    """受注詳細取得（読み取り専用、明細含む）."""
    service = OrderService(db)
    return service.get_order_detail(order_id)


@router.post("", response_model=OrderWithLinesResponse, status_code=201)
def create_order(order: OrderCreate, uow: UnitOfWork = Depends(get_uow)):
    """受注作成."""
    service = OrderService(uow.session)
    return service.create_order(order)


@router.delete("/{order_id}/cancel", status_code=204)
def cancel_order(order_id: int, uow: UnitOfWork = Depends(get_uow)):
    """受注キャンセル."""
    service = OrderService(uow.session)
    service.cancel_order(order_id)
    return None


class ManualAllocationItem(BaseModel):
    lot_id: int
    quantity: float


class ManualAllocationSavePayload(BaseModel):
    allocations: list[ManualAllocationItem]


@router.post("/{order_line_id}/allocations", status_code=200)
def save_manual_allocations(
    order_line_id: int,
    payload: ManualAllocationSavePayload,
    db: Session = Depends(get_db)
):
    """
    手動引当保存 (確定).
    
    既存の引当を一度クリアし、リクエストされた内容で再作成する（上書き保存）。
    これにより、DB上の在庫数(allocated_quantity)とステータスが更新される。
    """
    try:
        # 1. 既存の引当を全てキャンセル（在庫を解放）
        existing_allocations = db.query(Allocation).filter(Allocation.order_line_id == order_line_id).all()
        for alloc in existing_allocations:
            cancel_allocation(db, alloc.id)
        
        # 2. 新しい引当を作成（在庫を引き当てる）
        created_ids = []
        for item in payload.allocations:
            if item.quantity <= 0:
                continue
            
            # allocate_manuallyはcommitを含むため、一時的に使用
            # TODO: トランザクション全体を1つにまとめるためにリファクタリングが必要
            allocation = allocate_manually(db, order_line_id, item.lot_id, item.quantity)
            created_ids.append(allocation.id)

        logger.info(f"Saved allocations for line {order_line_id}: {len(created_ids)} items")

        return {
            "success": True,
            "message": f"Allocations saved successfully. ({len(created_ids)} items)",
            "allocated_ids": created_ids,
        }

    except ValueError as e:
        logger.error(f"Validation error during allocation save: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"System error during allocation save: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to save allocations: {str(e)}")


@router.post("/refresh-all-statuses", status_code=200)
def refresh_all_order_line_statuses(db: Session = Depends(get_db)):
    """
    全受注明細および受注のステータスを再計算・更新.
    
    既存の allocations データに基づいて OrderLine.status と Order.status を正しい値に更新します。
    """
    try:
        from app.services.allocation.allocations_service import (
            update_order_line_status,
            update_order_allocation_status,
        )
        
        # 1. 全ての OrderLine のステータスを更新
        lines = db.query(OrderLine).all()
        updated_line_count = 0
        
        for line in lines:
            old_status = line.status
            update_order_line_status(db, line.id)
            db.flush()
            
            if line.status != old_status:
                updated_line_count += 1
        
        # 2. 全ての Order のステータスを更新
        from app.models import Order
        orders = db.query(Order).all()
        updated_order_count = 0
        
        for order in orders:
            old_status = order.status
            update_order_allocation_status(db, order.id)
            db.flush()
            
            if order.status != old_status:
                updated_order_count += 1
        
        db.commit()
        logger.info(
            f"Refreshed {updated_line_count} order line statuses and "
            f"{updated_order_count} order statuses"
        )
        
        return {
            "success": True,
            "message": (
                f"Successfully refreshed {len(lines)} order lines and {len(orders)} orders"
            ),
            "updated_line_count": updated_line_count,
            "updated_order_count": updated_order_count,
            "total_line_count": len(lines),
            "total_order_count": len(orders),
        }
    
    except Exception as e:
        logger.error(f"Failed to refresh statuses: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to refresh statuses: {str(e)}")