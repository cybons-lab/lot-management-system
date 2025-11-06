# backend/app/domain/allocation/exceptions.py
"""引当ドメインの例外定義."""

from app.domain.errors import DomainError


class ValidationError(DomainError):
    """バリデーションエラー"""
    def __init__(self, message: str):
        super().__init__(message, code="VALIDATION_ERROR")


class NotFoundError(DomainError):
    """リソース不在エラー"""
    def __init__(self, resource: str, identifier: str | int):
        message = f"{resource} not found: {identifier}"
        super().__init__(message, code="NOT_FOUND")


class ConflictError(DomainError):
    """競合エラー"""
    def __init__(self, message: str):
        super().__init__(message, code="CONFLICT")


class InvalidTransitionError(DomainError):
    """不正な状態遷移エラー"""
    def __init__(self, from_state: str, to_state: str):
        message = f"Invalid transition: {from_state} -> {to_state}"
        super().__init__(message, code="INVALID_TRANSITION")


class InsufficientStockError(DomainError):
    """在庫不足エラー"""
    def __init__(self, lot_id: int, required: float, available: float):
        message = f"Insufficient stock for lot {lot_id}: required={required}, available={available}"
        super().__init__(message, code="INSUFFICIENT_STOCK")
        self.lot_id = lot_id
        self.required = required
        self.available = available


class AlreadyAllocatedError(DomainError):
    """既に引当済みエラー"""
    def __init__(self, allocation_id: int):
        message = f"Allocation {allocation_id} is already processed"
        super().__init__(message, code="ALREADY_ALLOCATED")
