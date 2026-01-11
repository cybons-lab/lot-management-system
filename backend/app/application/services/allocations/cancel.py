"""Reservation cancellation operations.

Handles cancellation of reservations:
- Single reservation cancellation
- Bulk cancellation
- Order line-level cancellation

P3: Uses LotReservation exclusively.

【設計意図】引当キャンセルの設計判断:

1. なぜ idempotent（べき等）にするのか（L49-51）
   理由: 重複キャンセルを許容
   問題:
   - API再試行: キャンセル処理が2回実行される
   → 既にキャンセル済みなのに、エラーを返すべきか？
   解決:
   - status == RELEASED: 何もせずreturn（成功扱い）
   業務影響:
   - API再試行時にエラーにならない → UX向上

2. なぜ ReservationStateMachine で状態遷移を検証するのか（L54-58）
   理由: 不正なステータス遷移の防止
   業務ルール:
   - ACTIVE → RELEASED: OK
   - CONFIRMED → RELEASED: NG（SAP登録済み、キャンセル不可）
   実装:
   - can_release(reservation.status): 許可された遷移のみ実行
   メリット:
   - 状態遷移ルールが ReservationStateMachine に集約

3. なぜ CONFIRMED はキャンセル不可なのか（L61-65）
   理由: SAP登録済みの引当は解除できない
   業務的背景:
   - CONFIRMED: SAP ERP に登録済み（確定引当）
   → SAP側でキャンセル処理が必要（未実装）
   実装:
   - status == CONFIRMED: AllocationCommitError
   業務影響:
   - SAP連携の整合性を保つ

4. なぜ with_for_update でロックするのか（L71-72）
   理由: 並行処理での競合防止
   問題:
   - ユーザーA: 予約をキャンセル中
   - ユーザーB: 同じ予約を確定（CONFIRMED）に変更中
   → 競合して不整合
   解決:
   - with_for_update(): ロット行をロック
   → 片方が完了するまで、もう片方は待機
   メリット:
   - 予約の状態が不整合にならない

5. なぜ update_order_allocation_status を呼ぶのか（L83-87）
   理由: 受注ステータスの自動更新
   業務フロー:
   - 引当キャンセル → 受注明細の引当数量が減少
   → 受注ステータスを「一部引当」or「未引当」に更新
   実装:
   - update_order_allocation_status(): 引当数量を集計してステータス更新
   メリット:
   - 受注ステータスが自動的に最新状態に

6. なぜ bulk_release_reservations があるのか（L93-118）
   理由: 複数予約の一括キャンセル
   用途:
   - 管理者: 「この受注の全引当をキャンセル」
   - バッチ処理: 「期限切れ引当を一括キャンセル」
   実装:
   - 成功した ID と失敗した ID を分けて返す
   業務影響:
   - 一括操作の効率化

7. なぜ個別エラーをキャッチするのか（L109-113）
   理由: 一部失敗でも継続処理
   問題:
   - 10件のキャンセル中、5件目でエラー → 全件失敗？
   解決:
   - try-except で個別エラーをキャッチ
   → failed_ids に追加して、残り5件を処理継続
   業務影響:
   - 一部失敗しても、成功したキャンセルは有効化

8. なぜ release_reservations_for_order_line があるのか（L121-162）
   理由: 受注明細単位での一括キャンセル
   用途:
   - 「この受注明細の全引当をキャンセル」
   実装:
   - 受注明細に紐づく全予約を検索 → 一括キャンセル
   業務影響:
   - 明細単位での引当リセットが容易

9. なぜ H-03 Fix でダブルコミットを解消したのか（L132-160）
   理由: トランザクション最適化
   問題（H-03以前）:
   - release_reservation(): 1回目のコミット
   - update_order_line_status(): 2回目のコミット
   → 2回のコミットは無駄
   解決:
   - commit_db=False: 予約解放時はコミットしない
   - L160: 最後に1回だけコミット
   メリット:
   - パフォーマンス向上

10. なぜ commit_db パラメータがあるのか（L39, L46）
    理由: 一括処理でのトランザクション制御
    用途:
    - commit_db=True: 単体キャンセル（即コミット）
    - commit_db=False: バッチキャンセル（後でコミット）
    実装:
    - 呼び出し側がトランザクション境界を制御
    メリット:
    - 柔軟なトランザクション管理
"""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.application.services.allocations.schemas import (
    AllocationCommitError,
    AllocationNotFoundError,
)
from app.application.services.allocations.utils import (
    update_order_allocation_status,
    update_order_line_status,
)
from app.core.time_utils import utcnow
from app.infrastructure.persistence.models import (
    Lot,
    OrderLine,
    StockHistory,
    StockTransactionType,
)
from app.infrastructure.persistence.models.lot_reservations_model import (
    LotReservation,
    ReservationSourceType,
    ReservationStateMachine,
    ReservationStatus,
)


class ReservationCancelReason:
    """予約取消理由の定数."""

    INPUT_ERROR = "input_error"
    WRONG_QUANTITY = "wrong_quantity"
    WRONG_LOT = "wrong_lot"
    WRONG_PRODUCT = "wrong_product"
    CUSTOMER_REQUEST = "customer_request"
    DUPLICATE = "duplicate"
    OTHER = "other"

    LABELS = {
        "input_error": "入力ミス",
        "wrong_quantity": "数量誤り",
        "wrong_lot": "ロット選択誤り",
        "wrong_product": "品目誤り",
        "customer_request": "顧客都合",
        "duplicate": "重複登録",
        "other": "その他",
    }


def release_reservation(db: Session, reservation_id: int, *, commit_db: bool = True) -> None:
    """予約を解放（キャンセル）.

    Args:
        db: データベースセッション
        reservation_id: 予約ID
        commit_db: Trueの場合、処理完了後にcommitを実行

    Raises:
        AllocationNotFoundError: 予約が見つからない場合
    """
    reservation = db.get(LotReservation, reservation_id)
    if not reservation:
        raise AllocationNotFoundError(f"Reservation {reservation_id} not found")

    # Already released - idempotent
    if reservation.status == ReservationStatus.RELEASED:
        return

    # H-04/H-05 Fix: Use ReservationStateMachine for strict state transition validation
    if not ReservationStateMachine.can_release(reservation.status):
        raise AllocationCommitError(
            "INVALID_STATE_TRANSITION",
            f"Cannot release reservation {reservation_id} from status '{reservation.status}'",
        )

    # Additional guard: CONFIRMED reservations require SAP cancellation (not implemented)
    if reservation.status == ReservationStatus.CONFIRMED:
        raise AllocationCommitError(
            "CANNOT_CANCEL_CONFIRMED",
            f"Reservation {reservation_id} is confirmed. SAP cancellation required (not implemented)",
        )

    now = utcnow()

    lot = None
    if reservation.lot_id:
        lot_stmt = select(Lot).where(Lot.id == reservation.lot_id).with_for_update()
        lot = db.execute(lot_stmt).scalar_one_or_none()

    reservation.status = ReservationStatus.RELEASED
    reservation.released_at = now
    reservation.updated_at = now

    if lot:
        lot.updated_at = now

    db.flush()

    if reservation.source_type == ReservationSourceType.ORDER and reservation.source_id:
        line = db.get(OrderLine, reservation.source_id)
        if line:
            update_order_allocation_status(db, line.order_id)
            update_order_line_status(db, line.id)

    if commit_db:
        db.commit()


def bulk_release_reservations(
    db: Session, reservation_ids: list[int]
) -> tuple[list[int], list[int]]:
    """予約を一括解放.

    Args:
        db: データベースセッション
        reservation_ids: 解放対象の予約ID一覧

    Returns:
        tuple[list[int], list[int]]: (成功したID一覧, 失敗したID一覧)
    """
    released_ids: list[int] = []
    failed_ids: list[int] = []

    for reservation_id in reservation_ids:
        try:
            release_reservation(db, reservation_id, commit_db=False)
            released_ids.append(reservation_id)
        except (AllocationNotFoundError, AllocationCommitError):
            failed_ids.append(reservation_id)

    if released_ids:
        db.commit()

    return released_ids, failed_ids


def release_reservations_for_order_line(db: Session, order_line_id: int) -> list[int]:
    """受注明細に紐づく全ての予約を一括解放.

    Args:
        db: データベースセッション
        order_line_id: 受注明細ID

    Returns:
        list[int]: 解放された予約IDのリスト

    Note:
        H-03 Fix: ダブルコミットを解消。予約解放とOrderLineステータス更新を
        同一トランザクションで処理し、1回のコミットで完了する。
    """
    reservations = (
        db.query(LotReservation)
        .filter(
            LotReservation.source_type == ReservationSourceType.ORDER,
            LotReservation.source_id == order_line_id,
            LotReservation.status != ReservationStatus.RELEASED,
        )
        .all()
    )

    released_ids: list[int] = []
    for reservation in reservations:
        try:
            release_reservation(db, reservation.id, commit_db=False)
            released_ids.append(reservation.id)
        except (AllocationNotFoundError, AllocationCommitError):
            continue

    if released_ids:
        # H-03 Fix: OrderLineステータス更新を先に行い、1回だけコミット
        line = db.get(OrderLine, order_line_id)
        if line:
            update_order_allocation_status(db, line.order_id)
            update_order_line_status(db, line.id)

        db.commit()

    return released_ids


def cancel_confirmed_reservation(
    db: Session,
    reservation_id: int,
    *,
    cancel_reason: str,
    cancel_note: str | None = None,
    cancelled_by: str | None = None,
    commit_db: bool = True,
) -> LotReservation:
    """CONFIRMED予約を取消（反対仕訳方式）.

    SAP連携後のCONFIRMED予約を取消す。
    - stock_historyにALLOCATION_RELEASEトランザクションを記録
    - 予約ステータスをRELEASEDに変更
    - 取消理由を記録

    Args:
        db: データベースセッション
        reservation_id: 予約ID
        cancel_reason: 取消理由（ReservationCancelReasonの値）
        cancel_note: 取消メモ（任意）
        cancelled_by: 取消実行者（任意）
        commit_db: Trueの場合、処理完了後にcommitを実行

    Returns:
        取消後の予約レコード

    Raises:
        AllocationNotFoundError: 予約が見つからない場合
        AllocationCommitError: 不正な状態遷移の場合
    """
    reservation = db.get(LotReservation, reservation_id)
    if not reservation:
        raise AllocationNotFoundError(f"Reservation {reservation_id} not found")

    # Already released - idempotent
    if reservation.status == ReservationStatus.RELEASED:
        return reservation

    # 状態遷移の検証
    if not ReservationStateMachine.can_release(reservation.status):
        raise AllocationCommitError(
            "INVALID_STATE_TRANSITION",
            f"Cannot release reservation {reservation_id} from status '{reservation.status}'",
        )

    now = utcnow()

    # ロットをロック取得
    lot = None
    if reservation.lot_id:
        lot_stmt = select(Lot).where(Lot.id == reservation.lot_id).with_for_update()
        lot = db.execute(lot_stmt).scalar_one_or_none()

    # CONFIRMED予約の場合、stock_historyに反対仕訳を記録
    if reservation.status == ReservationStatus.CONFIRMED and lot:
        stock_history = StockHistory(
            lot_id=lot.id,
            transaction_type=StockTransactionType.ALLOCATION_RELEASE,
            quantity_change=+reservation.reserved_qty,  # 予約解放はプラス表記
            quantity_after=lot.current_quantity,  # current_quantityは変わらない
            reference_type="reservation_cancellation",
            reference_id=reservation.id,
            transaction_date=now,
        )
        db.add(stock_history)

    # 予約ステータスを更新
    reservation.status = ReservationStatus.RELEASED
    reservation.released_at = now
    reservation.updated_at = now
    reservation.cancel_reason = cancel_reason
    reservation.cancel_note = cancel_note
    reservation.cancelled_by = cancelled_by

    if lot:
        lot.updated_at = now

    db.flush()

    # 受注連動の場合、受注ステータスを更新
    if reservation.source_type == ReservationSourceType.ORDER and reservation.source_id:
        line = db.get(OrderLine, reservation.source_id)
        if line:
            update_order_allocation_status(db, line.order_id)
            update_order_line_status(db, line.id)

    if commit_db:
        db.commit()

    return reservation
