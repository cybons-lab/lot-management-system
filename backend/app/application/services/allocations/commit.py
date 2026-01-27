"""FEFO reservation commit operations.

Handles commit of FEFO-based reservations:
- Validate commit eligibility
- Persist reservation entities with pessimistic locking
- Execute FEFO reservation commit

P3: Uses LotReservation exclusively.

【設計意図】FEFO予約確定の設計判断:

1. なぜ Two-Phase Commit パターンを採用するのか
   理由: 引当結果の事前確認と確定を分離
   業務的背景:
   - Phase 1（preview）: 引当計画をシミュレーション（DB更新なし）
   - Phase 2（commit）: 引当計画を実際にDBに書き込み
   → ユーザーが引当結果を確認してから確定
   実装:
   - preview_fefo_allocation(): プレビュー（読み取り専用）
   - commit_fefo_reservation(): 確定（DB更新）
   メリット:
   - ユーザーが「この引当で良いか」を確認可能
   - 誤った引当の防止

2. なぜ validate_commit_eligibility() が必要なのか（L38-50）
   理由: 確定可能な受注ステータスの検証
   許可される状態:
   - open: 未引当
   - part_allocated: 一部引当済み
   不許可の状態:
   - draft: 下書き（確定前）
   - allocated: 全量引当済み（重複引当防止）
   - shipped: 出荷済み
   → 業務ルールに反する確定を防ぐ
   実装:
   - order.status not in {"open", "part_allocated"} → ValueError

3. なぜ pessimistic locking（with_for_update）を使うのか（L106）
   理由: 並行処理での二重引当を防止
   問題:
   - ユーザーA: ロットX（在庫50個）を引当
   - ユーザーB: 同時にロットX（在庫50個）を引当
   → 両方が「在庫あり」と判定 → 合計100個引当（実在庫は50個）
   解決:
   - with_for_update(): SELECT ... FOR UPDATE でロット行をロック
   → 先に処理したユーザーの引当が完了するまで、後のユーザーは待機
   実装:
   - select(Lot).where(Lot.id == ...).with_for_update()

4. なぜ idempotency check があるのか（L90-104）
   理由: 重複引当の防止
   問題:
   - 同じ引当を2回実行すると、2倍の引当が作成される
   解決:
   - 既存の LotReservation を検索
   → 存在する場合はスキップ（新規作成しない）
   実装:
   - existing_reservation = db.query(...).filter(...).first()
   → 既に存在する場合は created.append() して continue
   業務影響:
   - API の再試行時に重複引当を防止

5. なぜ EPSILON 許容誤差を使うのか（L68, L116）
   理由: 浮動小数点数の精度問題を回避
   問題:
   - Decimal("10.0") - Decimal("9.999999") = Decimal("0.000001")
   → 厳密な比較（< 0）では、微小な誤差で引当失敗
   解決:
   - EPSILON = 1e-6: 0.000001の許容誤差
   - available + EPSILON < allocate_qty: 実質的に同値なら許可
   業務影響:
   - 丸め誤差による引当失敗を防ぐ

6. なぜ try-except で rollback するのか（L155-164）
   理由: トランザクションの原子性を保証
   背景:
   - 複数の明細を一括で引当
   → 途中でエラーが発生した場合、全てロールバック
   実装:
   - try: persist_reservation_entities() を全明細分実行
   - except: db.rollback() → 全ての変更を取り消し
   業務影響:
   - 一部の引当のみが成功して不整合になるのを防ぐ

7. なぜ update_order_allocation_status() を呼ぶのか（L159）
   理由: 受注ステータスの自動更新
   背景:
   - 引当後に受注ステータスを更新
   → 「一部引当済み」or「全量引当済み」を自動判定
   実装:
   - update_order_allocation_status(db, order_id)
   → 全明細が引当済みなら allocated、一部なら part_allocated
   業務影響:
   - 受注の進捗状況が自動的に更新される

8. なぜ next_div を設定するのか（L78-79）
   理由: 明細の丸め単位を更新
   背景:
   - プレビュー時に計算された next_div を明細に設定
   → 引当数量の丸め単位を記録
   実装:
   - line.next_div = line_plan.next_div
   用途:
   - 出荷時の数量調整（梱包単位での調整）

9. なぜ lot.updated_at を更新するのか（L131）
   理由: ロットの最終更新日時を記録
   用途:
   - 「いつ引当されたか」を追跡
   → 監査証跡
   実装:
   - lot.updated_at = now

10. なぜ数量が正数かを検証するのか（L84-88）
    理由: 業務ルール違反の検出
    業務ルール:
    - 引当数量は必ず正数（0以下は無効）
    実装:
    - if alloc_plan.allocate_qty <= 0: raise AllocationCommitError
    → M-01 Fix として追加
    業務影響:
    - 不正な引当数量の検出
"""

from __future__ import annotations

from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.application.services.allocations.fefo import preview_fefo_allocation
from app.application.services.allocations.mapping_validator import validate_lot_mapping
from app.application.services.allocations.schemas import (
    AllocationCommitError,
    FefoCommitResult,
    FefoLinePlan,
)
from app.application.services.allocations.utils import (
    _load_order,
    update_order_allocation_status,
)
from app.application.services.inventory.stock_calculation import get_available_quantity
from app.core.time_utils import utcnow
from app.domain.errors import UnmappedItemError
from app.infrastructure.persistence.models import LotReceipt, Order, OrderLine
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


def persist_reservation_entities(
    db: Session,
    line_plan: FefoLinePlan,
    created: list[LotReservation],
) -> None:
    """Persist reservation entities with pessimistic locking.

    Args:
        db: Database session
        line_plan: Line allocation plan
        created: List to append created reservations

    Raises:
        AllocationCommitError: If persistence fails
    """
    EPSILON = 1e-6

    if not line_plan.allocations:
        return

    line_stmt = select(OrderLine).where(OrderLine.id == line_plan.order_line_id)
    line = db.execute(line_stmt).scalar_one_or_none()
    if not line:
        raise AllocationCommitError(f"OrderLine {line_plan.order_line_id} not found")

    if line_plan.next_div and not getattr(line, "next_div", None):
        line.next_div = line_plan.next_div  # type: ignore[attr-defined]

    now = utcnow()

    for alloc_plan in line_plan.allocations:
        # M-01 Fix: Validate quantity is positive
        if alloc_plan.allocate_qty <= 0:
            raise AllocationCommitError(
                f"Invalid allocation quantity: {alloc_plan.allocate_qty}. Must be positive."
            )

        # Idempotency check: Skip if reservation already exists for this (lot_id, source_id)
        existing_reservation = (
            db.query(LotReservation)
            .filter(
                LotReservation.lot_id == alloc_plan.lot_id,
                LotReservation.source_type == ReservationSourceType.ORDER,
                LotReservation.source_id == line.id,
                LotReservation.status != ReservationStatus.RELEASED,
            )
            .first()
        )
        if existing_reservation:
            # Already reserved - skip to ensure idempotency
            created.append(existing_reservation)
            continue

        lot_stmt = select(LotReceipt).where(LotReceipt.id == alloc_plan.lot_id).with_for_update()
        lot = db.execute(lot_stmt).scalar_one_or_none()
        if not lot:
            raise AllocationCommitError(f"Lot {alloc_plan.lot_id} not found")
        if lot.status != "active":
            raise AllocationCommitError(
                f"Lot {alloc_plan.lot_id} status '{lot.status}' is not active"
            )

        # Phase 2-1: 未マッピングブロック
        try:
            validate_lot_mapping(db, lot, raise_on_unmapped=True)
        except UnmappedItemError as e:
            raise AllocationCommitError("UNMAPPED_ITEM", str(e)) from e

        available = float(get_available_quantity(db, lot))
        if available + EPSILON < alloc_plan.allocate_qty:
            raise AllocationCommitError(
                f"Insufficient stock for lot {lot.id}: "
                f"required {alloc_plan.allocate_qty}, available {available}"
            )

        reservation = LotReservation(
            lot_id=lot.id,
            source_type=ReservationSourceType.ORDER,
            source_id=line.id,
            reserved_qty=Decimal(str(alloc_plan.allocate_qty)),
            status=ReservationStatus.ACTIVE,
            created_at=now,
        )
        db.add(reservation)
        lot.updated_at = now
        created.append(reservation)


def commit_fefo_reservation(db: Session, order_id: int) -> FefoCommitResult:
    """FEFO予約確定（状態: open|part_allocated のみ許容）.

    Args:
        db: データベースセッション
        order_id: 注文ID

    Returns:
        FefoCommitResult: 予約確定結果

    Raises:
        ValueError: 注文が見つからない、または状態が不正な場合
        AllocationCommitError: 予約確定中にエラーが発生した場合
    """
    order = _load_order(db, order_id)
    validate_commit_eligibility(order)

    preview = preview_fefo_allocation(db, order_id)

    created: list[LotReservation] = []
    try:
        for line_plan in preview.lines:
            persist_reservation_entities(db, line_plan, created)

        update_order_allocation_status(db, order_id)

        db.commit()
    except (AllocationCommitError, SQLAlchemyError, ValueError):
        db.rollback()
        raise

    return FefoCommitResult(preview=preview, created_reservations=created)
