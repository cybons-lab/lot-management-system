"""Domain-level shared exception definitions."""

from __future__ import annotations

from dataclasses import dataclass


class DomainError(Exception):
    """Base exception for all domain-specific errors."""

    default_code = "DOMAIN_ERROR"

    def __init__(self, message: str, code: str | None = None):
        self.message = message
        self.code = code or self.default_code
        super().__init__(self.message)


@dataclass(slots=True)
class InsufficientStockError(DomainError):
    """Raised when the available stock cannot satisfy the required quantity."""

    product_code: str
    required: int
    available: int
    details: dict

    default_code = "INSUFFICIENT_STOCK"

    def __post_init__(self) -> None:  # pragma: no cover - trivial
        message = (
            f"Insufficient stock for {self.product_code}: "
            f"required={self.required}, available={self.available}"
        )
        DomainError.__init__(self, message, code=self.default_code)
