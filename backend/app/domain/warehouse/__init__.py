"""Warehouse Domain Layer 倉庫配分ロジック、倉庫間移動ルール."""

from dataclasses import dataclass

from app.domain.errors import DomainError


class WarehouseDomainError(DomainError):
    """倉庫ドメイン層の基底例外."""

    default_code = "WAREHOUSE_ERROR"

    def __init__(self, message: str, code: str | None = None):
        super().__init__(message, code=code or self.default_code)


class WarehouseNotFoundError(WarehouseDomainError):
    """倉庫不在エラー."""

    def __init__(self, warehouse_code: str):
        message = f"Warehouse not found: {warehouse_code}"
        super().__init__(message, code="WAREHOUSE_NOT_FOUND")


class InvalidAllocationError(WarehouseDomainError):
    """不正な配分エラー."""

    def __init__(self, message: str):
        super().__init__(message, code="INVALID_ALLOCATION")


@dataclass
class WarehouseAllocation:
    """倉庫配分."""

    warehouse_code: str
    warehouse_name: str
    quantity: float
    lot_id: int | None = None


class AllocationPolicy:
    """倉庫配分ポリシー."""

    @staticmethod
    def validate_total_quantity(
        allocations: list[WarehouseAllocation], required_quantity: float
    ) -> None:
        """配分合計が要求数量と一致するかチェック.

        Args:
            allocations: 倉庫配分のリスト
            required_quantity: 要求数量

        Raises:
            InvalidAllocationError: 合計が一致しない場合
        """
        total = sum(alloc.quantity for alloc in allocations)
        if abs(total - required_quantity) > 0.01:  # 浮動小数点誤差を考慮
            raise InvalidAllocationError(
                f"Allocation total {total} does not match required {required_quantity}"
            )

    @staticmethod
    def validate_positive_quantities(allocations: list[WarehouseAllocation]) -> None:
        """すべての配分数量が正であるかチェック.

        Args:
            allocations: 倉庫配分のリスト

        Raises:
            InvalidAllocationError: 負または0の数量がある場合
        """
        for alloc in allocations:
            if alloc.quantity <= 0:
                raise InvalidAllocationError(
                    f"Allocation quantity must be positive: {alloc.warehouse_code}={alloc.quantity}"
                )


__all__ = [
    "WarehouseDomainError",
    "WarehouseNotFoundError",
    "InvalidAllocationError",
    "WarehouseAllocation",
    "AllocationPolicy",
]
