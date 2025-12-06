# backend/app/repositories/stock_repository.py
"""Repository helpers for stock validation and FIFO lot retrieval."""

from __future__ import annotations

from collections.abc import Sequence
from datetime import date

from sqlalchemy import Select, or_, select
from sqlalchemy.orm import Session

from app.models import Lot


class StockRepository:
    """Stock access helpers dedicated to order validation use cases."""

    def __init__(self, db: Session):
        self._db = db

    def find_fifo_lots_for_allocation(
        self,
        product_id: int,
        warehouse_id: int,
        ship_date: date | None,
        for_update: bool = True,
    ) -> list[Lot]:
        """Fetch candidate lots in FIFO order with optional row locking.

        v2.2: Updated to use product_id and warehouse_id (DDL compliant).
        Removed joinedload(Lot.current_stock) - no longer needed.

        Args:
            product_id: Product ID (not product_code)
            warehouse_id: Warehouse ID (not warehouse_code)
            ship_date: Optional ship date for expiry filtering
            for_update: Whether to lock rows for update

        Returns:
            List of candidate lots in FIFO order
        """
        stmt: Select[tuple[Lot]] = (
            select(Lot)
            .where(Lot.product_id == product_id)
            .where(Lot.warehouse_id == warehouse_id)
            .where(Lot.status == "active")  # DDL v2.2 compliant
        )

        # Filter by expiry date if ship_date is provided
        if ship_date is not None:
            stmt = stmt.where(or_(Lot.expiry_date.is_(None), Lot.expiry_date >= ship_date))

        # Order by received_date (FIFO) - DDL v2.2 uses received_date
        stmt = stmt.order_by(Lot.received_date.asc(), Lot.id.asc())

        # Row locking for PostgreSQL/MySQL
        bind = self._db.get_bind()
        dialect_name = bind.dialect.name if bind is not None else ""
        if for_update and dialect_name in {"postgresql", "mysql"}:
            stmt = stmt.with_for_update(skip_locked=True, of=Lot)

        result: Sequence[Lot] = self._db.execute(stmt).scalars().all()
        return list(result)

    @staticmethod
    def calc_available_qty(lot: Lot) -> int:
        """Calculate allocatable quantity for a lot.

        v2.2: Use Lot model directly - current_quantity - allocated_quantity.
        """
        current_qty = float(getattr(lot, "current_quantity", 0) or 0)
        allocated_qty = float(getattr(lot, "allocated_quantity", 0) or 0)

        available = current_qty - allocated_qty
        return max(0, int(round(available)))
