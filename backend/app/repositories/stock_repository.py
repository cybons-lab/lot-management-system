# backend/app/repositories/stock_repository.py
"""Repository helpers for stock validation and FIFO lot retrieval."""

from __future__ import annotations

from datetime import date
from typing import Sequence

from sqlalchemy import Select, or_, select
from sqlalchemy.orm import Session, joinedload

from app.models import Lot, LotCurrentStock, Warehouse


class StockRepository:
    """Stock access helpers dedicated to order validation use cases."""

    def __init__(self, db: Session):
        self._db = db

    def find_fifo_lots_for_allocation(
        self,
        product_code: str,
        warehouse_code: str,
        ship_date: date | None,
        for_update: bool = True,
    ) -> list[Lot]:
        """Fetch candidate lots in FIFO order with optional row locking."""

        stmt: Select[tuple[Lot]] = (
            select(Lot)
            .join(Lot.warehouse)
            .options(joinedload(Lot.current_stock))
            .where(Lot.product_code == product_code)
            .where(Warehouse.warehouse_code == warehouse_code)
        )

        if hasattr(Lot, "is_active"):
            stmt = stmt.where(getattr(Lot, "is_active") == True)  # noqa: E712

        if hasattr(Lot, "is_locked"):
            stmt = stmt.where(getattr(Lot, "is_locked") == False)  # noqa: E712

        expiry_column = getattr(Lot, "expiry_date", None)
        if ship_date is not None and expiry_column is not None:
            stmt = stmt.where(or_(expiry_column.is_(None), expiry_column >= ship_date))

        received_column = getattr(Lot, "receipt_date", None) or getattr(
            Lot, "received_at", None
        )
        if received_column is not None:
            stmt = stmt.order_by(received_column.asc(), Lot.id.asc())
        else:
            stmt = stmt.order_by(Lot.id.asc())

        bind = self._db.get_bind()
        dialect_name = bind.dialect.name if bind is not None else ""
        if for_update and dialect_name in {"postgresql", "mysql"}:
            stmt = stmt.with_for_update(skip_locked=True, of=Lot)

        result: Sequence[Lot] = self._db.execute(stmt).scalars().all()
        return list(result)

    @staticmethod
    def calc_available_qty(lot: Lot) -> int:
        """Calculate allocatable quantity for a lot."""

        stock: LotCurrentStock | None = lot.current_stock
        if stock is None:
            return 0

        on_hand = getattr(stock, "on_hand_qty", None)
        if on_hand is None:
            on_hand = getattr(stock, "current_quantity", None)

        allocated = getattr(stock, "allocated_qty", None)
        picked = getattr(stock, "picked_qty", None)

        on_hand_value = float(on_hand or 0)
        allocated_value = float(allocated or 0)
        picked_value = float(picked or 0)

        available = on_hand_value - (allocated_value + picked_value)
        return max(0, int(round(available)))
