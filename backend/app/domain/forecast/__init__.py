"""
Forecast Domain Layer
フォーキャストマッチングロジック、需要予測ルール.
"""

from dataclasses import dataclass
from datetime import date

from app.domain.errors import DomainError


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
