# backend/app/domain/allocation/__init__.py
"""
Allocation Domain Layer
"""

from .exceptions import (
    AlreadyAllocatedError,
    ConflictError,
    DomainError,
    InsufficientStockError,
    InvalidTransitionError,
    NotFoundError,
    ValidationError,
)
from .rounding import RoundingMode, RoundingPolicy
from .state_machine import AllocationStateMachine, AllocationStatus

__all__ = [
    # Exceptions
    "DomainError",
    "ValidationError",
    "NotFoundError",
    "ConflictError",
    "InvalidTransitionError",
    "InsufficientStockError",
    "AlreadyAllocatedError",
    # Rounding
    "RoundingPolicy",
    "RoundingMode",
    # State Machine
    "AllocationStateMachine",
    "AllocationStatus",
]
