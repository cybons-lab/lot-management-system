# backend/app/api/routes/orders/orders_router.py
"""受注エンドポイント（全修正版） I/O整形のみを責務とし、例外変換はグローバルハンドラに委譲."""

import logging
from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_uow
from app.api.routes.auth.auth_router import get_current_user, get_current_user_optional
from app.models import Allocation, Order, OrderLine, User
from app.schemas.orders.orders_schema import (
    OrderCreate,
    OrderWithLinesResponse,
)
from app.services.allocations.actions import allocate_manually, cancel_allocation  # 追加
from app.services.assignments.assignment_service import UserSupplierAssignmentService
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
    order_type: str | None = None,
    prioritize_primary: bool = True,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    """受注一覧取得（読み取り専用）."""
    # Get primary supplier IDs for sorting
    primary_supplier_ids: list[int] | None = None
    if prioritize_primary and current_user:
        assignment_service = UserSupplierAssignmentService(db)
        primary_supplier_ids = assignment_service.get_primary_supplier_ids(current_user.id)

    service = OrderService(db)
    return service.get_orders(
        skip=skip,
        limit=limit,
        status=status,
        customer_code=customer_code,
        date_from=date_from,
        date_to=date_to,
        order_type=order_type,
        primary_supplier_ids=primary_supplier_ids,
    )


@router.get("/{order_id}", response_model=OrderWithLinesResponse)
def get_order(order_id: int, db: Session = Depends(get_db)):
    """受注詳細取得（読み取り専用、明細含む）."""
    service = OrderService(db)
    return service.get_order_detail(order_id)


@router.post("", response_model=OrderWithLinesResponse, status_code=201)
def create_order(order: OrderCreate, uow: UnitOfWork = Depends(get_uow)):
    """受注作成."""
    assert uow.session is not None
    service = OrderService(uow.session)
    return service.create_order(order)


@router.delete("/{order_id}/cancel", status_code=204)
def cancel_order(order_id: int, uow: UnitOfWork = Depends(get_uow)):
    """受注キャンセル."""
    assert uow.session is not None
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
    order_line_id: int, payload: ManualAllocationSavePayload, db: Session = Depends(get_db)
):
    """
    手動引当保存 (確定) - トランザクション保護版.

    既存の引当を一度クリアし、リクエストされた内容で再作成する（上書き保存）。
    全ての操作を1つのトランザクションで実行し、エラー時はロールバックします。
    """
    try:
        # 1. 既存の引当を全てキャンセル（在庫を解放、commit無し）
        existing_allocations = (
            db.query(Allocation).filter(Allocation.order_line_id == order_line_id).all()
        )
        for alloc in existing_allocations:
            cancel_allocation(db, alloc.id, commit_db=False)

        # 2. 新しい引当を作成（在庫を引き当てる、commit無し）
        created_ids = []
        for item in payload.allocations:
            if item.quantity <= 0:
                continue

            allocation = allocate_manually(
                db, order_line_id, item.lot_id, item.quantity, commit_db=False
            )
            created_ids.append(allocation.id)

        # 3. 全て成功してから一括commit
        db.commit()

        # 4. 作成された引当をrefresh
        for alloc_id in created_ids:
            refreshed_alloc: Allocation | None = (
                db.query(Allocation).filter(Allocation.id == alloc_id).first()
            )
            if refreshed_alloc:
                db.refresh(refreshed_alloc)

        logger.info(f"Saved allocations for line {order_line_id}: {len(created_ids)} items")

        return {
            "success": True,
            "message": f"Allocations saved successfully. ({len(created_ids)} items)",
            "allocated_ids": created_ids,
        }

    except ValueError as e:
        logger.error(f"Validation error during allocation save: {e}")
        db.rollback()
        # Re-raise as DomainError for global handler
        from app.domain.order import OrderValidationError

        raise OrderValidationError(str(e)) from e
    except Exception as e:
        logger.exception(f"System error during allocation save: {e}")
        db.rollback()
        raise  # Let global handler format the response


@router.post("/refresh-all-statuses", status_code=200)
def refresh_all_order_line_statuses(db: Session = Depends(get_db)):
    """全受注明細および受注のステータスを再計算・更新.

    既存の allocations データに基づいて OrderLine.status と Order.status
    を正しい値に更新します。
    """
    try:
        from app.services.allocations.utils import (
            update_order_allocation_status,
            update_order_line_status,
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
        logger.exception(f"Failed to refresh statuses: {e}")
        db.rollback()
        raise  # Let global handler format the response


@router.post("/{order_id}/lock")
def acquire_lock(
    order_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """受注の編集ロックを取得."""
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    # Use naive datetime for DB consistency (DB stores without timezone)
    now = datetime.utcnow()

    # 既存ロックのチェック
    if order.locked_by_user_id and order.lock_expires_at:
        if order.lock_expires_at > now:
            # 自分がロックしている場合は更新
            if order.locked_by_user_id == current_user.id:
                order.lock_expires_at = now + timedelta(minutes=10)
                db.commit()
                return {"message": "Lock renewed"}
            else:
                # 他のユーザーがロック中
                raise HTTPException(
                    status_code=409,
                    detail={
                        "error": "LOCKED_BY_ANOTHER_USER",
                        # locked_by_user relationship might not be loaded eagerly, access carefully
                        # But since we have lazy loading (default), accessing should trigger a query or use loaded
                        "locked_by": order.locked_by_user_name or "Unknown User",
                        "locked_at": order.locked_at.isoformat() if order.locked_at else None,
                    },
                )

    # ロックを取得
    order.locked_by_user_id = current_user.id
    order.locked_at = now
    order.lock_expires_at = now + timedelta(minutes=10)
    db.commit()

    return {
        "message": "Lock acquired",
        "locked_by_user_id": current_user.id,
        "locked_at": now.isoformat(),
        "lock_expires_at": order.lock_expires_at.isoformat(),
    }


@router.delete("/{order_id}/lock")
def release_lock(
    order_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """受注の編集ロックを解放."""
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    # 自分がロックしている場合のみ解放可能
    # Note: 管理者権限で強制解除などが必要ならここに条件追加
    if order.locked_by_user_id != current_user.id:
        # ロックがない、または既に切れている場合は成功とみなすか？
        # ここでは厳密にチェック
        if order.locked_by_user_id is None:
            return {"message": "Lock already released"}

        raise HTTPException(status_code=403, detail="You don't own this lock")

    order.locked_by_user_id = None
    order.locked_at = None
    order.lock_expires_at = None
    db.commit()

    return {"message": "Lock released"}
