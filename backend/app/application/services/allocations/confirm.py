"""Hard allocation confirmation operations.

Handles Soft to Hard allocation conversion:
- Confirm hard allocation (single)
- Batch confirmation

P3: CONFIRMED status requires successful SAP registration via SapGateway.
"""

from __future__ import annotations

from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.application.services.allocations.preempt import preempt_soft_allocations_for_hard
from app.application.services.allocations.schemas import (
    AllocationCommitError,
    AllocationNotFoundError,
    InsufficientStockError,
)
from app.application.services.allocations.utils import (
    update_order_allocation_status,
    update_order_line_status,
)
from app.application.services.inventory.stock_calculation import get_reserved_quantity
from app.core.time_utils import utcnow
from app.infrastructure.external.sap_gateway import SapGateway, get_sap_gateway
from app.infrastructure.persistence.models import Allocation, Lot, OrderLine
from app.infrastructure.persistence.models.lot_reservations_model import (
    LotReservation,
    ReservationSourceType,
    ReservationStatus,
)


def confirm_hard_allocation(
    db: Session,
    allocation_id: int,
    *,
    confirmed_by: str | None = None,
    quantity: Decimal | None = None,
    commit_db: bool = True,
    sap_gateway: SapGateway | None = None,
) -> tuple[Allocation, Allocation | None]:
    """Soft引当をHard引当に確定（Soft → Hard変換）.

    Args:
        db: データベースセッション
        allocation_id: 引当ID
        confirmed_by: 確定操作を行ったユーザーID（オプション）
        quantity: 部分確定の場合の数量（未指定で全量確定）※現在は非サポート
        commit_db: Trueの場合、処理完了後にcommitを実行（デフォルト: True）
        sap_gateway: SAP Gateway実装（未指定時はデフォルトのMockSapGatewayを使用）

    Returns:
        tuple[Allocation, Allocation | None]:
            - 確定された引当（Hard）
            - 部分確定の場合、残りのSoft引当（None: 全量確定の場合）

    Raises:
        AllocationNotFoundError: 引当が見つからない場合
        AllocationCommitError: 確定に失敗した場合

    Note:
        This operation is idempotent. If the allocation is already confirmed,
        it returns successfully without making changes.
    """
    allocation = db.get(Allocation, allocation_id)
    if not allocation:
        raise AllocationNotFoundError(f"Allocation {allocation_id} not found")

    # P1-3: Idempotent confirm - return success if already confirmed
    if allocation.allocation_type == "hard":
        # Already confirmed, return idempotently without error
        return allocation, None

    if not allocation.lot_id:
        raise AllocationCommitError(
            "PROVISIONAL_ALLOCATION", "入荷予定ベースの仮引当は確定できません"
        )

    lot_stmt = select(Lot).where(Lot.id == allocation.lot_id).with_for_update()
    lot = db.execute(lot_stmt).scalar_one_or_none()
    if not lot:
        raise AllocationCommitError("LOT_NOT_FOUND", f"Lot ID {allocation.lot_id} not found")

    if lot.status not in ("active",):
        raise AllocationCommitError(
            "LOT_NOT_ACTIVE", f"ロット {lot.lot_number} は {lot.status} 状態のため確定できません"
        )

    confirm_qty = quantity if quantity is not None else allocation.allocated_quantity

    if confirm_qty > allocation.allocated_quantity:
        raise AllocationCommitError(
            "INVALID_QUANTITY",
            f"確定数量 {confirm_qty} は引当数量 {allocation.allocated_quantity} を超えています",
        )

    reserved_qty = get_reserved_quantity(db, lot.id)
    if lot.current_quantity < reserved_qty:
        available = lot.current_quantity - (reserved_qty - allocation.allocated_quantity)
        raise InsufficientStockError(
            lot_id=lot.id,
            lot_number=lot.lot_number,
            required=float(confirm_qty),
            available=float(max(available, Decimal(0))),
        )

    preempt_soft_allocations_for_hard(
        db,
        lot_id=lot.id,
        required_qty=confirm_qty,
        hard_demand_id=allocation.order_line_id,
    )

    now = utcnow()

    # P3: Partial confirmation is no longer supported (avoid Allocation() creation)
    # Full quantity confirmation only
    if quantity is not None and quantity < allocation.allocated_quantity:
        raise AllocationCommitError(
            "PARTIAL_CONFIRM_NOT_SUPPORTED",
            "部分確定は現在サポートされていません。全量確定のみ可能です。",
        )

    # Find or create LotReservation
    reservation = (
        db.query(LotReservation)
        .filter(
            LotReservation.lot_id == lot.id,
            LotReservation.source_id == allocation.order_line_id,
            LotReservation.source_type == ReservationSourceType.ORDER,
            LotReservation.status == ReservationStatus.ACTIVE,
        )
        .first()
    )

    if not reservation:
        # Create new reservation if not exists
        reservation = LotReservation(
            lot_id=lot.id,
            source_type=ReservationSourceType.ORDER,
            source_id=allocation.order_line_id,
            reserved_qty=confirm_qty,
            status=ReservationStatus.ACTIVE,
            created_at=now,
        )
        db.add(reservation)
        db.flush()

    # P3: Call SAP Gateway for CONFIRMED transition
    gateway = sap_gateway or get_sap_gateway()
    sap_result = gateway.register_allocation(reservation)

    if not sap_result.success:
        # SAP registration failed - keep as ACTIVE, do not confirm
        raise AllocationCommitError(
            "SAP_REGISTRATION_FAILED",
            f"SAP登録に失敗しました: {sap_result.error_message}",
        )

    # SAP registration succeeded - update reservation with SAP info
    reservation.status = ReservationStatus.CONFIRMED
    reservation.confirmed_at = now
    reservation.sap_document_no = sap_result.document_no
    reservation.sap_registered_at = sap_result.registered_at

    # Update allocation record (legacy, for backward compat)
    allocation.allocation_type = "hard"
    allocation.confirmed_at = now
    allocation.confirmed_by = confirmed_by
    allocation.updated_at = now

    lot.updated_at = now

    db.flush()

    if allocation.order_line_id:
        line = db.get(OrderLine, allocation.order_line_id)
        if line:
            update_order_allocation_status(db, line.order_id)
            update_order_line_status(db, line.id)

    if commit_db:
        db.commit()
        db.refresh(allocation)

        from app.domain.events import AllocationConfirmedEvent, EventDispatcher

        event = AllocationConfirmedEvent(
            allocation_id=allocation.id,
            lot_id=lot.id,
            quantity=confirm_qty,
        )
        EventDispatcher.queue(event)

    # P3: No remaining_allocation (partial confirm not supported)
    return allocation, None


def confirm_hard_allocations_batch(
    db: Session,
    allocation_ids: list[int],
    *,
    confirmed_by: str | None = None,
) -> tuple[list[int], list[dict]]:
    """複数の引当を一括でHard確定.

    Args:
        db: データベースセッション
        allocation_ids: 確定対象の引当ID一覧
        confirmed_by: 確定操作を行ったユーザーID（オプション）

    Returns:
        tuple[list[int], list[dict]]:
            - 確定成功した引当ID一覧
            - 確定失敗した引当情報一覧
    """
    confirmed_ids: list[int] = []
    failed_items: list[dict] = []

    for allocation_id in allocation_ids:
        try:
            confirm_hard_allocation(
                db,
                allocation_id,
                confirmed_by=confirmed_by,
                commit_db=False,
            )
            confirmed_ids.append(allocation_id)
        except AllocationNotFoundError:
            failed_items.append(
                {
                    "id": allocation_id,
                    "error": "ALLOCATION_NOT_FOUND",
                    "message": f"引当 {allocation_id} が見つかりません",
                }
            )
        except InsufficientStockError as e:
            failed_items.append(
                {
                    "id": allocation_id,
                    "error": "INSUFFICIENT_STOCK",
                    "message": f"ロット {e.lot_number} の在庫が不足しています "
                    f"(必要: {e.required}, 利用可能: {e.available})",
                }
            )
        except AllocationCommitError as e:
            failed_items.append(
                {
                    "id": allocation_id,
                    "error": e.error_code if hasattr(e, "error_code") else "COMMIT_ERROR",
                    "message": str(e),
                }
            )

    if confirmed_ids:
        db.commit()

    return confirmed_ids, failed_items
