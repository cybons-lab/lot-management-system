from datetime import date
from decimal import Decimal

from app.application.services.demand.estimator import DemandEstimator, DemandForecast


class OutlierHandler(DemandEstimator):
    """外れ値処理（Winsorizing）を行うラッパー予測器。."""

    def __init__(self, base_estimator: DemandEstimator, percentile: float = 0.95):
        self.base_estimator = base_estimator
        self.percentile = percentile

    def estimate(
        self,
        product_id: int,
        warehouse_id: int | None,
        horizon_days: int,
        as_of_date: date,
    ) -> DemandForecast:
        # ベース予測を実行
        base_forecast = self.base_estimator.estimate(
            product_id, warehouse_id, horizon_days, as_of_date
        )

        # 予測値自体に対するWinsorize（異常に高い予測が出た場合のキャップ）
        # ※本来は「入力データ」のWinsorizeを行うべきだが、Estimatorのインターフェース上
        #   内部でRepositoryを呼んでいるため、ここでは「出力結果」の暴走を止めるガードとして実装
        #   もしくは、入力データのWinsorizeはこのクラスの前段で行うべき。

        # 簡易実装: 日次予測値のリストを見て、極端な値を丸める
        quantities = [d.quantity for d in base_forecast.daily_forecasts]
        if not quantities:
            return base_forecast

        # 上限閾値を計算 (平均 + 3シグマ 相当、またはパーセンタイル)
        # 予測値なので未来の値。ここでは極端なスパイク（例えば他手法のバグや異常値）を抑制
        # 平均の3倍をキャップとする簡易ロジック
        if base_forecast.avg_daily > 0:
            cap = base_forecast.avg_daily * Decimal("3.0")

            adjusted_forecasts = []
            total_adjusted = Decimal("0")

            for daily in base_forecast.daily_forecasts:
                if daily.quantity > cap:
                    new_qty = cap
                    daily.quantity = new_qty
                    daily.notes = (daily.notes or "") + f" * Capped({cap:.2f})"
                else:
                    new_qty = daily.quantity

                adjusted_forecasts.append(daily)
                total_adjusted += new_qty

            base_forecast.total = total_adjusted
            base_forecast.avg_daily = (
                total_adjusted / horizon_days if horizon_days > 0 else Decimal("0")
            )
            base_forecast.method = f"{base_forecast.method}+outlier_cap"
            base_forecast.daily_forecasts = adjusted_forecasts

            if base_forecast.details:
                base_forecast.details["outlier_capped"] = True

        return base_forecast
