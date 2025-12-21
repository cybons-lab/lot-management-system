# backend/app/api/routes/orders/orders_router.py
"""受注エンドポイント（全修正版） I/O整形のみを責務とし、例外変換はグローバルハンドラに委譲."""

import logging
from datetime import date

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.application.services.allocations.actions import (
    create_manual_reservation,
    release_reservation,
)
from app.application.services.assignments.assignment_service import UserSupplierAssignmentService
from app.application.services.common.uow_service import UnitOfWork
from app.application.services.orders.order_service import OrderService
from app.infrastructure.persistence.models import Order, OrderLine, User
from app.infrastructure.persistence.models.lot_reservations_model import (
    LotReservation,
    ReservationSourceType,
    ReservationStatus,
)
from app.presentation.api.deps import get_db, get_uow
from app.presentation.api.routes.auth.auth_router import get_current_user, get_current_user_optional
from app.presentation.schemas.orders.orders_schema import (
    OrderCreate,
    OrderWithLinesResponse,
)


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
    order_line_id: int, payload: ManualAllocationSavePayload, uow: UnitOfWork = Depends(get_uow)
):
    """
    手動引当保存 (確定) - UoWによるトランザクション保護版.

    既存の引当を一度クリアし、リクエストされた内容で再作成する（上書き保存）。
    全ての操作をUoWのトランザクションで実行し、エラー時は自動ロールバック。
    """
    assert uow.session is not None
    db = uow.session

    # 1. P3: 既存の予約を全てリリース（在庫を解放、commit無し）
    existing_reservations = (
        db.query(LotReservation)
        .filter(
            LotReservation.source_type == ReservationSourceType.ORDER,
            LotReservation.source_id == order_line_id,
            LotReservation.status != ReservationStatus.RELEASED,
        )
        .all()
    )
    for res in existing_reservations:
        release_reservation(db, res.id, commit_db=False)

    # 2. 新しい予約を作成（在庫を引き当てる、commit無し）
    created_ids = []
    for item in payload.allocations:
        if item.quantity <= 0:
            continue

        reservation = create_manual_reservation(
            db, order_line_id, item.lot_id, item.quantity, commit_db=False
        )
        created_ids.append(reservation.id)

    # 3. UoWがスコープ終了時に自動commit（成功時）/ rollback（例外時）
    db.flush()  # Ensure IDs are assigned

    # 4. 作成された予約をrefresh
    for res_id in created_ids:
        refreshed_res = db.get(LotReservation, res_id)
        if refreshed_res:
            db.refresh(refreshed_res)

    logger.info(f"Saved allocations for line {order_line_id}: {len(created_ids)} items")

    return {
        "success": True,
        "message": f"Allocations saved successfully. ({len(created_ids)} items)",
        "allocated_ids": created_ids,
    }


@router.post("/refresh-all-statuses", status_code=200)
def refresh_all_order_line_statuses(uow: UnitOfWork = Depends(get_uow)):
    """全受注明細および受注のステータスを再計算・更新.

    既存の allocations データに基づいて OrderLine.status と Order.status
    を正しい値に更新します。
    """
    assert uow.session is not None
    db = uow.session

    from app.application.services.allocations.utils import (
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

    orders = db.query(Order).all()
    updated_order_count = 0

    for order in orders:
        old_status = order.status
        update_order_allocation_status(db, order.id)
        db.flush()

        if order.status != old_status:
            updated_order_count += 1

    # UoWがスコープ終了時に自動commit
    logger.info(
        f"Refreshed {updated_line_count} order line statuses and "
        f"{updated_order_count} order statuses"
    )

    return {
        "success": True,
        "message": (f"Successfully refreshed {len(lines)} order lines and {len(orders)} orders"),
        "updated_line_count": updated_line_count,
        "updated_order_count": updated_order_count,
        "total_line_count": len(lines),
        "total_order_count": len(orders),
    }


@router.post("/{order_id}/lock")
def acquire_lock(
    order_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """受注の編集ロックを取得."""
    service = OrderService(db)
    result = service.acquire_lock(order_id, current_user.id)
    db.commit()
    return result


@router.delete("/{order_id}/lock")
def release_lock(
    order_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """受注の編集ロックを解放."""
    service = OrderService(db)
    result = service.release_lock(order_id, current_user.id)
    db.commit()
    return result
