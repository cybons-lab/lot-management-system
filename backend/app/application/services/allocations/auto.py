"""Auto-reservation operations.

Handles FEFO-based automatic allocation:
- Single line auto-reservation
- Bulk auto-reservation with filtering

P3: Uses LotReservation exclusively.
v3.0: Delegates to AllocationCandidateService (SSOT).

【設計意図】自動引当の設計判断:

1. なぜ AllocationCandidateService に委譲するのか（L52-60）
   理由: 引当候補取得ロジックのSSoT
   → v3.0で AllocationCandidateService が引当候補取得の責務を持つ
   実装:
   - _get_fefo_candidates_for_line(): AllocationCandidateService.get_candidates() を呼び出す
   メリット:
   - FEFO/FIFO ロジックが1箇所に集中 → 変更影響を限定

2. なぜ既存予約を差し引くのか（L83-96）
   理由: 重複引当の防止
   問題:
   - 受注明細: 100個必要、既に50個引当済み
   → 100個引当すると、合計150個引当（重複）
   解決:
   - already_reserved = sum(r.reserved_qty ...)
   - required_qty = order_quantity - already_reserved
   → 残り50個のみ引当
   業務影響:
   - 過剰引当を防止 → 在庫の有効活用

3. なぜ FOR_UPDATE でロックするのか（L56, L101-102）
   理由: 並行引当での競合防止
   問題:
   - ユーザーA: ロットX（在庫50個）を引当
   - ユーザーB: 同時にロットX（在庫50個）を引当
   → 両方が「在庫あり」と判定 → 合計100個引当（実在庫50個）
   解決:
   - lock=True → LockMode.FOR_UPDATE
   → ロット行をロックして、同時引当を防止
   メリット:
   - 在庫の二重引当を防止

4. なぜ create_manual_reservation を呼ぶのか（L117-123）
   理由: 予約作成ロジックの共通化
   実装:
   - create_manual_reservation(): 手動・自動引当の共通処理
   → LotReservation レコード作成 + バリデーション
   メリット:
   - 予約作成ロジックが重複しない
   - バリデーションルールを一元管理

5. なぜ commit_db=False を使うのか（L122, L181）
   理由: 一括コミットによるトランザクション最適化
   問題:
   - 10個のロットを引当 → 10回のコミット → 遅い
   解決:
   - commit_db=False: 各引当でコミットしない
   - L128: 最後に1回だけコミット
   メリット:
   - パフォーマンス向上（トランザクション回数削減）
   - 全件成功 or 全件ロールバック（原子性）

6. なぜ auto_reserve_bulk があるのか（L189-274）
   理由: 複数受注明細の一括引当
   用途:
   - 管理者: 「FORECAST_LINKED の受注を全て引当」
   - バッチ処理: 「夜間に全受注を一括引当」
   実装:
   - フィルタ: product_id, customer_id, delivery_place_id, order_type
   - ORDER BY delivery_date ASC: 納期が早い順に引当
   業務影響:
   - 手動で1件ずつ引当する手間を削減

7. なぜ skip_already_reserved があるのか（L196, L259-261）
   理由: 全量引当済み明細のスキップ
   問題:
   - 100件の受注明細のうち、80件は既に全量引当済み
   → 80件の処理は無駄
   解決:
   - skip_already_reserved=True: 全量引当済みはスキップ
   → 残り20件のみ処理
   メリット:
   - 処理時間の短縮

8. なぜ result サマリーを返すのか（L236-242, L272-274）
   理由: バッチ処理結果の可視化
   サマリー内容:
   - processed_lines: 処理対象の明細数
   - reserved_lines: 引当成功した明細数
   - skipped_lines: スキップした明細数
   - failed_lines: エラーが発生した明細一覧
   用途:
   - フロントエンド: 「100件処理、80件成功、10件スキップ、10件失敗」と表示

9. なぜ try-except で個別エラーをキャッチするのか（L263-269）
   理由: 一部失敗でも継続処理
   問題:
   - 100件の引当中、10件目でエラー → 全件ロールバック
   → 9件の成功も無駄に
   解決:
   - try-except で個別エラーをキャッチ
   → failed_lines に追加して、残り90件を処理継続
   業務影響:
   - 一部失敗しても、成功した引当は有効化

10. なぜ _auto_reserve_line_no_commit があるのか（L135-186）
    理由: バッチ処理用の内部関数
    違い:
    - auto_reserve_line(): 単体引当（commit あり）
    - _auto_reserve_line_no_commit(): バッチ引当（commit なし）
    実装:
    - auto_reserve_bulk() から呼び出し
    → 全明細の引当が完了してから、1回だけコミット
    メリット:
    - トランザクション回数の削減
"""

from __future__ import annotations

from decimal import Decimal
from typing import TYPE_CHECKING, Any

from sqlalchemy.orm import Session

from app.application.services.allocations.candidate_service import (
    AllocationCandidateService,
)
from app.application.services.allocations.manual import create_manual_reservation
from app.domain.allocation_policy import AllocationPolicy, LockMode
from app.infrastructure.persistence.models import Order, OrderLine
from app.infrastructure.persistence.models.lot_reservations_model import (
    LotReservation,
    ReservationSourceType,
    ReservationStatus,
)


if TYPE_CHECKING:
    from app.domain.lot import LotCandidate


def _get_fefo_candidates_for_line(
    db: Session,
    product_id: int,
    warehouse_id: int | None = None,
    lock: bool = True,
) -> list[LotCandidate]:
    """Fetch FEFO candidates for a product using SSOT.

    Args:
        db: Database session
        product_id: Product ID
        warehouse_id: Optional warehouse ID to filter by
        lock: Whether to lock rows for update

    Returns:
        List of LotCandidate sorted by FEFO
    """
    candidate_service = AllocationCandidateService(db)
    return candidate_service.get_candidates(
        product_id=product_id,
        policy=AllocationPolicy.FEFO,
        lock_mode=LockMode.FOR_UPDATE if lock else LockMode.NONE,
        warehouse_id=warehouse_id,
        exclude_expired=True,
        exclude_locked=False,
    )


def auto_reserve_line(
    db: Session,
    order_line_id: int,
) -> list[LotReservation]:
    """受注明細に対してFEFO戦略で自動予約を実行.

    Args:
        db: データベースセッション
        order_line_id: 受注明細ID

    Returns:
        list[LotReservation]: 作成された予約一覧

    Raises:
        ValueError: 受注明細が見つからない場合
    """
    line = db.query(OrderLine).filter(OrderLine.id == order_line_id).first()
    if not line:
        raise ValueError(f"OrderLine {order_line_id} not found")

    existing_reservations = (
        db.query(LotReservation)
        .filter(
            LotReservation.source_type == ReservationSourceType.ORDER,
            LotReservation.source_id == order_line_id,
            LotReservation.status != ReservationStatus.RELEASED,
        )
        .all()
    )
    already_reserved = sum(r.reserved_qty for r in existing_reservations)

    required_qty = Decimal(str(line.order_quantity)) - already_reserved
    if required_qty <= 0:
        return []

    # Use SSOT for candidate fetching with warehouse filter
    warehouse_id = getattr(line, "warehouse_id", None)
    candidates = _get_fefo_candidates_for_line(
        db, line.product_id or 0, warehouse_id=warehouse_id, lock=True
    )

    created_reservations: list[LotReservation] = []
    remaining_qty = required_qty

    for candidate in candidates:
        if remaining_qty <= 0:
            break

        available = Decimal(str(candidate.available_qty))
        if available <= 0:
            continue

        reserve_qty = min(available, remaining_qty)

        reservation = create_manual_reservation(
            db,
            order_line_id=order_line_id,
            lot_id=candidate.lot_id,
            quantity=reserve_qty,
            commit_db=False,
        )
        created_reservations.append(reservation)
        remaining_qty -= reserve_qty

    if created_reservations:
        db.commit()
        for res in created_reservations:
            db.refresh(res)

    return created_reservations


def _auto_reserve_line_no_commit(
    db: Session,
    order_line_id: int,
    required_qty: Decimal,
) -> list[LotReservation]:
    """auto_reserve_line の内部版（コミットなし）.

    Args:
        db: データベースセッション
        order_line_id: 受注明細ID
        required_qty: 必要数量（既存予約を差し引いた残数）

    Returns:
        list[LotReservation]: 作成された予約一覧
    """
    if required_qty <= 0:
        return []

    line = db.query(OrderLine).filter(OrderLine.id == order_line_id).first()
    if not line:
        return []

    # Use SSOT for candidate fetching with warehouse filter
    warehouse_id = getattr(line, "warehouse_id", None)
    candidates = _get_fefo_candidates_for_line(
        db, line.product_id or 0, warehouse_id=warehouse_id, lock=True
    )

    created_reservations: list[LotReservation] = []
    remaining_qty = required_qty

    for candidate in candidates:
        if remaining_qty <= 0:
            break

        available = Decimal(str(candidate.available_qty))
        if available <= 0:
            continue

        reserve_qty = min(available, remaining_qty)

        reservation = create_manual_reservation(
            db,
            order_line_id=order_line_id,
            lot_id=candidate.lot_id,
            quantity=reserve_qty,
            commit_db=False,
        )
        created_reservations.append(reservation)
        remaining_qty -= reserve_qty

    return created_reservations


def auto_reserve_bulk(
    db: Session,
    *,
    product_id: int | None = None,
    customer_id: int | None = None,
    delivery_place_id: int | None = None,
    order_type: str | None = None,
    skip_already_reserved: bool = True,
) -> dict:
    """複数受注明細に対して一括でFEFO自動予約を実行.

    フィルタリング条件を指定して対象を絞り込み可能。

    Args:
        db: データベースセッション
        product_id: 製品ID（指定時はその製品のみ対象）
        customer_id: 得意先ID（指定時はその得意先のみ対象）
        delivery_place_id: 納入先ID（指定時はその納入先のみ対象）
        order_type: 受注タイプ（FORECAST_LINKED, KANBAN, SPOT, ORDER）
        skip_already_reserved: True の場合、既に全量予約済みの明細はスキップ

    Returns:
        dict: 処理結果サマリー
    """
    query = (
        db.query(OrderLine)
        .join(Order, OrderLine.order_id == Order.id)
        .filter(
            OrderLine.status.in_(["pending", "allocated"]),
            Order.status.in_(["open", "part_allocated"]),
        )
    )

    if product_id is not None:
        query = query.filter(OrderLine.product_id == product_id)

    if customer_id is not None:
        query = query.filter(Order.customer_id == customer_id)

    if delivery_place_id is not None:
        query = query.filter(OrderLine.delivery_place_id == delivery_place_id)

    if order_type is not None:
        query = query.filter(OrderLine.order_type == order_type)

    order_lines = query.order_by(OrderLine.delivery_date.asc()).all()

    result: dict[str, Any] = {
        "processed_lines": 0,
        "reserved_lines": 0,
        "total_reservations": 0,
        "skipped_lines": 0,
        "failed_lines": [],
    }

    for line in order_lines:
        result["processed_lines"] += 1

        existing_reservations = (
            db.query(LotReservation)
            .filter(
                LotReservation.source_type == ReservationSourceType.ORDER,
                LotReservation.source_id == line.id,
                LotReservation.status != ReservationStatus.RELEASED,
            )
            .all()
        )
        already_reserved = sum(r.reserved_qty for r in existing_reservations)
        required_qty = Decimal(str(line.order_quantity)) - already_reserved

        if required_qty <= 0 and skip_already_reserved:
            result["skipped_lines"] += 1
            continue

        try:
            reservations = _auto_reserve_line_no_commit(db, line.id, required_qty)
            if reservations:
                result["reserved_lines"] += 1
                result["total_reservations"] += len(reservations)
        except Exception as e:
            result["failed_lines"].append({"line_id": line.id, "error": str(e)})

    if result["total_reservations"] > 0:
        db.commit()

    return result
