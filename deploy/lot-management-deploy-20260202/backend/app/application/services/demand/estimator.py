from dataclasses import dataclass, field
from datetime import date
from decimal import Decimal
from typing import Protocol


@dataclass
class DailyForecast:
    """日次需要予測."""

    date: date
    quantity: Decimal
    is_holiday: bool = False
    notes: str | None = None


@dataclass
class DemandForecast:
    """需要予測結果."""

    supplier_item_id: int
    warehouse_id: int | None
    as_of_date: date
    horizon_days: int

    # 予測値
    total: Decimal  # 期間合計
    avg_daily: Decimal  # 日平均
    std_daily: Decimal  # 日標準偏差
    # メタ情報
    method: str  # 使用した手法
    confidence: float  # 信頼度（0-1）
    data_points_used: int  # 使用したデータ点数

    daily_forecasts: list[DailyForecast] = field(default_factory=list)  # 日別予測（オプション）

    # 説明情報（簡易版）
    details: dict | None = None


class DemandEstimator(Protocol):
    """需要予測器の共通インターフェース."""

    def estimate(
        self,
        supplier_item_id: int,
        warehouse_id: int | None,
        horizon_days: int,
        as_of_date: date,
    ) -> DemandForecast:
        """指定期間の需要を予測."""
        ...
