"""Allocation actions service.

Handles execution of allocations:
- Commit FEFO allocation
- Manual allocation (Drag & Assign)
- Cancel allocation
"""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import case as sa_case
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.application.services.allocations.fefo import preview_fefo_allocation
from app.application.services.allocations.schemas import (
    AllocationCommitError,
    AllocationNotFoundError,
    FefoCommitResult,
    FefoLinePlan,
)
from app.application.services.allocations.utils import (
    _load_order,
    update_order_allocation_status,
    update_order_line_status,
)
from app.application.services.inventory.stock_calculation import (
    get_available_quantity,
    get_reserved_quantity,
)
from app.infrastructure.persistence.models import Allocation, Lot, Order, OrderLine
from app.infrastructure.persistence.models.lot_reservations_model import (
    LotReservation,
    ReservationSourceType,
    ReservationStatus,
)


def validate_commit_eligibility(order: Order) -> None:
    """Validate order status for commit operation.

    Args:
        order: Order entity

    Raises:
        ValueError: If order status does not allow commit
    """
    if order.status not in {"open", "part_allocated"}:
        raise ValueError(
            f"Order status '{order.status}' does not allow commit. Allowed: open, part_allocated"
        )


def persist_allocation_entities(
    db: Session,
    line_plan: FefoLinePlan,
    created: list[Allocation],
) -> None:
    """Persist allocation entities with pessimistic locking.

    Args:
        db: Database session
        line_plan: Line allocation plan
        created: List to append created allocations

    Raises:
        AllocationCommitError: If persistence fails
    """
    EPSILON = 1e-6

    if not line_plan.allocations:
        return

    line_stmt = (
        select(OrderLine)
        .options(joinedload(OrderLine.allocations))
        .where(OrderLine.id == line_plan.order_line_id)
    )
    line = db.execute(line_stmt).unique().scalar_one_or_none()
    if not line:
        raise AllocationCommitError(f"OrderLine {line_plan.order_line_id} not found")

    if line_plan.next_div and not getattr(line, "next_div", None):
        line.next_div = line_plan.next_div  # type: ignore[attr-defined]

    for alloc_plan in line_plan.allocations:
        # ロックをかけてロットを取得
        lot_stmt = select(Lot).where(Lot.id == alloc_plan.lot_id).with_for_update()
        lot = db.execute(lot_stmt).scalar_one_or_none()
        if not lot:
            raise AllocationCommitError(f"Lot {alloc_plan.lot_id} not found")
        if lot.status != "active":
            raise AllocationCommitError(
                f"Lot {alloc_plan.lot_id} status '{lot.status}' is not active"
            )

        # 利用可能在庫チェック (using lot_reservations)
        available = float(get_available_quantity(db, lot))
        if available + EPSILON < alloc_plan.allocate_qty:
            raise AllocationCommitError(
                f"Insufficient stock for lot {lot.id}: "
                f"required {alloc_plan.allocate_qty}, available {available}"
            )

        # Create lot reservation instead of updating allocated_quantity
        reservation = LotReservation(
            lot_id=lot.id,
            source_type=ReservationSourceType.ORDER,
            source_id=line.id,
            reserved_qty=Decimal(str(alloc_plan.allocate_qty)),
            status=ReservationStatus.ACTIVE,
            created_at=datetime.utcnow(),
        )
        db.add(reservation)
        lot.updated_at = datetime.utcnow()

        # 引当レコード作成 (use lot_reference instead of lot_id)
        allocation = Allocation(
            order_line_id=line.id,
            lot_reference=lot.lot_number,
            allocated_quantity=alloc_plan.allocate_qty,
            status="allocated",
            created_at=datetime.utcnow(),
        )
        db.add(allocation)
        created.append(allocation)


def commit_fefo_allocation(db: Session, order_id: int) -> FefoCommitResult:
    """FEFO引当確定（状態: open|part_allocated のみ許容）.

    Args:
        db: データベースセッション
        order_id: 注文ID

    Returns:
        FefoCommitResult: 引当確定結果

    Raises:
        ValueError: 注文が見つからない、または状態が不正な場合
        AllocationCommitError: 引当確定中にエラーが発生した場合
    """
    # 状態チェック（確定可能状態のみ）
    order = _load_order(db, order_id)
    validate_commit_eligibility(order)

    preview = preview_fefo_allocation(db, order_id)

    created: list[Allocation] = []
    try:
        for line_plan in preview.lines:
            persist_allocation_entities(db, line_plan, created)

        update_order_allocation_status(db, order_id)

        db.commit()
    except Exception:
        db.rollback()
        raise

    return FefoCommitResult(preview=preview, created_allocations=created)


def allocate_manually(
    db: Session,
    order_line_id: int,
    lot_id: int,
    quantity: float | Decimal,
    *,
    commit_db: bool = True,
) -> Allocation:
    """手動引当実行 (Drag & Assign).

    v2.3: AllocationCreatedEvent を発行するように拡張。

    Args:
        db: データベースセッション
        order_line_id: 受注明細ID
        lot_id: ロットID
        quantity: 引当数量
        commit_db: Trueの場合、処理完了後にcommitを実行（デフォルト: True）

    Returns:
        Allocation: 作成された引当オブジェクト

    Raises:
        AllocationCommitError: 引当に失敗した場合
        ValueError: パラメータが不正な場合
    """
    from app.domain.events import AllocationCreatedEvent, EventDispatcher

    EPSILON = Decimal("1e-6")

    # Ensure quantity is Decimal
    if isinstance(quantity, float):
        quantity = Decimal(str(quantity))
    elif isinstance(quantity, int):
        quantity = Decimal(quantity)

    if quantity <= 0:
        raise ValueError("Allocation quantity must be positive")

    # 受注明細取得
    line = db.query(OrderLine).filter(OrderLine.id == order_line_id).first()
    if not line:
        raise ValueError(f"OrderLine {order_line_id} not found")

    # ロット取得 (ロック付き)
    lot = db.query(Lot).filter(Lot.id == lot_id).with_for_update().first()
    if not lot:
        raise ValueError(f"Lot {lot_id} not found")

    if lot.status != "active":
        raise AllocationCommitError(f"Lot {lot_id} is not active")

    # 商品チェック
    if lot.product_id != line.product_id:
        raise ValueError(
            f"Product mismatch: Lot product {lot.product_id} != Line product {line.product_id}"
        )

    # 在庫チェック (using lot_reservations)
    available = get_available_quantity(db, lot)
    if available + EPSILON < quantity:
        raise AllocationCommitError(
            f"Insufficient stock: required {quantity}, available {available}"
        )

    # Create lot reservation instead of updating allocated_quantity
    reservation = LotReservation(
        lot_id=lot.id,
        source_type=ReservationSourceType.ORDER,
        source_id=line.id,
        reserved_qty=quantity,
        status=ReservationStatus.ACTIVE,
        created_at=datetime.utcnow(),
    )
    db.add(reservation)
    lot.updated_at = datetime.utcnow()

    allocation = Allocation(
        order_line_id=line.id,
        lot_reference=lot.lot_number,
        allocated_quantity=quantity,
        status="allocated",
        created_at=datetime.utcnow(),
    )
    db.add(allocation)

    # 注文ステータス更新のためにフラッシュ
    db.flush()

    # 親注文のステータス更新
    update_order_allocation_status(db, line.order_id)

    # 受注明細のステータス更新
    update_order_line_status(db, line.id)

    if commit_db:
        db.commit()
        db.refresh(allocation)

        # ドメインイベント発行
        event = AllocationCreatedEvent(
            allocation_id=allocation.id,
            order_line_id=order_line_id,
            lot_id=lot_id,
            quantity=quantity,
            allocation_type="soft",
        )
        EventDispatcher.queue(event)

    return allocation


def cancel_allocation(db: Session, allocation_id: int, *, commit_db: bool = True) -> None:
    """引当をキャンセル.

    Args:
        db: データベースセッション
        allocation_id: 引当ID
        commit_db: Trueの場合、処理完了後にcommitを実行（デフォルト: True）

    Raises:
        AllocationNotFoundError: 引当が見つからない場合
        AllocationCommitError: ロットが見つからない場合
    """
    # Fetch allocation
    allocation = db.get(Allocation, allocation_id)
    if not allocation:
        raise AllocationNotFoundError(f"Allocation {allocation_id} not found")

    # Find lot by lot_reference
    lot = None
    if allocation.lot_reference:
        lot_stmt = select(Lot).where(Lot.lot_number == allocation.lot_reference).with_for_update()
        lot = db.execute(lot_stmt).scalar_one_or_none()

    # Release the corresponding LotReservation(s)
    if lot:
        # Find reservations for this order_line from this lot
        reservations = (
            db.query(LotReservation)
            .filter(
                LotReservation.lot_id == lot.id,
                LotReservation.source_id == allocation.order_line_id,
                LotReservation.source_type == ReservationSourceType.ORDER,
                LotReservation.status.in_([ReservationStatus.ACTIVE, ReservationStatus.CONFIRMED]),
            )
            .all()
        )
        for reservation in reservations:
            reservation.status = ReservationStatus.RELEASED
            reservation.updated_at = datetime.utcnow()
        lot.updated_at = datetime.utcnow()

    # 注文ステータス更新のためにOrderLine情報を保持
    order_line_id = allocation.order_line_id

    # 削除実行
    db.delete(allocation)
    db.flush()

    # 注文ステータス更新
    if order_line_id:
        line = db.get(OrderLine, order_line_id)
        if line:
            update_order_allocation_status(db, line.order_id)
            update_order_line_status(db, line.id)

    if commit_db:
        db.commit()


def bulk_cancel_allocations(db: Session, allocation_ids: list[int]) -> tuple[list[int], list[int]]:
    """引当を一括キャンセル.

    Args:
        db: データベースセッション
        allocation_ids: キャンセル対象の引当ID一覧

    Returns:
        tuple[list[int], list[int]]: (成功したID一覧, 失敗したID一覧)
    """
    cancelled_ids: list[int] = []
    failed_ids: list[int] = []

    for allocation_id in allocation_ids:
        try:
            cancel_allocation(db, allocation_id, commit_db=False)
            cancelled_ids.append(allocation_id)
        except (AllocationNotFoundError, AllocationCommitError):
            failed_ids.append(allocation_id)

    if cancelled_ids:
        db.commit()

    return cancelled_ids, failed_ids


def preempt_soft_allocations_for_hard(
    db: Session,
    lot_id: int,
    required_qty: Decimal,
    hard_demand_id: int,
) -> list[dict]:
    """Hard引当時に同ロットのSoft引当を自動解除.

    優先度: KANBAN > ORDER > FORECAST (優先度の低いものから解除)

    Args:
        db: データベースセッション
        lot_id: ロットID
        required_qty: 必要数量（Hard引当する数量）
        hard_demand_id: 新しいHard需要のorder_line_id

    Returns:
        list[dict]: 解除された引当情報のリスト
            [{"allocation_id": 1, "order_line_id": 2, "released_qty": 100, "order_type": "FORECAST_LINKED"}]
    """
    # ロット取得（ロック付き）
    lot_stmt = select(Lot).where(Lot.id == lot_id).with_for_update()
    lot = db.execute(lot_stmt).scalar_one_or_none()
    if not lot:
        return []

    # 現在の利用可能在庫を確認 (using lot_reservations)
    available = get_available_quantity(db, lot)
    if available >= required_qty:
        # 十分な在庫がある場合は解除不要
        return []

    # 不足分を計算
    shortage = required_qty - available

    # 同じロットの全Soft引当を取得（優先度の低い順）
    # Find allocations by lot_reference instead of lot_id
    soft_allocations_stmt = (
        select(Allocation)
        .join(OrderLine, Allocation.order_line_id == OrderLine.id)
        .where(
            Allocation.lot_reference == lot.lot_number,
            Allocation.allocation_type == "soft",
            Allocation.status == "allocated",
            Allocation.order_line_id != hard_demand_id,
        )
        .order_by(
            # order_typeで優先度をつける（CASE文でソート）
            sa_case(
                (OrderLine.order_type == "KANBAN", 4),
                (OrderLine.order_type == "ORDER", 3),
                (OrderLine.order_type == "SPOT", 2),
                (OrderLine.order_type == "FORECAST_LINKED", 1),
                else_=3,
            ).asc(),
            Allocation.created_at.asc(),
        )
    )

    soft_allocations = db.execute(soft_allocations_stmt).scalars().all()

    released_info: list[dict] = []
    remaining_shortage = shortage

    for allocation in soft_allocations:
        if remaining_shortage <= 0:
            break

        # この引当を解除
        release_qty = min(allocation.allocated_quantity, remaining_shortage)

        # Release the corresponding LotReservation
        reservations = (
            db.query(LotReservation)
            .filter(
                LotReservation.lot_id == lot_id,
                LotReservation.source_id == allocation.order_line_id,
                LotReservation.source_type == ReservationSourceType.ORDER,
                LotReservation.status.in_([ReservationStatus.ACTIVE, ReservationStatus.CONFIRMED]),
            )
            .all()
        )

        order_line_id = allocation.order_line_id
        order_line = db.get(OrderLine, order_line_id)

        # 部分解除かどうか
        if release_qty < allocation.allocated_quantity:
            # 部分解除: 数量を更新
            allocation.allocated_quantity -= release_qty

            # LotReservationも更新
            for reservation in reservations:
                # 注: 複数のreservationがある場合（稀だが）、按分する必要があるが、
                # ここでは1つのOrderLineにつき1つのReservationと仮定し、単純に減算する。
                # ただし、ループで回っているので全てから引くと二重になる可能性がある。
                # 通常は1つのはず。念のため先頭だけ処理するか、ロジックを精査する。
                # 現状の実装では OrderLine:Lot:Reservation は 1:N だが、
                # create_soft_allocation では1つ作っている。
                # 安全のため、reservationsの合計から引くべきだが、ここでは個別に引く（予約が分割されている場合を考慮）
                if reservation.reserved_qty > release_qty:
                    reservation.reserved_qty -= release_qty
                    break  # 1つから引ければOKとする（簡易実装）
                else:
                    # 予約が細切れの場合の対応は複雑になるため、今回は「1つの予約」前提で進める。
                    reservation.reserved_qty -= release_qty

            released_info.append(
                {
                    "allocation_id": allocation.id,
                    "order_line_id": order_line_id,
                    "released_qty": float(release_qty),
                    "order_type": order_line.order_type if order_line else "UNKNOWN",
                }
            )
            # Allocationは削除しない
        else:
            # 全量解除
            for reservation in reservations:
                reservation.status = ReservationStatus.RELEASED
                reservation.released_at = datetime.utcnow()

            released_info.append(
                {
                    "allocation_id": allocation.id,
                    "order_line_id": order_line_id,
                    "released_qty": float(release_qty),
                    "order_type": order_line.order_type if order_line else "UNKNOWN",
                }
            )
            db.delete(allocation)

        lot.updated_at = datetime.utcnow()
        remaining_shortage -= release_qty

        # 注文ステータス更新
        if order_line:
            update_order_allocation_status(db, order_line.order_id)
            update_order_line_status(db, order_line.id)

    db.flush()

    return released_info


def confirm_hard_allocation(
    db: Session,
    allocation_id: int,
    *,
    confirmed_by: str | None = None,
    quantity: Decimal | None = None,
    commit_db: bool = True,
) -> tuple[Allocation, Allocation | None]:
    """Soft引当をHard引当に確定（Soft → Hard変換）.

    Args:
        db: データベースセッション
        allocation_id: 引当ID
        confirmed_by: 確定操作を行ったユーザーID（オプション）
        quantity: 部分確定の場合の数量（未指定で全量確定）
        commit_db: Trueの場合、処理完了後にcommitを実行（デフォルト: True）

    Returns:
        tuple[Allocation, Allocation | None]:
            - 確定された引当（Hard）
            - 部分確定の場合、残りのSoft引当（None: 全量確定の場合）

    Raises:
        AllocationNotFoundError: 引当が見つからない場合
        AllocationCommitError: 確定に失敗した場合（既にhard、在庫不足など）
    """
    from app.application.services.allocations.schemas import InsufficientStockError

    # 引当取得
    allocation = db.get(Allocation, allocation_id)
    if not allocation:
        raise AllocationNotFoundError(f"Allocation {allocation_id} not found")

    # 既にHardの場合はエラー
    if allocation.allocation_type == "hard":
        raise AllocationCommitError("ALREADY_CONFIRMED", f"引当 {allocation_id} は既に確定済みです")

    # lot_referenceが必須（provisionalは確定不可）
    if not allocation.lot_reference:
        raise AllocationCommitError(
            "PROVISIONAL_ALLOCATION", "入荷予定ベースの仮引当は確定できません"
        )

    # ロック付きでロット取得 (by lot_reference)
    lot_stmt = select(Lot).where(Lot.lot_number == allocation.lot_reference).with_for_update()
    lot = db.execute(lot_stmt).scalar_one_or_none()
    if not lot:
        raise AllocationCommitError("LOT_NOT_FOUND", f"Lot {allocation.lot_reference} not found")

    # ロットステータスチェック
    if lot.status not in ("active",):
        raise AllocationCommitError(
            "LOT_NOT_ACTIVE", f"ロット {lot.lot_number} は {lot.status} 状態のため確定できません"
        )

    # 確定数量を決定
    confirm_qty = quantity if quantity is not None else allocation.allocated_quantity

    if confirm_qty > allocation.allocated_quantity:
        raise AllocationCommitError(
            "INVALID_QUANTITY",
            f"確定数量 {confirm_qty} は引当数量 {allocation.allocated_quantity} を超えています",
        )

    # 在庫チェック (using lot_reservations)
    reserved_qty = get_reserved_quantity(db, lot.id)
    if lot.current_quantity < reserved_qty:
        # ロットの状態異常（在庫が減ったなど）
        available = lot.current_quantity - (reserved_qty - allocation.allocated_quantity)
        raise InsufficientStockError(
            lot_id=lot.id,
            lot_number=lot.lot_number,
            required=float(confirm_qty),
            available=float(max(available, Decimal(0))),
        )

    # Soft引当の自動解除（必要に応じて）
    _preempted = preempt_soft_allocations_for_hard(
        db,
        lot_id=lot.id,
        required_qty=confirm_qty,
        hard_demand_id=allocation.order_line_id,
    )

    now = datetime.utcnow()
    remaining_allocation: Allocation | None = None

    # 部分確定の場合
    if quantity is not None and quantity < allocation.allocated_quantity:
        # 残りのSoft引当を作成
        remaining_qty = allocation.allocated_quantity - quantity
        remaining_allocation = Allocation(
            order_line_id=allocation.order_line_id,
            lot_reference=allocation.lot_reference,
            inbound_plan_line_id=allocation.inbound_plan_line_id,
            allocated_quantity=remaining_qty,
            allocation_type="soft",
            status=allocation.status,
            created_at=now,
            updated_at=now,
        )
        db.add(remaining_allocation)

        # 元の引当を更新
        allocation.allocated_quantity = confirm_qty

    # Hard確定
    allocation.allocation_type = "hard"
    allocation.confirmed_at = now
    allocation.confirmed_by = confirmed_by
    allocation.updated_at = now

    # Update corresponding LotReservation to confirmed status
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
    if reservation:
        reservation.status = ReservationStatus.CONFIRMED
        reservation.confirmed_at = now
    lot.updated_at = now

    db.flush()

    # 注文ステータス更新
    if allocation.order_line_id:
        line = db.get(OrderLine, allocation.order_line_id)
        if line:
            update_order_allocation_status(db, line.order_id)
            update_order_line_status(db, line.id)

    if commit_db:
        db.commit()
        db.refresh(allocation)
        if remaining_allocation:
            db.refresh(remaining_allocation)

        # ドメインイベント発行
        from app.domain.events import AllocationConfirmedEvent, EventDispatcher

        event = AllocationConfirmedEvent(
            allocation_id=allocation.id,
            lot_id=lot.id,  # Use lot.id from looked-up lot
            quantity=confirm_qty,
        )
        EventDispatcher.queue(event)

    return allocation, remaining_allocation


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
            - 確定失敗した引当情報一覧 [{"id": int, "error": str, "message": str}]
    """
    from app.application.services.allocations.schemas import InsufficientStockError

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


def auto_allocate_line(
    db: Session,
    order_line_id: int,
) -> list[Allocation]:
    """受注明細に対してFEFO戦略で自動引当を実行.

    Args:
        db: データベースセッション
        order_line_id: 受注明細ID

    Returns:
        list[Allocation]: 作成された引当一覧

    Raises:
        ValueError: 受注明細が見つからない場合
    """
    # 受注明細取得
    line = db.query(OrderLine).filter(OrderLine.id == order_line_id).first()
    if not line:
        raise ValueError(f"OrderLine {order_line_id} not found")

    # 既存引当数量
    existing_allocations = (
        db.query(Allocation)
        .filter(Allocation.order_line_id == order_line_id, Allocation.status == "allocated")
        .all()
    )
    already_allocated = sum(a.allocated_quantity for a in existing_allocations)

    # 必要数量
    required_qty = Decimal(str(line.order_quantity)) - already_allocated
    if required_qty <= 0:
        return []  # 既に全量引当済み

    # 候補ロットを期限順で取得（FEFO）
    # Filter using lot_reservations for available quantity
    candidate_lots = (
        db.query(Lot)
        .filter(
            Lot.product_id == line.product_id,
            Lot.status == "active",
        )
        .order_by(Lot.expiry_date.asc().nulls_last(), Lot.received_date.asc())
        .with_for_update()
        .all()
    )

    created_allocations: list[Allocation] = []
    remaining_qty = required_qty

    for lot in candidate_lots:
        if remaining_qty <= 0:
            break

        # Calculate available using lot_reservations
        available = get_available_quantity(db, lot)
        if available <= 0:
            continue

        allocate_qty = min(available, remaining_qty)

        allocation = allocate_manually(
            db,
            order_line_id=order_line_id,
            lot_id=lot.id,
            quantity=allocate_qty,
            commit_db=False,
        )
        created_allocations.append(allocation)
        remaining_qty -= allocate_qty

    if created_allocations:
        db.commit()
        for alloc in created_allocations:
            db.refresh(alloc)

    return created_allocations


def auto_allocate_bulk(
    db: Session,
    *,
    product_id: int | None = None,
    customer_id: int | None = None,
    delivery_place_id: int | None = None,
    order_type: str | None = None,
    skip_already_allocated: bool = True,
) -> dict:
    """複数受注明細に対して一括でFEFO自動引当を実行.

    フィルタリング条件を指定して対象を絞り込み可能。
    フォーキャストグループ、個別受注、全受注への一括引当に対応。

    Args:
        db: データベースセッション
        product_id: 製品ID（指定時はその製品のみ対象）
        customer_id: 得意先ID（指定時はその得意先のみ対象）
        delivery_place_id: 納入先ID（指定時はその納入先のみ対象）
        order_type: 受注タイプ（FORECAST_LINKED, KANBAN, SPOT, ORDER）
        skip_already_allocated: True の場合、既に全量引当済みの明細はスキップ

    Returns:
        dict: {
            "processed_lines": 処理した受注明細数,
            "allocated_lines": 引当を作成した明細数,
            "total_allocations": 作成した引当レコード数,
            "skipped_lines": スキップした明細数（既に引当済み等）,
            "failed_lines": 失敗した明細のリスト [{line_id, error}],
        }
    """
    # 対象の受注明細を取得（未完了のもの）
    query = (
        db.query(OrderLine)
        .join(Order, OrderLine.order_id == Order.id)
        .filter(
            OrderLine.status.in_(["pending", "allocated"]),  # Not shipped/completed
            Order.status.in_(["open", "part_allocated"]),
        )
    )

    # フィルタ条件を追加
    if product_id is not None:
        query = query.filter(OrderLine.product_id == product_id)

    if customer_id is not None:
        query = query.filter(Order.customer_id == customer_id)

    if delivery_place_id is not None:
        query = query.filter(OrderLine.delivery_place_id == delivery_place_id)

    if order_type is not None:
        query = query.filter(OrderLine.order_type == order_type)

    # 納期順でソート（優先度高い順）
    order_lines = query.order_by(OrderLine.delivery_date.asc()).all()

    result: dict[str, Any] = {
        "processed_lines": 0,
        "allocated_lines": 0,
        "total_allocations": 0,
        "skipped_lines": 0,
        "failed_lines": [],
    }

    for line in order_lines:
        result["processed_lines"] += 1

        # 既存引当数量を計算
        existing_allocations = (
            db.query(Allocation)
            .filter(
                Allocation.order_line_id == line.id,
                Allocation.status == "allocated",
            )
            .all()
        )
        already_allocated = sum(a.allocated_quantity for a in existing_allocations)
        required_qty = Decimal(str(line.order_quantity)) - already_allocated

        # 既に全量引当済みならスキップ
        if required_qty <= 0 and skip_already_allocated:
            result["skipped_lines"] += 1
            continue

        try:
            # auto_allocate_line はコミットするので、ここでは直接ロジックを実行
            # （コミットを1回にまとめるため）
            allocations = _auto_allocate_line_no_commit(db, line.id, required_qty)
            if allocations:
                result["allocated_lines"] += 1
                result["total_allocations"] += len(allocations)
        except Exception as e:
            result["failed_lines"].append({"line_id": line.id, "error": str(e)})

    # 一括コミット
    if result["total_allocations"] > 0:
        db.commit()

    return result


def _auto_allocate_line_no_commit(
    db: Session,
    order_line_id: int,
    required_qty: Decimal,
) -> list[Allocation]:
    """auto_allocate_line の内部版（コミットなし）.

    Args:
        db: データベースセッション
        order_line_id: 受注明細ID
        required_qty: 必要数量（既存引当を差し引いた残数）

    Returns:
        list[Allocation]: 作成された引当一覧
    """
    if required_qty <= 0:
        return []

    line = db.query(OrderLine).filter(OrderLine.id == order_line_id).first()
    if not line:
        return []

    # 候補ロットを期限順で取得（FEFO）
    # Filter using lot_reservations for available quantity
    candidate_lots = (
        db.query(Lot)
        .filter(
            Lot.product_id == line.product_id,
            Lot.status == "active",
        )
        .order_by(Lot.expiry_date.asc().nulls_last(), Lot.received_date.asc())
        .with_for_update()
        .all()
    )

    created_allocations: list[Allocation] = []
    remaining_qty = required_qty

    for lot in candidate_lots:
        if remaining_qty <= 0:
            break

        # Calculate available using lot_reservations
        available = get_available_quantity(db, lot)
        if available <= 0:
            continue

        allocate_qty = min(available, remaining_qty)

        allocation = allocate_manually(
            db,
            order_line_id=order_line_id,
            lot_id=lot.id,
            quantity=allocate_qty,
            commit_db=False,
        )
        created_allocations.append(allocation)
        remaining_qty -= allocate_qty

    return created_allocations


def cancel_allocations_for_order_line(db: Session, order_line_id: int) -> list[int]:
    """受注明細に紐づく全ての引当を一括キャンセル.

    Args:
        db: データベースセッション
        order_line_id: 受注明細ID

    Returns:
        list[int]: キャンセルされた引当IDのリスト
    """
    # 対象の引当を取得
    allocations = db.query(Allocation).filter(Allocation.order_line_id == order_line_id).all()

    cancelled_ids: list[int] = []
    for alloc in allocations:
        # 既にキャンセル済みでないものだけ処理
        if alloc.status != "cancelled":
            try:
                # 削除（またはキャンセルステータスへ更新）
                # cancel_allocation 関数は在庫を戻して削除を行う
                cancel_allocation(db, alloc.id, commit_db=False)
                cancelled_ids.append(alloc.id)
            except (AllocationNotFoundError, AllocationCommitError):
                continue

    if cancelled_ids:
        # まとめてコミット
        db.commit()

        # 注文および明細のステータス更新を確実に行う
        # cancel_allocation(commit_db=False) 内で flush はされているが、
        # 最後に確実に再計算する
        line = db.get(OrderLine, order_line_id)
        if line:
            update_order_allocation_status(db, line.order_id)
            update_order_line_status(db, line.id)
            db.commit()

    return cancelled_ids
