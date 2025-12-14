# backend/app/domain/allocation/exceptions.py
"""引当ドメインの例外定義."""

# Re-export consolidated InsufficientStockError for backward compatibility
from app.domain.errors import (
    DomainError,
    InsufficientStockError,  # noqa: F401
)


class ValidationError(DomainError):
    """バリデーションエラー."""

    def __init__(self, message: str):
        super().__init__(message, code="VALIDATION_ERROR")


class NotFoundError(DomainError):
    """リソース不在エラー."""

    def __init__(self, resource: str, identifier: str | int):
        message = f"{resource} not found: {identifier}"
        super().__init__(message, code="NOT_FOUND")


class ConflictError(DomainError):
    """競合エラー."""

    def __init__(self, message: str):
        super().__init__(message, code="CONFLICT")


class InvalidTransitionError(DomainError):
    """不正な状態遷移エラー."""

    def __init__(self, from_state: str, to_state: str):
        message = f"Invalid transition: {from_state} -> {to_state}"
        super().__init__(message, code="INVALID_TRANSITION")


class AlreadyAllocatedError(DomainError):
    """既に引当済みエラー."""

    def __init__(self, allocation_id: int):
        message = f"Allocation {allocation_id} is already processed"
        super().__init__(message, code="ALREADY_ALLOCATED")
