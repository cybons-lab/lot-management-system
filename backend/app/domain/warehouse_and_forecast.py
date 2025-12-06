# backend/app/domain/warehouse/__init__.py
"""Warehouse Domain Layer 倉庫配分ロジック、倉庫間移動ルール."""

from dataclasses import dataclass
from datetime import date

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


# ========================================
# backend/app/domain/forecast/__init__.py
"""
Forecast Domain Layer
フォーキャストマッチングロジック、需要予測ルール.
"""


class ForecastDomainError(DomainError):
    """フォーキャストドメイン層の基底例外."""

    default_code = "FORECAST_ERROR"

    def __init__(self, message: str, code: str | None = None):
        super().__init__(message, code=code or self.default_code)


class ForecastNotFoundError(ForecastDomainError):
    """フォーキャスト不在エラー."""

    def __init__(self, product_code: str, month: str):
        message = f"Forecast not found: {product_code} for {month}"
        super().__init__(message, code="FORECAST_NOT_FOUND")


class InvalidForecastError(ForecastDomainError):
    """不正なフォーキャストエラー."""

    def __init__(self, message: str):
        super().__init__(message, code="INVALID_FORECAST")


@dataclass
class ForecastMatch:
    """フォーキャストマッチング結果 (v2.4 schema).

    v2.4では粒度(granularity)は廃止され、forecast_dateで直接日付マッチングを行う。
    """

    forecast_id: int
    customer_id: int
    delivery_place_id: int
    product_id: int
    forecast_date: date
    forecast_quantity: float
    match_confidence: float  # 0.0 ~ 1.0


class ForecastDomainService:
    """フォーキャストマッチングロジック (v2.4 schema)."""

    @staticmethod
    def calculate_date_key(target_date: date) -> str:
        """日付からキーを生成.

        Args:
            target_date: 対象日付

        Returns:
            日付キー（例: "2024-11-19"）
        """
        return target_date.strftime("%Y-%m-%d")

    @staticmethod
    def calculate_match_confidence(order_date: date, forecast_date: date) -> float:
        """マッチングの信頼度を計算.

        Args:
            order_date: 受注日
            forecast_date: フォーキャスト日

        Returns:
            信頼度（0.0 ~ 1.0）
        """
        if order_date == forecast_date:
            return 1.0  # 完全一致

        # 日数差に基づく信頼度計算
        diff_days = abs((order_date - forecast_date).days)
        if diff_days <= 3:
            return 0.9  # 3日以内
        elif diff_days <= 7:
            return 0.7  # 1週間以内
        elif diff_days <= 30:
            return 0.5  # 1ヶ月以内
        else:
            return 0.2  # それ以上


class ForecastValidator:
    """フォーキャストバリデーター."""

    @staticmethod
    def validate_forecast_quantity(quantity: float) -> None:
        """フォーキャスト数量のバリデーション.

        Args:
            quantity: 数量

        Raises:
            InvalidForecastError: 負の数量の場合
        """
        if quantity < 0:
            raise InvalidForecastError(f"Forecast quantity cannot be negative: {quantity}")


__all__ = [
    "ForecastDomainError",
    "ForecastNotFoundError",
    "InvalidForecastError",
    "ForecastMatch",
    "ForecastDomainService",
    "ForecastValidator",
]
