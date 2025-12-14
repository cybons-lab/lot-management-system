"""Auto-reservation operations.

Handles FEFO-based automatic allocation:
- Single line auto-reservation
- Bulk auto-reservation with filtering

P3: Uses LotReservation exclusively.
"""

from __future__ import annotations

from decimal import Decimal
from typing import Any

from sqlalchemy.orm import Session

from app.application.services.allocations.manual import create_manual_reservation
from app.application.services.inventory.stock_calculation import get_available_quantity
from app.infrastructure.persistence.models import Lot, Order, OrderLine
from app.infrastructure.persistence.models.lot_reservations_model import (
    LotReservation,
    ReservationSourceType,
    ReservationStatus,
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

    created_reservations: list[LotReservation] = []
    remaining_qty = required_qty

    for lot in candidate_lots:
        if remaining_qty <= 0:
            break

        available = get_available_quantity(db, lot)
        if available <= 0:
            continue

        reserve_qty = min(available, remaining_qty)

        reservation = create_manual_reservation(
            db,
            order_line_id=order_line_id,
            lot_id=lot.id,
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

    created_reservations: list[LotReservation] = []
    remaining_qty = required_qty

    for lot in candidate_lots:
        if remaining_qty <= 0:
            break

        available = get_available_quantity(db, lot)
        if available <= 0:
            continue

        reserve_qty = min(available, remaining_qty)

        reservation = create_manual_reservation(
            db,
            order_line_id=order_line_id,
            lot_id=lot.id,
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


# Backward compatibility aliases
auto_allocate_line = auto_reserve_line
_auto_allocate_line_no_commit = _auto_reserve_line_no_commit
auto_allocate_bulk = auto_reserve_bulk
