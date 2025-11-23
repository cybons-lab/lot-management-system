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
from app.models import Allocation  # 追加
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
    db: Session = Depends(get_db)  # DBセッションを追加
):
    """
    手動引当保存 (確定).
    
    既存の引当を一度クリアし、リクエストされた内容で再作成する（上書き保存）。
    これにより、DB上の在庫数(allocated_quantity)とステータスが更新される。
    """
    try:
        # 1. 既存の引当を全てキャンセル（在庫を解放）
        #    ※ リスト画面からの保存は「その時点のUI状態」を正とするため、全置換を行う
        existing_allocations = db.query(Allocation).filter(Allocation.order_line_id == order_line_id).all()
        for alloc in existing_allocations:
            cancel_allocation(db, alloc.id)
        
        # 2. 新しい引当を作成（在庫を引き当てる）
        created_ids = []
        for item in payload.allocations:
            if item.quantity <= 0:
                continue
            
            # 引当実行（内部でDBコミットされるため注意）
            # ※ 本来は1つのトランザクションにまとめるべきだが、既存serviceの仕様上ループで処理
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
        # クライアント側でリトライできるよう500を返す
        raise HTTPException(status_code=500, detail=f"Failed to save allocations: {str(e)}")