"""Soft reservation preemption for hard allocation.

Handles automatic release of soft reservations when hard allocation is requested.

P3: Uses LotReservation exclusively.

【設計意図】ソフト予約プリエンプション（先取り）の設計判断:

1. なぜプリエンプション機能が必要なのか
   理由: ハード確定（CONFIRMED）の優先権を保証
   業務的背景:
   - 自動車部品商社: KANBAN（かんばん発注）は納期確約が必要
   - 問題: ソフト予約（ACTIVE）が先に在庫を確保
   → ハード確定時に在庫不足
   解決:
   - プリエンプション: 優先度の低い予約を自動解放
   → ハード確定に在庫を譲る

2. 優先度順の設計（L80-86）
   理由: ビジネスルールに基づく優先順位
   優先度（高→低）:
   - KANBAN（4）: かんばん発注（最優先）
   - ORDER（3）: 通常受注
   - SPOT（2）: スポット受注
   - FORECAST_LINKED（1）: 予測ベース仮受注（最低優先）
   業務ルール:
   - KANBAN は確定納期、絶対に守る必要がある
   - FORECAST は見込みなので調整可能
   実装:
   - sa_case() でorder_typeを数値化
   → 数値が小さいほど優先度が低い
   → 優先度が低い順（asc）に解放

3. なぜ ACTIVE のみを対象とするのか（L76）
   理由: CONFIRMED（確定予約）は解放不可
   業務ルール:
   - ACTIVE: システム内の仮予約（SAP未登録）
   → 柔軟に調整可能
   - CONFIRMED: SAP登録済みの確定予約
   → SAP側の処理が必要、自動解放不可
   実装:
   - status == ACTIVE のみ対象
   → CONFIRMED は解放されない

4. 在庫不足チェックの設計（L60-64）
   理由: 必要な場合のみプリエンプション実行
   処理フロー:
   - available = 利用可能数量
   - available >= required_qty: 十分な在庫あり
   → プリエンプション不要、空リスト返却
   - available < required_qty: 在庫不足
   → shortage（不足数量）を計算して解放開始
   メリット:
   - 不要な解放を防止
   - パフォーマンス向上

5. 部分解放の設計（L108-120）
   理由: 必要最小限の解放
   問題:
   - 予約A: 100個、不足: 30個
   → 100個全て解放すると、70個分が無駄に解放される
   解決:
   - release_qty = min(reserved_qty, shortage)
   → 最大30個のみ解放
   - 残り70個は予約として維持
   実装（L110-111）:
   - reservation.reserved_qty -= release_qty
   → 予約数量を減らす（一部解放）

6. 全量解放の設計（L121-134）
   理由: 予約が完全に不要になった場合
   条件:
   - release_qty >= reservation.reserved_qty
   → 予約全量を解放
   実装:
   - status = RELEASED
   - released_at = 現在時刻
   業務的意義:
   - 解放済み予約として履歴に残す
   → 「いつ、なぜ解放されたか」を追跡可能

7. なぜ with_for_update() でロックするのか（L55）
   理由: 並行処理での競合防止
   問題:
   - プロセスA: ハード確定処理中
   - プロセスB: 同時に別のハード確定処理
   → 両方が同じソフト予約を解放しようとする
   解決:
   - with_for_update(): ロット行をロック
   → 片方が完了するまで、もう片方は待機
   メリット:
   - 二重解放の防止

8. 解放情報の返却設計（L93, L113-120, L127-134）
   理由: 解放結果の可視化
   返却内容:
   - reservation_id: 解放された予約ID
   - source_id: 元の受注明細ID
   - released_qty: 解放数量
   - order_type: 受注タイプ（KANBAN, ORDER等）
   用途:
   - フロントエンド: 「どの予約が解放されたか」を表示
   - ログ: 解放履歴を記録

9. update_order_allocation_status() の呼び出し（L140-141）
   理由: 受注ステータスの自動更新
   業務フロー:
   - ソフト予約解放 → 受注明細の引当数量が減少
   → 受注ステータスを「一部引当」or「未引当」に更新
   実装:
   - update_order_allocation_status(): 引当数量を集計してステータス更新
   メリット:
   - 受注ステータスが自動的に最新状態に

10. created_at によるタイブレーカー（L87）
    理由: 同じ優先度の場合は古い予約から解放
    実装:
    - order_by(..., created_at ASC)
    → 同じ order_type なら、作成日時が古い順
    業務的意義:
    - FIFO（First In First Out）原則
    → 古い予約から解放することで公平性を保つ
"""

from __future__ import annotations

from decimal import Decimal

from sqlalchemy import case as sa_case
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.application.services.allocations.utils import (
    update_order_allocation_status,
    update_order_line_status,
)
from app.core.time_utils import utcnow
from app.infrastructure.persistence.models import LotReceipt, OrderLine
from app.infrastructure.persistence.models.lot_reservations_model import (
    LotReservation,
    ReservationSourceType,
    ReservationStatus,
)


def _get_available_quantity_for_preempt(db: Session, lot: LotReceipt) -> Decimal:
    """Get available quantity for preemption check."""
    from app.application.services.inventory.stock_calculation import get_available_quantity

    return get_available_quantity(db, lot)


def preempt_soft_reservations_for_hard(
    db: Session,
    lot_id: int,
    required_qty: Decimal,
    hard_demand_id: int,
) -> list[dict]:
    """Hard確定時に同ロットのSoft予約を自動解除.

    優先度: KANBAN > ORDER > FORECAST (優先度の低いものから解除)

    Args:
        db: データベースセッション
        lot_id: ロットID
        required_qty: 必要数量（Hard確定する数量）
        hard_demand_id: 新しいHard需要のsource_id

    Returns:
        list[dict]: 解除された予約情報のリスト
    """
    lot_stmt = select(LotReceipt).where(LotReceipt.id == lot_id).with_for_update()
    lot = db.execute(lot_stmt).scalar_one_or_none()
    if not lot:
        return []

    available = _get_available_quantity_for_preempt(db, lot)
    if available >= required_qty:
        return []

    shortage = required_qty - available

    # Get soft reservations (ACTIVE, not CONFIRMED) ordered by priority
    soft_reservations_stmt = (
        select(LotReservation)
        .outerjoin(
            OrderLine,
            (LotReservation.source_type == ReservationSourceType.ORDER)
            & (LotReservation.source_id == OrderLine.id),
        )
        .where(
            LotReservation.lot_id == lot_id,
            LotReservation.status == ReservationStatus.ACTIVE,
            LotReservation.source_id != hard_demand_id,
        )
        .order_by(
            sa_case(
                (OrderLine.order_type == "KANBAN", 4),
                (OrderLine.order_type == "ORDER", 3),
                (OrderLine.order_type == "SPOT", 2),
                (OrderLine.order_type == "FORECAST_LINKED", 1),
                else_=3,
            ).asc(),
            LotReservation.created_at.asc(),
        )
    )

    soft_reservations = db.execute(soft_reservations_stmt).scalars().all()

    released_info: list[dict] = []
    remaining_shortage = shortage

    now = utcnow()

    for reservation in soft_reservations:
        if remaining_shortage <= 0:
            break

        release_qty = min(reservation.reserved_qty, remaining_shortage)

        order_line = None
        if reservation.source_type == ReservationSourceType.ORDER and reservation.source_id:
            order_line = db.get(OrderLine, reservation.source_id)

        if release_qty < reservation.reserved_qty:
            # Partial release - reduce quantity
            reservation.reserved_qty -= release_qty
            reservation.updated_at = now

            released_info.append(
                {
                    "reservation_id": reservation.id,
                    "source_id": reservation.source_id,
                    "released_qty": float(release_qty),
                    "order_type": order_line.order_type if order_line else "UNKNOWN",
                }
            )
        else:
            # Full release
            reservation.status = ReservationStatus.RELEASED
            reservation.released_at = now
            reservation.updated_at = now

            released_info.append(
                {
                    "reservation_id": reservation.id,
                    "source_id": reservation.source_id,
                    "released_qty": float(release_qty),
                    "order_type": order_line.order_type if order_line else "UNKNOWN",
                }
            )

        lot.updated_at = now
        remaining_shortage -= release_qty

        if order_line:
            update_order_allocation_status(db, order_line.order_id)
            update_order_line_status(db, order_line.id)

    db.flush()

    return released_info
