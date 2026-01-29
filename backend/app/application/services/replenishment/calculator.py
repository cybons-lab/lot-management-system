import math
from datetime import date, timedelta
from decimal import Decimal

from app.application.services.demand.estimator import DemandForecast
from app.application.services.replenishment.recommendation import ReplenishmentRecommendation
from app.core.time_utils import utcnow


class ReplenishmentCalculator:
    """発注提案計算ロジック。."""

    def __init__(self):
        pass

    def calculate(
        self,
        product_group_id: int,
        warehouse_id: int,
        supplier_id: int,
        as_of_date: date,
        demand: DemandForecast,
        lead_time_days: int,
        lead_time_std: float,
        on_hand: Decimal,
        reserved: Decimal,
        inbound: Decimal,
        moq: Decimal | None = None,
        lot_size: Decimal | None = None,
        coverage_days: int = 30,
        service_level_z: float = 1.65,
    ) -> ReplenishmentRecommendation | None:
        """発注提案を計算。."""
        avg_daily_demand = demand.avg_daily
        std_demand = demand.std_daily

        # 3. 安全在庫を計算
        # SS = Z × √(LT × σ_d² + D² × σ_LT²)
        # 単位を合わせるため、avg_daily_demand は Decimal だが計算中は float にする
        avg_daily_float = float(avg_daily_demand)
        std_daily_float = float(std_demand)

        variance = lead_time_days * (std_daily_float**2) + (avg_daily_float**2) * (lead_time_std**2)
        safety_stock_float = service_level_z * (variance**0.5)
        safety_stock = Decimal(f"{safety_stock_float:.2f}")

        # 4. 発注点（ROP）を計算
        # ROP = avg_demand × LT + SS
        reorder_point = avg_daily_demand * Decimal(lead_time_days) + safety_stock

        # 5. 現在の有効在庫を計算
        # effective_stock = on_hand - reserved + inbound
        effective_stock = on_hand - reserved + inbound

        # 6. 発注要否を判定
        if effective_stock >= reorder_point:
            return None  # 発注不要

        # 7. 発注量を計算
        # order_qty = target_stock - effective_stock
        # target_stock = ROP + avg_demand * coverage_days (カバー期間発注)
        target_stock = reorder_point + avg_daily_demand * Decimal(coverage_days)
        raw_order_qty = target_stock - effective_stock

        # 負の値は0に（念のため）
        if raw_order_qty < 0:
            raw_order_qty = Decimal("0")

        # 8. 制約を適用
        order_qty, applied_constraints = self._apply_constraints(raw_order_qty, moq, lot_size)

        # 9. 発注日・入荷日を計算
        order_date = as_of_date
        arrival_date = order_date + timedelta(days=lead_time_days)

        # ID生成 (簡易)
        rec_id = f"REC-{product_group_id}-{as_of_date.strftime('%Y%m%d')}"

        return ReplenishmentRecommendation(
            id=rec_id,
            product_group_id=product_group_id,
            warehouse_id=warehouse_id,
            supplier_id=supplier_id,
            recommended_order_qty=order_qty,
            recommended_order_date=order_date,
            expected_arrival_date=arrival_date,
            reorder_point=reorder_point,
            safety_stock=safety_stock,
            target_stock=target_stock,
            current_on_hand=on_hand,
            current_reserved=reserved,
            current_available=on_hand - reserved,
            pending_inbound=inbound,
            avg_daily_demand=avg_daily_demand,
            demand_forecast_horizon=demand.horizon_days,
            demand_forecast_total=demand.total,
            lead_time_days=lead_time_days,
            lead_time_std=lead_time_std,
            moq=moq,
            lot_size=lot_size,
            constraints_applied=applied_constraints,
            created_at=utcnow(),
            status="draft",
            explanation="",
        )

    def _apply_constraints(
        self,
        raw_qty: Decimal,
        moq: Decimal | None,
        lot_size: Decimal | None,
    ) -> tuple[Decimal, list[str]]:
        """制約を適用。."""
        qty = raw_qty
        constraints = []

        # MOQ
        if moq and qty < moq:
            qty = moq
            constraints.append(f"MOQ applied ({moq})")

        # ロット丸め (D12: MOQ -> ロット丸め の順)
        if lot_size and lot_size > 0:
            # 切り上げ: ceil(qty / lot_size) * lot_size
            remainder = qty % lot_size
            if remainder > 0:
                qty = (math.ceil(qty / lot_size)) * lot_size
                constraints.append(f"Lot rounding applied ({lot_size})")

        return qty, constraints
