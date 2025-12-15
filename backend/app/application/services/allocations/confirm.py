"""Hard allocation confirmation operations.

Handles reservation confirmation:
- Confirm reservation (single)
- Batch confirmation

P3: CONFIRMED status requires successful SAP registration via SapGateway.
All operations now use LotReservation exclusively.
"""

from __future__ import annotations

from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.application.services.allocations.preempt import preempt_soft_reservations_for_hard
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
from app.infrastructure.persistence.models import Lot, OrderLine
from app.infrastructure.persistence.models.lot_reservations_model import (
    LotReservation,
    ReservationSourceType,
    ReservationStatus,
)


def confirm_reservation(
    db: Session,
    reservation_id: int,
    *,
    confirmed_by: str | None = None,
    commit_db: bool = True,
    sap_gateway: SapGateway | None = None,
) -> LotReservation:
    """予約をCONFIRMED状態に確定（SAP登録必須）.

    Args:
        db: データベースセッション
        reservation_id: 予約ID
        confirmed_by: 確定操作を行ったユーザーID（オプション）
        commit_db: Trueの場合、処理完了後にcommitを実行
        sap_gateway: SAP Gateway実装（未指定時はデフォルトのMockSapGatewayを使用）

    Returns:
        確定された予約

    Raises:
        AllocationNotFoundError: 予約が見つからない場合
        AllocationCommitError: 確定に失敗した場合

    Note:
        This operation is idempotent. If already confirmed, returns successfully.
    """
    # Use select with_for_update to lock the reservation row
    stmt = select(LotReservation).where(LotReservation.id == reservation_id).with_for_update()
    reservation = db.execute(stmt).scalar_one_or_none()

    if not reservation:
        raise AllocationNotFoundError(f"Reservation {reservation_id} not found")

    # Idempotent: return success if already confirmed
    if reservation.status == ReservationStatus.CONFIRMED:
        return reservation

    # Guard: RELEASED reservations cannot be confirmed (state machine violation)
    if reservation.status == ReservationStatus.RELEASED:
        raise AllocationCommitError(
            "ALREADY_RELEASED",
            f"Released reservation {reservation_id} cannot be confirmed",
        )

    if not reservation.lot_id:
        raise AllocationCommitError(
            "PROVISIONAL_RESERVATION", "入荷予定ベースの仮予約は確定できません"
        )

    lot_stmt = select(Lot).where(Lot.id == reservation.lot_id).with_for_update()
    lot = db.execute(lot_stmt).scalar_one_or_none()
    if not lot:
        raise AllocationCommitError("LOT_NOT_FOUND", f"Lot ID {reservation.lot_id} not found")

    if lot.status not in ("active",):
        raise AllocationCommitError(
            "LOT_NOT_ACTIVE",
            f"ロット {lot.lot_number} は {lot.status} 状態のため確定できません",
        )

    confirm_qty = reservation.reserved_qty

    # Expiry Check
    # TODO: Future requirement: Support configurable expiry margin (e.g., X days before expiry)
    # Currently strictly checks if expiry_date < today
    if lot.expiry_date and lot.expiry_date < utcnow().date():
        raise AllocationCommitError(
            "LOT_EXPIRED",
            f"Lot {lot.lot_number} has expired (Expiry: {lot.expiry_date})",
        )

    reserved_qty = get_reserved_quantity(db, lot.id)
    if lot.current_quantity < reserved_qty:
        available = lot.current_quantity - (reserved_qty - reservation.reserved_qty)
        raise InsufficientStockError(
            lot_id=lot.id,
            lot_number=lot.lot_number,
            required=float(confirm_qty),
            available=float(max(available, Decimal(0))),
        )

    # Preempt other soft reservations if needed
    preempt_soft_reservations_for_hard(
        db,
        lot_id=lot.id,
        required_qty=confirm_qty,
        hard_demand_id=reservation.source_id,
    )

    now = utcnow()

    # Call SAP Gateway for CONFIRMED transition
    gateway = sap_gateway or get_sap_gateway()
    sap_result = gateway.register_allocation(reservation)

    if not sap_result.success:
        raise AllocationCommitError(
            "SAP_REGISTRATION_FAILED",
            f"SAP登録に失敗しました: {sap_result.error_message}",
        )

    # SAP registration succeeded - update reservation with SAP info
    reservation.status = ReservationStatus.CONFIRMED
    reservation.confirmed_at = now
    reservation.sap_document_no = sap_result.document_no
    reservation.sap_registered_at = sap_result.registered_at
    reservation.updated_at = now

    lot.updated_at = now

    db.flush()

    if reservation.source_type == ReservationSourceType.ORDER and reservation.source_id:
        line = db.get(OrderLine, reservation.source_id)
        if line:
            update_order_allocation_status(db, line.order_id)
            update_order_line_status(db, line.id)

    if commit_db:
        db.commit()
        db.refresh(reservation)

        from app.domain.events import AllocationConfirmedEvent, EventDispatcher

        event = AllocationConfirmedEvent(
            allocation_id=reservation.id,
            lot_id=lot.id,
            quantity=confirm_qty,
        )
        EventDispatcher.queue(event)

    return reservation


def confirm_reservations_batch(
    db: Session,
    reservation_ids: list[int],
    *,
    confirmed_by: str | None = None,
) -> tuple[list[int], list[dict]]:
    """複数の予約を一括でCONFIRMED確定.

    Args:
        db: データベースセッション
        reservation_ids: 確定対象の予約ID一覧
        confirmed_by: 確定操作を行ったユーザーID（オプション）

    Returns:
        tuple[list[int], list[dict]]:
            - 確定成功した予約ID一覧
            - 確定失敗した予約情報一覧
    """
    confirmed_ids: list[int] = []
    failed_items: list[dict] = []

    for reservation_id in reservation_ids:
        try:
            confirm_reservation(
                db,
                reservation_id,
                confirmed_by=confirmed_by,
                commit_db=False,
            )
            confirmed_ids.append(reservation_id)
        except AllocationNotFoundError:
            failed_items.append(
                {
                    "id": reservation_id,
                    "error": "RESERVATION_NOT_FOUND",
                    "message": f"予約 {reservation_id} が見つかりません",
                }
            )
        except InsufficientStockError as e:
            failed_items.append(
                {
                    "id": reservation_id,
                    "error": "INSUFFICIENT_STOCK",
                    "message": f"ロット {e.lot_number} の在庫が不足しています "
                    f"(必要: {e.required}, 利用可能: {e.available})",
                }
            )
        except AllocationCommitError as e:
            failed_items.append(
                {
                    "id": reservation_id,
                    "error": e.error_code if hasattr(e, "error_code") else "COMMIT_ERROR",
                    "message": str(e),
                }
            )

    if confirmed_ids:
        db.commit()

    return confirmed_ids, failed_items
