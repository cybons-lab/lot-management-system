from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date

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


class AllocationCommitError(RuntimeError):
    """Raised when FEFO allocation cannot be committed."""


class AllocationNotFoundError(Exception):
    """Raised when the specified allocation is not found in DB."""

    pass
