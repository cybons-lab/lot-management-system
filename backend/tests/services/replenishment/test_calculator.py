from datetime import date
from decimal import Decimal
from unittest.mock import Mock

from app.application.services.demand.estimator import DemandForecast
from app.application.services.replenishment.calculator import ReplenishmentCalculator


class TestReplenishmentCalculator:
    def test_calculate_rop_trigger(self):
        calc = ReplenishmentCalculator()
        as_of = date(2025, 1, 1)

        # Demand: 10/day, std=0 (simple)
        demand = Mock(spec=DemandForecast)
        demand.avg_daily = Decimal("10")
        demand.std_daily = Decimal("0")
        demand.horizon_days = 30
        demand.total = Decimal("300")

        # Params
        lt_days = 5
        lt_std = 0.0
        on_hand = Decimal("40")  # 5*10 + SS(approx 27) = approx 77 ROP. So 40 should trigger.
        reserved = Decimal("0")
        inbound = Decimal("0")

        # SS = 1.65 * sqrt(5*0 + 100*0) = 0? No wait.
        # variance = LT * sigma_d^2 + D^2 * sigma_LT^2
        # variance = 5*0 + 100*0 = 0 -> SS=0
        # ROP = 10*5 + 0 = 50.
        # on_hand=40 < 50 => Order triggered.

        rec = calc.calculate(
            supplier_item_id=1,
            warehouse_id=1,
            supplier_id=1,
            as_of_date=as_of,
            demand=demand,
            lead_time_days=lt_days,
            lead_time_std=lt_std,
            on_hand=on_hand,
            reserved=reserved,
            inbound=inbound,
            coverage_days=30,
        )

        assert rec is not None
        assert rec.reorder_point == Decimal("50.00")
        assert rec.recommended_order_qty > 0

        # Target stock = ROP + D*Coverage = 50 + 10*30 = 350
        # Order qty = 350 - 40 = 310
        assert rec.recommended_order_qty == Decimal("310.00")

    def test_calculate_no_trigger(self):
        calc = ReplenishmentCalculator()
        as_of = date(2025, 1, 1)

        demand = Mock(spec=DemandForecast)
        demand.avg_daily = Decimal("10")
        demand.std_daily = Decimal("0")

        # ROP = 500
        # on_hand = 60
        rec = calc.calculate(
            supplier_item_id=1,
            warehouse_id=1,
            supplier_id=1,
            as_of_date=as_of,
            demand=demand,
            lead_time_days=5,
            lead_time_std=0.0,
            on_hand=Decimal("60"),
            reserved=Decimal("0"),
            inbound=Decimal("0"),
        )
        # ROP=50, on_hand=60 >= 50 => No order
        assert rec is None

    def test_apply_constraints_moq(self):
        calc = ReplenishmentCalculator()
        qty, constraints = calc._apply_constraints(Decimal("50"), moq=Decimal("100"), lot_size=None)
        assert qty == Decimal("100")
        assert "MOQ" in constraints[0]

    def test_apply_constraints_lot_rounding(self):
        calc = ReplenishmentCalculator()
        # qty=55, lot=50 -> 100
        qty, constraints = calc._apply_constraints(Decimal("55"), moq=None, lot_size=Decimal("50"))
        assert qty == Decimal("100")
        assert "Lot rounding" in constraints[0]
