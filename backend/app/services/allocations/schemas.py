from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date

from app.domain.errors import DomainError
from app.models import Allocation


@dataclass
class FefoLotPlan:
    lot_id: int
    allocate_qty: float
    expiry_date: date | None
    receipt_date: date | None
    lot_number: str


@dataclass
class FefoLinePlan:
    order_line_id: int
    product_id: int | None
    product_code: str
    warehouse_id: int | None
    warehouse_code: str | None
    required_qty: float
    already_allocated_qty: float
    allocations: list[FefoLotPlan] = field(default_factory=list)
    next_div: str | None = None
    warnings: list[str] = field(default_factory=list)


@dataclass
class FefoPreviewResult:
    order_id: int
    lines: list[FefoLinePlan]
    warnings: list[str] = field(default_factory=list)


@dataclass
class FefoCommitResult:
    preview: FefoPreviewResult
    created_allocations: list[Allocation]


class AllocationCommitError(DomainError):
    """Raised when FEFO allocation cannot be committed."""

    def __init__(self, error_code_or_message: str, message: str | None = None):
        """Initialize with error code and optional message.

        Args:
            error_code_or_message: Error code (e.g., 'ALREADY_CONFIRMED') or message if only one arg
            message: Human-readable error message (optional, for new-style calls)

        Note:
            For backward compatibility, if only one argument is provided,
            it is treated as both error_code and message.
        """
        if message is None:
            # Backward compatible: single argument is both error_code and message
            self.error_code = "COMMIT_ERROR"
            self.message = error_code_or_message
        else:
            # New style: error_code + message
            self.error_code = error_code_or_message
            self.message = message
        super().__init__(self.message)


class AllocationNotFoundError(DomainError):
    """Raised when the specified allocation is not found in DB."""

    pass


class InsufficientStockError(DomainError):
    """Raised when there is not enough stock to confirm allocation.

    Attributes:
        lot_id: Lot ID with insufficient stock
        lot_number: Lot number for display
        required: Required quantity
        available: Available quantity
    """

    def __init__(
        self, lot_id: int, lot_number: str, required: float, available: float
    ):
        self.lot_id = lot_id
        self.lot_number = lot_number
        self.required = required
        self.available = available
        message = (
            f"ロット {self.lot_number} の在庫が不足しています "
            f"(必要: {self.required}, 利用可能: {self.available})"
        )
        super().__init__(message)

