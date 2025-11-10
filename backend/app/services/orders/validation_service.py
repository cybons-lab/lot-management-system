# backend/app/services/orders/validation.py
"""Order validation service for inventory availability checks."""

from __future__ import annotations

from collections.abc import Iterable
from dataclasses import dataclass
from datetime import date

from sqlalchemy.orm import Session

from app.domain.errors import InsufficientStockError
from app.repositories.stock_repository import StockRepository


@dataclass(frozen=True, slots=True)
class OrderLineDemand:
    """Value object expressing the demand of an order line."""

    product_code: str
    warehouse_code: str
    quantity: int

    def __post_init__(self) -> None:
        if self.quantity < 1:
            raise ValueError("quantity must be greater than or equal to 1")
        object.__setattr__(self, "quantity", int(self.quantity))


@dataclass(frozen=True)
class ValidationResult:
    """Result of order validation."""

    ok: bool
    message: str
    error_data: dict | None = None


class OrderValidationService:
    """Service coordinating stock validation for order requests."""

    def __init__(self, db: Session, stock_repository: StockRepository | None = None):
        self._db = db
        self._stock_repo = stock_repository or StockRepository(db)

    @classmethod
    def validate(
        cls,
        db: Session,
        demands: Iterable[OrderLineDemand],
        date: date | None = None,
    ) -> ValidationResult:
        """
        Validate order demands against available stock (facade method).

        Args:
            db: Database session.
            demands: Iterable of order line demands.
            date: Ship date for expiry filtering.

        Returns:
            ValidationResult with ok=True if all lines valid,
            ok=False with error details if insufficient stock.
        """
        service = cls(db)
        try:
            service.validate_lines(lines=demands, ship_date=date, lock=False)
            return ValidationResult(
                ok=True,
                message="すべての受注明細が在庫充足可能です。",
                error_data=None,
            )
        except InsufficientStockError as e:
            # Return domain error details as plain dict
            details_raw = e.details or {}

            return ValidationResult(
                ok=False,
                message=f"在庫不足: {e.product_code}",
                error_data={
                    "product_code": e.product_code,
                    "required": e.required,
                    "available": e.available,
                    "details": details_raw,
                },
            )

    def validate_lines(
        self,
        lines: Iterable[OrderLineDemand],
        ship_date: date | None = None,
        lock: bool = True,
    ) -> None:
        """Validate that all demanded lines can be fulfilled by inventory."""
        for line in lines:
            lots = self._stock_repo.find_fifo_lots_for_allocation(
                product_code=line.product_code,
                warehouse_code=line.warehouse_code,
                ship_date=ship_date,
                for_update=lock,
            )

            remaining = line.quantity
            available_total = 0
            per_lot_details: list[dict[str, int]] = []

            for lot in lots:
                available_qty = self._stock_repo.calc_available_qty(lot)
                if available_qty <= 0:
                    continue

                available_total += available_qty
                per_lot_details.append({"lot_id": lot.id, "available": available_qty})

                remaining -= available_qty
                if remaining <= 0:
                    break

            if remaining > 0:
                raise InsufficientStockError(
                    product_code=line.product_code,
                    required=line.quantity,
                    available=available_total,
                    details={
                        "warehouse_code": line.warehouse_code,
                        "per_lot": per_lot_details,
                        "ship_date": ship_date.isoformat() if ship_date else None,
                    },
                )
