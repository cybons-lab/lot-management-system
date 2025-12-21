# backend/app/domain/allocation/__init__.py
"""Allocation Domain Layer."""

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
    LotCandidate,
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
