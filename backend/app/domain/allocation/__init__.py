# backend/app/domain/allocation/__init__.py
"""Allocation Domain Layer."""

from app.domain.lot import LotCandidate

from .calculator import calculate_allocation
from .exceptions import (
    AlreadyAllocatedError,
    ConflictError,
    InsufficientStockError,
    InvalidTransitionError,
    NotFoundError,
    ValidationError,
)
from .rounding import RoundingMode, RoundingPolicy
from .types import (
    AllocationDecision,
    AllocationRequest,
    AllocationResult,
)


__all__ = [
    # Exceptions
    "ValidationError",
    "NotFoundError",
    "ConflictError",
    "InvalidTransitionError",
    "InsufficientStockError",
    "AlreadyAllocatedError",
    # Rounding
    "RoundingPolicy",
    "RoundingMode",
    # Allocation Calculator
    "calculate_allocation",
    "LotCandidate",
    "AllocationRequest",
    "AllocationDecision",
    "AllocationResult",
]
