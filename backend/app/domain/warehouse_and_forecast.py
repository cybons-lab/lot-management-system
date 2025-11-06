# backend/app/domain/warehouse/__init__.py
"""
Warehouse Domain Layer
倉庫配分ロジック、倉庫間移動ルール
"""

from typing import Dict, List, Optional
from dataclasses import dataclass

from app.domain.errors import DomainError


class WarehouseDomainError(DomainError):
    """倉庫ドメイン層の基底例外"""

    default_code = "WAREHOUSE_ERROR"

    def __init__(self, message: str, code: str | None = None):
        super().__init__(message, code=code or self.default_code)


class WarehouseNotFoundError(WarehouseDomainError):
    """倉庫不在エラー"""
    def __init__(self, warehouse_code: str):
        message = f"Warehouse not found: {warehouse_code}"
        super().__init__(message, code="WAREHOUSE_NOT_FOUND")


class InvalidAllocationError(WarehouseDomainError):
    """不正な配分エラー"""
    def __init__(self, message: str):
        super().__init__(message, code="INVALID_ALLOCATION")


@dataclass
class WarehouseAllocation:
    """倉庫配分"""
    warehouse_code: str
    warehouse_name: str
    quantity: float
    lot_id: Optional[int] = None


class AllocationPolicy:
    """倉庫配分ポリシー"""
    
    @staticmethod
    def validate_total_quantity(
        allocations: List[WarehouseAllocation],
        required_quantity: float
    ) -> None:
        """
        配分合計が要求数量と一致するかチェック
        
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
    def validate_positive_quantities(
        allocations: List[WarehouseAllocation]
    ) -> None:
        """
        すべての配分数量が正であるかチェック
        
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
フォーキャストマッチングロジック、需要予測ルール
"""

from datetime import date


class ForecastDomainError(DomainError):
    """フォーキャストドメイン層の基底例外"""

    default_code = "FORECAST_ERROR"

    def __init__(self, message: str, code: str | None = None):
        super().__init__(message, code=code or self.default_code)


class ForecastNotFoundError(ForecastDomainError):
    """フォーキャスト不在エラー"""
    def __init__(self, product_code: str, month: str):
        message = f"Forecast not found: {product_code} for {month}"
        super().__init__(message, code="FORECAST_NOT_FOUND")


class InvalidForecastError(ForecastDomainError):
    """不正なフォーキャストエラー"""
    def __init__(self, message: str):
        super().__init__(message, code="INVALID_FORECAST")


@dataclass
class ForecastMatch:
    """フォーキャストマッチング結果"""
    forecast_id: int
    product_code: str
    month: str
    forecasted_demand: float
    match_confidence: float  # 0.0 ~ 1.0
    granularity: str  # "exact", "monthly", "quarterly"


class ForecastMatcher:
    """フォーキャストマッチングロジック"""
    
    @staticmethod
    def calculate_month_key(target_date: date) -> str:
        """
        日付から月キーを生成
        
        Args:
            target_date: 対象日付
            
        Returns:
            月キー（例: "2024-11"）
        """
        return target_date.strftime("%Y-%m")
    
    @staticmethod
    def calculate_match_confidence(
        order_date: date,
        forecast_month: str,
        granularity: str
    ) -> float:
        """
        マッチングの信頼度を計算
        
        Args:
            order_date: 受注日
            forecast_month: フォーキャスト月
            granularity: 粒度
            
        Returns:
            信頼度（0.0 ~ 1.0）
        """
        order_month = ForecastMatcher.calculate_month_key(order_date)
        
        if order_month == forecast_month:
            return 1.0  # 完全一致
        elif granularity == "monthly":
            return 0.8  # 月単位での近似
        elif granularity == "quarterly":
            return 0.6  # 四半期単位での近似
        else:
            return 0.3  # 弱い関連


class ForecastValidator:
    """フォーキャストバリデーター"""
    
    @staticmethod
    def validate_forecast_quantity(quantity: float) -> None:
        """
        フォーキャスト数量のバリデーション
        
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
    "ForecastMatcher",
    "ForecastValidator",
]
