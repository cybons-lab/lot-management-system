from datetime import date, timedelta
from decimal import Decimal

from app.application.services.demand.estimator import (
    DailyForecast,
    DemandEstimator,
    DemandForecast,
)
from app.application.services.demand.repository import DemandRepository


class EWMAEstimator(DemandEstimator):
    """指数平滑移動平均 (EWMA) による需要予測。."""

    def __init__(self, repository: DemandRepository, alpha: float = 0.3, lookback_days: int = 90):
        self.repository = repository
        self.alpha = Decimal(str(alpha))
        self.lookback_days = lookback_days

    def estimate(
        self,
        product_id: int,
        warehouse_id: int | None,
        horizon_days: int,
        as_of_date: date,
    ) -> DemandForecast:
        # 十分な履歴データを取得 (lookback_days分)
        demand_types = ["order_auto", "order_manual"]
        start_date = as_of_date - timedelta(days=self.lookback_days)
        end_date = as_of_date

        history = self.repository.get_demand_history(
            product_id=product_id,
            warehouse_id=warehouse_id,
            start_date=start_date,
            end_date=end_date,
            demand_types=demand_types,
        )

        history_dict = {d: q for d, q in history}

        # EWMA計算
        # 初期値は最初の観測値、なければ0
        # S_t = alpha * Y_t + (1 - alpha) * S_{t-1}

        ewma = Decimal("0")
        has_initialized = False
        points_used = 0

        current_date = start_date
        while current_date < as_of_date:
            qty = history_dict.get(current_date, Decimal("0"))

            if qty > 0:
                points_used += 1

            if not has_initialized:
                if qty > 0:
                    ewma = qty
                    has_initialized = True
            else:
                ewma = self.alpha * qty + (Decimal("1") - self.alpha) * ewma

            current_date += timedelta(days=1)

        # 予測生成
        daily_forecasts: list[DailyForecast] = []
        total_forecast = Decimal("0")

        # 簡易的な予測標準偏差 (固定値または履歴分散から計算だが、ここでは簡易的に設定)
        # EWMA自体の分散近似: sigma / sqrt(2/alpha - 1) などを本来使う
        std_daily = Decimal("0")
        if points_used > 5:
            # 直近の誤差分散などから計算すべきだが簡略化
            std_daily = ewma * Decimal("0.2")

        for i in range(horizon_days):
            forecast_date = as_of_date + timedelta(days=i)
            # EWMAの将来予測は一定値（トレンドなしモデルの場合）
            daily_forecasts.append(
                DailyForecast(date=forecast_date, quantity=ewma, notes=f"EWMA(alpha={self.alpha})")
            )
            total_forecast += ewma

        return DemandForecast(
            product_id=product_id,
            warehouse_id=warehouse_id,
            as_of_date=as_of_date,
            horizon_days=horizon_days,
            total=total_forecast,
            avg_daily=ewma,
            std_daily=std_daily,
            daily_forecasts=daily_forecasts,
            method="ewma",
            confidence=0.6 if points_used < 10 else 0.85,
            data_points_used=points_used,
            details={
                "alpha": float(self.alpha),
                "lookback_days": self.lookback_days,
                "final_smoothed_value": float(ewma),
            },
        )
