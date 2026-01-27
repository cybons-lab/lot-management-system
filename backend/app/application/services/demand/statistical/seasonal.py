from datetime import date
from decimal import Decimal

from app.application.services.demand.estimator import DemandEstimator, DemandForecast


class SeasonalEstimator(DemandEstimator):
    """季節係数を適用するラッパー予測器。."""

    def __init__(self, base_estimator: DemandEstimator):
        self.base_estimator = base_estimator

    def estimate(
        self,
        product_group_id: int,
        warehouse_id: int | None,
        horizon_days: int,
        as_of_date: date,
    ) -> DemandForecast:
        # まずベース予測（移動平均など）を実行
        base_forecast = self.base_estimator.estimate(
            product_group_id, warehouse_id, horizon_days, as_of_date
        )

        # 季節係数を適用 (簡易実装: 月ごとの係数辞書を使用)
        # 本来はDBから取得したり、過去データから計算するが、今回はシナリオにあるパターンのみ対応

        # 簡易的な季節係数ロジック:
        # 6-8月: 1.5倍 (Somer Peak)
        # 11-1月: 1.5倍 (Winter Peak)
        # それ以外: 1.0倍
        # ※本来はProductごとに設定を持つべきだが、Phase Bではハードコードまたは簡易ロジック

        # 今回はベース予測の結果をそのまま調整する形にする
        adjusted_forecasts = []
        total_adjusted = Decimal("0")

        for daily in base_forecast.daily_forecasts:
            month = daily.date.month
            factor = Decimal("1.0")

            # TODO: 製品ごとの季節性フラグを見るべきだが、一旦全適用または設定で制御
            # ここでは「夏ピーク」「冬ピーク」の両方を考慮した汎用的な係数を入れる（デモ用）
            if month in [6, 7, 8]:
                factor = Decimal("1.2")  # 夏は少し増える
            elif month in [11, 12, 1]:
                factor = Decimal("1.2")  # 冬も少し増える

            new_qty = daily.quantity * factor
            daily.quantity = new_qty
            daily.notes = (daily.notes or "") + f" * Seasonal({factor})"
            adjusted_forecasts.append(daily)
            total_adjusted += new_qty

        # 集計値を更新
        base_forecast.total = total_adjusted
        base_forecast.avg_daily = (
            total_adjusted / horizon_days if horizon_days > 0 else Decimal("0")
        )
        base_forecast.method = f"{base_forecast.method}+seasonal"
        base_forecast.daily_forecasts = adjusted_forecasts

        if base_forecast.details:
            base_forecast.details["seasonal_applied"] = True

        return base_forecast
