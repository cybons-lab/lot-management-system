import statistics
from datetime import date, timedelta
from decimal import Decimal

from app.application.services.demand.estimator import (
    DailyForecast,
    DemandEstimator,
    DemandForecast,
)
from app.application.services.demand.repository import DemandRepository


class MovingAverageEstimator(DemandEstimator):
    """単純移動平均による需要予測。."""

    def __init__(self, repository: DemandRepository, window_days: int = 30):
        self.repository = repository
        self.window_days = window_days

    def estimate(
        self,
        supplier_item_id: int,
        warehouse_id: int | None,
        horizon_days: int,
        as_of_date: date,
    ) -> DemandForecast:
        # 過去N日の需要実績を取得
        # 需要としてカウントする出庫タイプ (D8: RETURNは除外)
        # R1: ORDER_AUTO + ORDER_MANUAL
        # D7: 欠品需要は別途考慮が必要だが、現状のWithdrawalモデルには欠品数量がないため
        #     一旦出庫実績のみとする（将来的にUnfulfilledOrder等を加算する必要あり）
        #     ※今回のスコープでは「出庫実績」をベースにする
        demand_types = ["order_auto", "order_manual"]

        history = self.repository.get_demand_history(
            supplier_item_id=supplier_item_id,
            warehouse_id=warehouse_id,
            start_date=as_of_date - timedelta(days=self.window_days),
            end_date=as_of_date,
            demand_types=demand_types,
        )

        # 日次需要を集計 (実績がない日は0)
        daily_demands: list[Decimal] = []
        history_dict = {d: q for d, q in history}

        # ウインドウ期間の全日付についてループ
        points_used = 0
        current_date = as_of_date - timedelta(days=self.window_days)
        while current_date < as_of_date:  # as_of_date当日を含めない（前日まで）
            qty = history_dict.get(current_date, Decimal("0"))
            daily_demands.append(qty)
            if qty > 0:
                points_used += 1
            current_date += timedelta(days=1)

        # 平均・標準偏差を計算
        if not daily_demands:
            avg_daily = Decimal("0")
            std_daily = Decimal("0")
        else:
            avg_daily = Decimal(statistics.mean(daily_demands))
            std_daily = (
                Decimal(statistics.stdev(daily_demands)) if len(daily_demands) > 1 else Decimal("0")
            )

        # 予測生成
        daily_forecasts: list[DailyForecast] = []
        total_forecast = Decimal("0")

        for i in range(horizon_days):
            forecast_date = as_of_date + timedelta(days=i)
            # 単純移動平均なので毎日同じ値
            daily_forecasts.append(
                DailyForecast(
                    date=forecast_date, quantity=avg_daily, notes=f"MA({self.window_days})"
                )
            )
            total_forecast += avg_daily

        return DemandForecast(
            supplier_item_id=supplier_item_id,
            warehouse_id=warehouse_id,
            as_of_date=as_of_date,
            horizon_days=horizon_days,
            total=total_forecast,
            avg_daily=avg_daily,
            std_daily=std_daily,
            daily_forecasts=daily_forecasts,
            method="moving_average",
            confidence=0.5 if points_used < 10 else 0.8,  # 簡易的な信頼度
            data_points_used=points_used,
            details={
                "window_days": self.window_days,
                "history_start": (as_of_date - timedelta(days=self.window_days)).isoformat(),
                "history_end": as_of_date.isoformat(),
            },
        )
