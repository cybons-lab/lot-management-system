"""
Allocation actions service.

Handles execution of allocations:
- Commit FEFO allocation
- Manual allocation (Drag & Assign)
- Cancel allocation
"""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.models import Allocation, Lot, Order, OrderLine
from app.services.allocations.fefo import preview_fefo_allocation
from app.services.allocations.schemas import (
    AllocationCommitError,
    AllocationNotFoundError,
    FefoCommitResult,
    FefoLinePlan,
)
from app.services.allocations.utils import (
    _load_order,
    update_order_allocation_status,
    update_order_line_status,
)


def validate_commit_eligibility(order: Order) -> None:
    """
    Validate order status for commit operation.

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
    """
    Persist allocation entities with pessimistic locking.

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
        line.next_div = line_plan.next_div

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

        # 利用可能在庫チェック
        available = float(lot.current_quantity - lot.allocated_quantity)
        if available + EPSILON < alloc_plan.allocate_qty:
            raise AllocationCommitError(
                f"Insufficient stock for lot {lot.id}: "
                f"required {alloc_plan.allocate_qty}, available {available}"
            )

        # 引当数量を更新
        lot.allocated_quantity += Decimal(str(alloc_plan.allocate_qty))
        lot.updated_at = datetime.utcnow()

        # 引当レコード作成
        allocation = Allocation(
            order_line_id=line.id,
            lot_id=lot.id,
            allocated_quantity=alloc_plan.allocate_qty,
            status="allocated",
            created_at=datetime.utcnow(),
        )
        db.add(allocation)
        created.append(allocation)


def commit_fefo_allocation(db: Session, order_id: int) -> FefoCommitResult:
    """
    FEFO引当確定（状態: open|part_allocated のみ許容）.

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
    """
    手動引当実行 (Drag & Assign).

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

    # 在庫チェック
    available = lot.current_quantity - lot.allocated_quantity
    if available + EPSILON < quantity:
        raise AllocationCommitError(
            f"Insufficient stock: required {quantity}, available {available}"
        )

    # 引当実行
    lot.allocated_quantity += quantity
    lot.updated_at = datetime.utcnow()

    allocation = Allocation(
        order_line_id=line.id,
        lot_id=lot.id,
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

    return allocation


def cancel_allocation(db: Session, allocation_id: int, *, commit_db: bool = True) -> None:
    """
    引当をキャンセル.

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

    # ロックをかけてロットを取得
    lot_stmt = select(Lot).where(Lot.id == allocation.lot_id).with_for_update()
    lot = db.execute(lot_stmt).scalar_one_or_none()
    if not lot:
        raise AllocationCommitError(f"Lot {allocation.lot_id} not found")

    # 引当数量を解放
    lot.allocated_quantity -= allocation.allocated_quantity
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
    """
    引当を一括キャンセル.

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


def confirm_hard_allocation(
    db: Session,
    allocation_id: int,
    *,
    confirmed_by: str | None = None,
    quantity: Decimal | None = None,
    commit_db: bool = True,
) -> tuple[Allocation, Allocation | None]:
    """
    Soft引当をHard引当に確定（Soft → Hard変換）.

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
    from app.services.allocations.schemas import InsufficientStockError

    # 引当取得
    allocation = db.get(Allocation, allocation_id)
    if not allocation:
        raise AllocationNotFoundError(f"Allocation {allocation_id} not found")

    # 既にHardの場合はエラー
    if allocation.allocation_type == "hard":
        raise AllocationCommitError("ALREADY_CONFIRMED", f"引当 {allocation_id} は既に確定済みです")

    # lot_idが必須（provisionalは確定不可）
    if not allocation.lot_id:
        raise AllocationCommitError(
            "PROVISIONAL_ALLOCATION", "入荷予定ベースの仮引当は確定できません"
        )

    # ロック付きでロット取得
    lot_stmt = select(Lot).where(Lot.id == allocation.lot_id).with_for_update()
    lot = db.execute(lot_stmt).scalar_one_or_none()
    if not lot:
        raise AllocationCommitError("LOT_NOT_FOUND", f"Lot {allocation.lot_id} not found")

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

    # 在庫チェック
    # NOTE: この引当の数量は既に lots.allocated_quantity に加算済み。
    # したがって、この引当自体を確定する場合は在庫不足にはならない。
    # ただし、部分確定で残りを他に回す場合や、ロットの状態変化があった場合は
    # 整合性チェックとして current_quantity >= allocated_quantity を確認。
    if lot.current_quantity < lot.allocated_quantity:
        # ロットの状態異常（在庫が減ったなど）
        available = lot.current_quantity - (lot.allocated_quantity - allocation.allocated_quantity)
        raise InsufficientStockError(
            lot_id=lot.id,
            lot_number=lot.lot_number,
            required=float(confirm_qty),
            available=float(max(available, 0)),
        )

    now = datetime.utcnow()
    remaining_allocation: Allocation | None = None

    # 部分確定の場合
    if quantity is not None and quantity < allocation.allocated_quantity:
        # 残りのSoft引当を作成
        remaining_qty = allocation.allocated_quantity - quantity
        remaining_allocation = Allocation(
            order_line_id=allocation.order_line_id,
            lot_id=allocation.lot_id,
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

    # NOTE: lots.allocated_quantity は引当作成時（allocate_manually等）で
    # 既に加算済みのため、ここでは加算しない。
    # 二重カウントを防ぐため、allocation_type の変更のみ行う。
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

    return allocation, remaining_allocation


def confirm_hard_allocations_batch(
    db: Session,
    allocation_ids: list[int],
    *,
    confirmed_by: str | None = None,
) -> tuple[list[int], list[dict]]:
    """
    複数の引当を一括でHard確定.

    Args:
        db: データベースセッション
        allocation_ids: 確定対象の引当ID一覧
        confirmed_by: 確定操作を行ったユーザーID（オプション）

    Returns:
        tuple[list[int], list[dict]]:
            - 確定成功した引当ID一覧
            - 確定失敗した引当情報一覧 [{"id": int, "error": str, "message": str}]
    """
    from app.services.allocations.schemas import InsufficientStockError

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
    """
    受注明細に対してFEFO戦略で自動引当を実行.

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
    candidate_lots = (
        db.query(Lot)
        .filter(
            Lot.product_id == line.product_id,
            Lot.status == "active",
            Lot.current_quantity > Lot.allocated_quantity,
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

        available = lot.current_quantity - lot.allocated_quantity
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
