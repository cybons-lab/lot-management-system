"""Auto-allocation operations.

Handles FEFO-based automatic allocation:
- Single line auto-allocation
- Bulk auto-allocation with filtering
"""

from __future__ import annotations

from decimal import Decimal
from typing import Any

from sqlalchemy.orm import Session

from app.application.services.allocations.manual import allocate_manually
from app.application.services.inventory.stock_calculation import get_available_quantity
from app.infrastructure.persistence.models import Allocation, Lot, Order, OrderLine


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
    line = db.query(OrderLine).filter(OrderLine.id == order_line_id).first()
    if not line:
        raise ValueError(f"OrderLine {order_line_id} not found")

    existing_allocations = (
        db.query(Allocation)
        .filter(Allocation.order_line_id == order_line_id, Allocation.status == "allocated")
        .all()
    )
    already_allocated = sum(a.allocated_quantity for a in existing_allocations)

    required_qty = Decimal(str(line.order_quantity)) - already_allocated
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

    created_allocations: list[Allocation] = []
    remaining_qty = required_qty

    for lot in candidate_lots:
        if remaining_qty <= 0:
            break

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
        "allocated_lines": 0,
        "total_allocations": 0,
        "skipped_lines": 0,
        "failed_lines": [],
    }

    for line in order_lines:
        result["processed_lines"] += 1

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

        if required_qty <= 0 and skip_already_allocated:
            result["skipped_lines"] += 1
            continue

        try:
            allocations = _auto_allocate_line_no_commit(db, line.id, required_qty)
            if allocations:
                result["allocated_lines"] += 1
                result["total_allocations"] += len(allocations)
        except Exception as e:
            result["failed_lines"].append({"line_id": line.id, "error": str(e)})

    if result["total_allocations"] > 0:
        db.commit()

    return result
