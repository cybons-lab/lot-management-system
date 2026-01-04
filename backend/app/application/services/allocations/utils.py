"""Allocation utility functions.

Shared utilities for allocation operations:
- Order loading with eager loading
- Status synchronization (Order/OrderLine ↔ LotReservation)
- Next division resolution

【設計意図】引当ユーティリティの設計判断:

1. なぜ専用のユーティリティモジュールを作るのか
   理由: 引当関連の共通ロジックを一元管理
   背景:
   - 複数の引当サービス（auto, manual, confirm等）で共通処理が発生
   → コードの重複を防ぐため、ユーティリティ関数として分離
   メリット:
   - ロジックの一貫性が保証される
   - バグ修正時の影響範囲が明確

2. _load_order() の設計（L21-46）
   理由: 受注データの効率的な取得
   実装:
   - selectinload(Order.order_lines): 明細を別クエリで一括取得
   - joinedload(OrderLine.product): 製品情報をJOINで取得
   業務的意義:
   - N+1問題を回避
   → 100件の明細があっても、クエリは3回のみ
   使用例:
   - FEFO引当プレビュー、確定処理で使用

3. selectinload と joinedload の使い分け（L37-38）
   理由: リレーションタイプに応じた最適化
   selectinload（別クエリ）:
   - 1対多: Order → OrderLines
   → JOIN だと Order が重複
   joinedload（JOIN）:
   - 多対1: OrderLine → Product
   → JOIN でも重複しない、1回のクエリで取得
   パフォーマンス:
   - selectinload: 2クエリ（Order + Lines一括）
   - joinedload: 1クエリ（JOIN）

4. _existing_allocated_qty() の設計（L49-58）
   理由: 既存引当数量の計算
   実装:
   - _lot_reservations から RELEASED 以外の予約を集計
   → sum(reserved_qty for res if res.status != RELEASED)
   業務的意義:
   - 自動引当時の重複引当防止
   → required_qty - already_allocated = 残り必要数量
   注意:
   - getattr で安全に取得（属性がない場合は []）

5. _resolve_next_div() の設計（L61-80）
   理由: 製品の「次区」（梱包単位）の解決
   業務的背景:
   - 自動車部品: 製品ごとに梱包単位が異なる
   → 「次区」マスタで管理（例: 100個入り、50個入り）
   処理フロー:
   - line.product から取得 → なければ product_id で検索
   → それでも見つからなければ warning 返却
   用途:
   - 引当数量の丸め処理（100個単位で引当等）

6. update_order_line_status() の設計（L83-121）
   理由: 受注明細ステータスの自動同期
   ステータスルール:
   - reserved_qty >= required_qty → "allocated"（全量引当済み）
   - reserved_qty > 0 → "pending"（一部引当 or 未引当）
   EPSILON の使用（L92, L113, L115）:
   - 浮動小数点数の精度問題を回避
   → reserved_qty + EPSILON >= required_qty
   業務的意義:
   - 引当状況を明細単位で可視化

7. update_order_allocation_status() の設計（L123-189）
   理由: 受注全体のステータス自動同期
   ステータスルール（H-06 Fix）:
   - 全明細が全量引当 → "allocated"
   - 一部の明細が引当済み → "part_allocated"
   - 全明細が未引当 → "open"
   実装:
   - 全明細の引当数量を集計（L140-159）
   - 判定ロジック（L176-183）
   業務的意義:
   - 受注の進捗状況を一目で把握

8. H-06 Fix: ステータス巻き戻しの正しい処理（L181-183）
   理由: 引当解放時のステータス更新
   問題（H-06以前）:
   - 引当を全解放しても、ステータスが "allocated" のまま
   → 「引当済み」と表示されるが、実際は未引当
   解決:
   - 全解放時: allocated/part_allocated → "open" に戻す
   → ステータスが実態を正しく反映
   業務影響:
   - 引当状況の可視化が正確に

9. なぜ SQL の update() を直接使うのか（L118-120, L186-188）
   理由: パフォーマンス最適化
   実装:
   - db.execute(update(OrderLine).where(...).values(...))
   → SQLAlchemy の ORM ではなく、SQL 直接実行
   メリット:
   - 1回のUPDATE文で完了（ORM よりも高速）
   - flush() や refresh() が不要
   使用場面:
   - ステータス更新のみの単純な処理

10. EPSILON の使用理由（L92, L137, L166-169）
    理由: 浮動小数点数の比較での精度問題回避
    問題:
    - 10.0 == 9.9999999999999 → False（誤差）
    → 実質的に同じ値でも、厳密な比較では不一致
    解決:
    - EPSILON = 1e-6（0.000001）の許容誤差
    - reserved_qty + EPSILON >= required_qty
    → 微小な誤差を許容
    業務影響:
    - 丸め誤差による引当判定ミスを防止
"""

from __future__ import annotations

from decimal import Decimal
from typing import cast

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.infrastructure.persistence.models import (
    Order,
    OrderLine,
    Product,
)
from app.infrastructure.persistence.models.lot_reservations_model import (
    LotReservation,
    ReservationSourceType,
    ReservationStatus,
)


def _load_order(db: Session, order_id: int) -> Order:
    """注文をIDで取得.

    Args:
        db: データベースセッション
        order_id: 注文ID

    Returns:
        Order: 注文エンティティ（子テーブル含む）

    Raises:
        ValueError: 注文が見つからない場合
    """
    stmt = (
        select(Order)
        .options(
            selectinload(Order.order_lines),
            selectinload(Order.order_lines).joinedload(OrderLine.product),
        )
        .where(Order.id == order_id)
    )

    order = cast(Order | None, db.execute(stmt).scalar_one_or_none())
    if not order:
        raise ValueError(f"Order not found: ID={order_id}")
    return order


def _existing_allocated_qty(line: OrderLine) -> float:
    """Calculate already allocated quantity for an order line.

    P3: Uses lot_reservations instead of allocations.
    """
    reservations = getattr(line, "_lot_reservations", []) or []
    return cast(
        float,
        sum(res.reserved_qty for res in reservations if res.status != ReservationStatus.RELEASED),
    )


def _resolve_next_div(db: Session, order: Order, line: OrderLine) -> tuple[str | None, str | None]:
    """Resolve next_div value and generate warning if missing."""
    product = getattr(line, "product", None)
    if product is None and getattr(line, "product_id", None):
        stmt = select(Product).where(Product.id == line.product_id)
        product = db.execute(stmt).scalar_one_or_none()
    if product is None:
        product_code = getattr(line, "product_code", None)
        if product_code:
            stmt = select(Product).where(Product.product_code == product_code)  # type: ignore[attr-defined]
            product = db.execute(stmt).scalar_one_or_none()
    next_div = getattr(product, "next_div", None) if product else None
    if next_div:
        return next_div, None

    product_code = getattr(line, "product_code", None)
    if not product_code and product:
        product_code = product.maker_part_code
    warning = f"次区が未設定: customer_id={order.customer_id}, product={product_code or 'unknown'}"
    return None, warning


def update_order_line_status(db: Session, order_line_id: int) -> None:
    """Update OrderLine status based on reservation completion.

    P3: Uses LotReservation instead of Allocation.

    Args:
        db: Database session
        order_line_id: Order line ID
    """
    EPSILON = Decimal("1e-6")

    # Calculate reserved quantity using SQL aggregation
    stmt = select(func.coalesce(func.sum(LotReservation.reserved_qty), 0.0)).where(
        LotReservation.source_type == ReservationSourceType.ORDER,
        LotReservation.source_id == order_line_id,
        LotReservation.status != ReservationStatus.RELEASED,
    )
    reserved_qty = Decimal(str(db.execute(stmt).scalar() or 0.0))

    # Load order line to update status
    line = db.get(OrderLine, order_line_id)
    if not line:
        return

    required_qty = Decimal(
        str(line.converted_quantity if line.converted_quantity else line.order_quantity or 0)
    )

    # Update line status based on reservation
    new_status = "pending"
    if reserved_qty + EPSILON >= required_qty:
        new_status = "allocated"
    elif reserved_qty > EPSILON:
        new_status = "pending"  # or part_allocated?

    from sqlalchemy import update

    db.execute(update(OrderLine).where(OrderLine.id == order_line_id).values(status=new_status))


def update_order_allocation_status(db: Session, order_id: int) -> None:
    """Update order status based on reservation completion.

    P3: Uses LotReservation instead of Allocation.

    H-06 Fix: ステータスの巻き戻しを正しく処理。
    - fully_allocated → allocated
    - 部分引当 → part_allocated（既存ステータスに関係なく）
    - 全解放 → open（allocated/part_allocatedから戻す）

    Args:
        db: Database session
        order_id: Order ID
    """
    EPSILON = 1e-6

    # 注文ステータス更新
    totals_stmt = (
        select(
            OrderLine.id,
            func.coalesce(func.sum(LotReservation.reserved_qty), 0.0),
            func.coalesce(OrderLine.converted_quantity, OrderLine.order_quantity),
        )
        .outerjoin(
            LotReservation,
            (LotReservation.source_type == ReservationSourceType.ORDER)
            & (LotReservation.source_id == OrderLine.id)
            & (LotReservation.status != ReservationStatus.RELEASED),
        )
        .where(OrderLine.order_id == order_id)
        .group_by(
            OrderLine.id,
            OrderLine.order_quantity,
            OrderLine.converted_quantity,
        )
    )
    totals = db.execute(totals_stmt).all()
    fully_allocated = True
    any_allocated = False

    for _, reserved_total, required_qty in totals:
        reserved_total = float(reserved_total)
        required_qty = float(required_qty or 0.0)
        if reserved_total > EPSILON:
            any_allocated = True
        if reserved_total + EPSILON < required_qty:
            fully_allocated = False

    # Get current status
    target_order = db.execute(select(Order.status).where(Order.id == order_id)).scalar_one()

    # H-06 Fix: 正しいステータス遷移ロジック
    new_status = None
    if fully_allocated and any_allocated:
        new_status = "allocated"
    elif any_allocated:
        # 部分引当: 既存ステータスに関係なく part_allocated に
        new_status = "part_allocated"
    elif not any_allocated and target_order in {"allocated", "part_allocated"}:
        # H-06 Fix: 全解放時は open に戻す
        new_status = "open"

    if new_status and new_status != target_order:
        from sqlalchemy import update

        db.execute(update(Order).where(Order.id == order_id).values(status=new_status))
