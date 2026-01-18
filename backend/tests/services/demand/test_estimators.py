from datetime import date, timedelta
from decimal import Decimal
from unittest.mock import Mock

from app.application.services.demand.repository import DemandRepository
from app.application.services.demand.statistical.ewma import EWMAEstimator
from app.application.services.demand.statistical.moving_average import MovingAverageEstimator
from app.application.services.demand.statistical.outlier import OutlierHandler
from app.application.services.demand.statistical.seasonal import SeasonalEstimator


class TestMovingAverageEstimator:
    def test_estimate_simple(self):
        repo = Mock(spec=DemandRepository)
        as_of = date(2025, 1, 1)
        # 30日前から毎日10個売れたとする
        history = []
        for i in range(30):
            d = as_of - timedelta(days=30 - i)
            history.append((d, Decimal("10")))
        repo.get_demand_history.return_value = history

        estimator = MovingAverageEstimator(repo, window_days=30)
        forecast = estimator.estimate(1, 1, 30, as_of)

        assert forecast.avg_daily == Decimal("10")
        assert forecast.total == Decimal("300")
        assert len(forecast.daily_forecasts) == 30
        assert forecast.std_daily == Decimal("0")  # 全て同じ値なので分散0


class TestEWMAEstimator:
    def test_estimate_smoothing(self):
        repo = Mock(spec=DemandRepository)
        as_of = date(2025, 1, 1)
        # Initially 0 (skipped), then 50, then 100s.
        history = []
        start = as_of - timedelta(days=10)
        # 5日間0
        for i in range(5):
            history.append((start + timedelta(days=i), Decimal("0")))
        # Day 6: 50 (Initializes here)
        history.append((start + timedelta(days=5), Decimal("50")))
        # Day 7-10: 100
        for i in range(6, 10):
            history.append((start + timedelta(days=i), Decimal("100")))

        repo.get_demand_history.return_value = history

        estimator = EWMAEstimator(repo, alpha=0.5, lookback_days=10)
        forecast = estimator.estimate(1, 1, 5, as_of)

        # 最終的なEWMA値が 0 < x < 100 であること
        assert Decimal("0") < forecast.avg_daily < Decimal("100")
        # 手計算: 0->0->0->0->0 -> 100(val)
        # ewma = 0.5*100 + 0.5*0 = 50
        # ewma = 0.5*100 + 0.5*50 = 75
        # ...
        # 直近の値に近いが100よりは小さいはず
        assert forecast.avg_daily > Decimal("50")


class TestSeasonalEstimator:
    def test_seasonal_summer(self):
        # Base estimator returns constant 100
        base = Mock()
        as_of = date(2025, 6, 1)  # 6月開始

        # Mock base forecast
        daily_forecasts = []
        for i in range(30):
            daily_forecasts.append(
                Mock(date=as_of + timedelta(days=i), quantity=Decimal("100"), notes="")
            )

        base_forecast = Mock(
            daily_forecasts=daily_forecasts,
            avg_daily=Decimal("100"),
            total=Decimal("3000"),
            method="base",
            details={},
        )
        base.estimate.return_value = base_forecast

        estimator = SeasonalEstimator(base)
        forecast = estimator.estimate(1, 1, 30, as_of)

        # 6月なので1.2倍されているはず (100 * 1.2 = 120)
        assert forecast.daily_forecasts[0].quantity == Decimal("120")
        assert "Seasonal" in forecast.daily_forecasts[0].notes


class TestOutlierHandler:
    def test_cap_outlier(self):
        base = Mock()
        as_of = date(2025, 1, 1)

        # avg=10, but one daily forecast is 1000 (huge spike)
        daily_forecasts = [
            Mock(date=as_of, quantity=Decimal("10"), notes=""),
            Mock(date=as_of, quantity=Decimal("1000"), notes=""),  # Spike
        ]

        base_forecast = Mock(
            daily_forecasts=daily_forecasts,
            avg_daily=Decimal("10"),  # Base average implies normal level is 10
            total=Decimal("1010"),
            method="base",
            details={},
        )
        base.estimate.return_value = base_forecast

        # Cap at avg * 3 = 30
        estimator = OutlierHandler(base)
        forecast = estimator.estimate(1, 1, 2, as_of)

        assert forecast.daily_forecasts[0].quantity == Decimal("10")
        assert forecast.daily_forecasts[1].quantity == Decimal("30")  # Capped
        assert "Capped" in forecast.daily_forecasts[1].notes
