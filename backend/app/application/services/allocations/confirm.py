"""Hard allocation confirmation operations.

Handles reservation confirmation:
- Confirm reservation (single)
- Batch confirmation

P3: CONFIRMED status requires successful SAP registration via SapGateway.
All operations now use LotReservation exclusively.

【設計意図】引当確定（CONFIRMED）の設計判断:

1. なぜ SAP登録が必須なのか（L147-154）
   理由: CONFIRMED = SAP ERP への登録完了
   業務的背景:
   - ACTIVE: システム内の仮引当（キャンセル可能）
   - CONFIRMED: SAP登録済みの確定引当（出荷可能）
   → CONFIRMED に遷移するには、SAP登録が必須
   実装:
   - sap_gateway.register_allocation(): SAP API 呼び出し
   - success=False: AllocationCommitError（確定失敗）
   業務影響:
   - SAP とシステムの整合性を保証

2. なぜ部分確定（quantity指定）ができるのか（L86-101）
   理由: 柔軟な確定数量調整
   業務例:
   - 予約: 100個
   - 実際の確定: 80個（残り20個は別のロットから確定したい）
   実装:
   - quantity < reserved_qty: 残り数量を新しい予約として分割
   - 元の予約: 80個に減らして CONFIRMED
   - 新しい予約: 20個で ACTIVE のまま
   業務影響:
   - 柔軟な引当調整が可能

3. なぜ preempt_soft_reservations_for_hard を呼ぶのか（L136-142）
   理由: ハード引当の優先権確保
   問題:
   - ロットX（在庫100個）
   - ソフト引当A: 80個、ハード引当B: 50個
   → 合計130個引当（在庫不足）
   解決:
   - preempt: ハード引当Bのために、ソフト引当Aを解放
   → ハード引当が優先される
   業務ルール:
   - CONFIRMED（ハード）> ACTIVE（ソフト）

4. なぜ idempotent（べき等）にするのか（L69-71）
   理由: 重複確定を許容
   問題:
   - API再試行: 確定処理が2回実行される
   → 既に確定済みなのに、エラーを返すべきか？
   解決:
   - status == CONFIRMED: 何もせず return（成功扱い）
   業務影響:
   - API再試行時にエラーにならない

5. なぜ仮予約（provisional）は確定できないのか（L80-83）
   理由: 入庫予定ベースの引当は確定不可
   業務ルール:
   - 仮予約: lot_id = NULL（入庫予定）
   → 実際の在庫がないため、SAP登録できない
   実装:
   - lot_id がない: AllocationCommitError
   業務影響:
   - 入荷後に改めて引当・確定が必要

6. なぜ有効期限をチェックするのか（L119-123）
   理由: 期限切れロットの出荷防止
   業務ルール:
   - expiry_date < 今日: 期限切れ
   → 確定不可（出荷してはいけない）
   実装:
   - expiry_date < utcnow().date(): AllocationCommitError
   業務影響:
   - 品質トラブルの防止

7. なぜ C-02 Fix で事前ロックを取得するのか（L218-223）
   理由: バッチ確定時の競合防止
   問題（C-02以前）:
   - バッチ確定中に、他プロセスが同じロットの在庫を使い切る
   → 途中で在庫不足エラー
   解決:
   - 処理開始前に、全予約の行ロックを一括取得
   → 他プロセスは待機
   業務影響:
   - バッチ確定の成功率向上

8. なぜ AllocationConfirmedEvent を発行するのか（L178-185）
   理由: 確定後の副作用処理
   用途:
   - イベント: 引当確定完了
   → 通知送信、外部システム連携、監査ログ記録
   実装:
   - EventDispatcher.queue(event): イベントをキューに追加
   → リクエスト完了後に一括処理
   メリット:
   - 確定処理と通知処理を疎結合に実装

9. なぜ confirm_reservations_batch があるのか（L190-263）
   理由: 複数予約の一括確定
   用途:
   - 管理者: 「この受注の全引当を確定」
   - バッチ処理: 「夜間に全引当を確定」
   実装:
   - 成功した ID と失敗した情報を分けて返す
   → フロントエンドで結果を表示
   業務影響:
   - 一括操作の効率化

10. なぜ ReservationStateMachine で状態遷移を検証するのか（L73-78）
    理由: 不正なステータス遷移の防止
    業務ルール:
    - ACTIVE → CONFIRMED: OK
    - RELEASED → CONFIRMED: NG（解放済み、確定不可）
    実装:
    - can_confirm(reservation.status): 許可された遷移のみ実行
    メリット:
    - 状態遷移ルールが ReservationStateMachine に集約
"""

from __future__ import annotations

import logging
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.application.services.allocations.mapping_validator import validate_lot_mapping
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
from app.domain.errors import UnmappedItemError
from app.infrastructure.external.sap_gateway import SapGateway, get_sap_gateway
from app.infrastructure.persistence.models import OrderLine
from app.infrastructure.persistence.models.lot_receipt_models import LotReceipt
from app.infrastructure.persistence.models.lot_reservations_model import (
    LotReservation,
    ReservationSourceType,
    ReservationStateMachine,
    ReservationStatus,
)


logger = logging.getLogger(__name__)


def confirm_reservation(
    db: Session,
    reservation_id: int,
    *,
    confirmed_by: str | None = None,
    quantity: Decimal | None = None,
    commit_db: bool = True,
    sap_gateway: SapGateway | None = None,
) -> LotReservation:
    """予約をCONFIRMED状態に確定（SAP登録必須）.

    Args:
        db: データベースセッション
        reservation_id: 予約ID
        confirmed_by: 確定操作を行ったユーザーID（オプション）
        quantity: 確定数量（指定時は部分確定、残りはACTIVEのまま分割）
        commit_db: Trueの場合、処理完了後にcommitを実行
        sap_gateway: SAP Gateway実装（未指定時はデフォルトのMockSapGatewayを使用）

    Returns:
        確定された予約
    """
    logger.info(
        "Starting reservation confirmation",
        extra={"reservation_id": reservation_id, "confirmed_by": confirmed_by},
    )

    # Use select with_for_update to lock the reservation row
    stmt = select(LotReservation).where(LotReservation.id == reservation_id).with_for_update()
    reservation = db.execute(stmt).scalar_one_or_none()

    if not reservation:
        logger.warning("Reservation not found", extra={"reservation_id": reservation_id})
        raise AllocationNotFoundError(f"Reservation {reservation_id} not found")

    # Idempotent: return success if already confirmed
    if str(reservation.status) == ReservationStatus.CONFIRMED.value:
        logger.debug(
            "Reservation already confirmed (idempotent)",
            extra={"reservation_id": reservation_id},
        )
        return reservation

    # H-04/H-05 Fix: Use ReservationStateMachine for strict state transition validation
    if not ReservationStateMachine.can_confirm(reservation.status):
        raise AllocationCommitError(
            "INVALID_STATE_TRANSITION",
            f"Cannot confirm reservation {reservation_id} from status '{reservation.status}'",
        )

    if not reservation.lot_id:
        raise AllocationCommitError(
            "PROVISIONAL_RESERVATION", "入荷予定ベースの仮予約は確定できません"
        )

    # Handle partial confirmation (splitting)
    if quantity is not None and quantity < reservation.reserved_qty:
        remainder_qty = reservation.reserved_qty - quantity
        if remainder_qty > 0:
            # Create new reservation for remainder
            remainder = LotReservation(
                lot_id=reservation.lot_id,
                source_type=reservation.source_type,
                source_id=reservation.source_id,
                reserved_qty=remainder_qty,
                status=reservation.status,  # Keep original status (e.g. ACTIVE)
                created_at=utcnow(),
                # Copy other relevant fields if necessary
            )
            db.add(remainder)
            reservation.reserved_qty = quantity
            db.flush()

    lot_stmt = select(LotReceipt).where(LotReceipt.id == reservation.lot_id).with_for_update()
    lot = db.execute(lot_stmt).scalar_one_or_none()
    if not lot:
        raise AllocationCommitError("LOT_NOT_FOUND", f"Lot ID {reservation.lot_id} not found")

    if lot.status not in ("active",):
        raise AllocationCommitError(
            "LOT_NOT_ACTIVE",
            f"ロット {lot.lot_number} は {lot.status} 状態のため確定できません",
        )

    # Phase 2-1: 未マッピングブロック
    try:
        validate_lot_mapping(db, lot, raise_on_unmapped=True)
    except UnmappedItemError as e:
        raise AllocationCommitError("UNMAPPED_ITEM", str(e)) from e

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
    # Note: received_quantity is used as base. Deduct withdrawals if implemented.
    current_quantity = lot.received_quantity
    if current_quantity < reserved_qty:
        available = current_quantity - (reserved_qty - reservation.reserved_qty)
        raise InsufficientStockError(
            required=float(confirm_qty),
            available=float(max(available, Decimal(0))),
            lot_id=lot.id,
            lot_number=lot.lot_number,
        )

    # Preempt other soft reservations if needed
    if reservation.source_id is not None:
        preempt_soft_reservations_for_hard(
            db,
            lot_id=lot.id,
            required_qty=confirm_qty,
            hard_demand_id=reservation.source_id,
        )

    now = utcnow()

    # Call SAP Gateway for CONFIRMED transition
    gateway = sap_gateway or get_sap_gateway()
    logger.info(
        "Calling SAP Gateway for allocation registration",
        extra={
            "reservation_id": reservation_id,
            "lot_id": lot.id,
            "lot_number": lot.lot_number,
            "quantity": float(confirm_qty),
            "source_type": reservation.source_type,
            "source_id": reservation.source_id,
        },
    )
    sap_result = gateway.register_allocation(reservation)

    if not sap_result.success:
        logger.error(
            "SAP registration failed",
            extra={
                "reservation_id": reservation_id,
                "lot_id": lot.id,
                "lot_number": lot.lot_number,
                "quantity": float(confirm_qty),
                "error_message": sap_result.error_message,
                "error_code": sap_result.error_code if hasattr(sap_result, "error_code") else None,
            },
        )
        raise AllocationCommitError(
            "SAP_REGISTRATION_FAILED",
            f"SAP登録に失敗しました: {sap_result.error_message}",
        )

    logger.info(
        "SAP registration succeeded",
        extra={
            "reservation_id": reservation_id,
            "lot_id": lot.id,
            "lot_number": lot.lot_number,
            "quantity": float(confirm_qty),
            "sap_document_no": sap_result.document_no,
            "registered_at": sap_result.registered_at.isoformat()
            if sap_result.registered_at
            else None,
        },
    )

    # SAP registration succeeded - update reservation with SAP info
    reservation.status = ReservationStatus.CONFIRMED
    reservation.confirmed_at = now
    reservation.confirmed_by = confirmed_by
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

    logger.info(
        "Reservation confirmed",
        extra={
            "reservation_id": reservation_id,
            "lot_id": lot.id,
            "lot_number": lot.lot_number,
            "quantity": float(confirm_qty),
            "sap_document_no": sap_result.document_no,
        },
    )

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

    Note:
        C-02 Fix: 処理開始前に全予約の行ロックを事前取得することで、
        途中で他プロセスが同じロットの在庫を使い切る問題を防止。
    """
    logger.info(
        "Starting batch reservation confirmation",
        extra={"reservation_count": len(reservation_ids), "confirmed_by": confirmed_by},
    )

    confirmed_ids: list[int] = []
    failed_items: list[dict] = []

    if not reservation_ids:
        logger.debug("No reservations to confirm")
        return confirmed_ids, failed_items

    # C-02 Fix: 全予約の行ロックを事前取得してレースコンディションを防止
    # これにより、batch処理中に他プロセスが同じロットの在庫を操作できなくなる
    lock_stmt = (
        select(LotReservation).where(LotReservation.id.in_(reservation_ids)).with_for_update()
    )
    db.execute(lock_stmt).scalars().all()

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

    logger.info(
        "Batch reservation confirmation completed",
        extra={
            "confirmed_count": len(confirmed_ids),
            "failed_count": len(failed_items),
        },
    )

    return confirmed_ids, failed_items
