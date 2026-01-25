from datetime import date
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.application.services.demand.estimator import DemandEstimator
from app.application.services.demand.repository import DemandRepository
from app.application.services.demand.statistical.ewma import EWMAEstimator
from app.application.services.demand.statistical.moving_average import MovingAverageEstimator
from app.application.services.demand.statistical.outlier import OutlierHandler
from app.application.services.demand.statistical.seasonal import SeasonalEstimator
from app.application.services.replenishment.calculator import ReplenishmentCalculator
from app.application.services.replenishment.explainer import ReplenishmentExplainer
from app.application.services.replenishment.recommendation import ReplenishmentRecommendation
from app.infrastructure.persistence.models.inbound_models import InboundPlan
from app.infrastructure.persistence.models.lot_receipt_models import LotReceipt
from app.infrastructure.persistence.models.lot_reservations_model import LotReservation
from app.infrastructure.persistence.models.masters_models import Product
from app.infrastructure.persistence.models.supplier_item_model import SupplierItem


class ReplenishmentEngine:
    """発注提案エンジン."""

    def __init__(self, db: Session):
        self.db = db
        self.calculator = ReplenishmentCalculator()
        self.explainer = ReplenishmentExplainer()
        self.demand_repo = DemandRepository(db)

    def run(
        self,
        warehouse_id: int,
        product_ids: list[int] | None = None,
        as_of_date: date | None = None,
        method: str = "moving_average_seasonal",  # default per D11
    ) -> list[ReplenishmentRecommendation]:
        """発注提案を実行."""
        if as_of_date is None:
            from app.core.time_utils import utcnow

            as_of_date = utcnow().date()

        # 1. 対象の製品・仕入先ペアを取得
        # SupplierItemをベースに、指定されたproduct_idがあれば絞り込む
        stmt = select(SupplierItem).where(SupplierItem.valid_to >= as_of_date)
        if product_ids:
            stmt = stmt.where(SupplierItem.product_id.in_(product_ids))

        # primaryのみにするか？一旦全supplerについて回すが、通常はprimaryのみ
        stmt = stmt.where(SupplierItem.is_primary)

        product_suppliers = self.db.execute(stmt).scalars().all()

        recommendations = []

        # 2. DemandEstimatorの準備
        estimator = self._create_estimator(method)

        for ps in product_suppliers:
            if ps.product_id is None:
                # 独立運用(product_idなし)のSupplierItemは、現状の製品ベースのロジックでは扱えないためスキップ
                continue
            product_id = int(ps.product_id)
            supplier_id = int(ps.supplier_id)
            # 3. 在庫情報の取得
            on_hand = self._get_on_hand(product_id, warehouse_id)
            reserved = self._get_reserved(product_id, warehouse_id)
            inbound = self._get_pending_inbound(product_id, warehouse_id, supplier_id)

            # 4. 需要予測
            # D13: 予測期間 30日
            horizon_days = 30
            forecast = estimator.estimate(
                product_id=product_id,
                warehouse_id=warehouse_id,
                horizon_days=horizon_days,
                as_of_date=as_of_date,
            )

            # 5. LT統計 (簡易版: マスタ設定値を採用し、ばらつきはデフォルト値とする)
            # 本来は InboundPlan から実績LTの統計を取る (D14)
            # ここでは実装簡略化のため、マスタ値 + 固定の分散 を使用
            # TODO: 実装が進んだら InboundPlan から計算するロジックへ差し替え
            lead_time_days = int(ps.lead_time_days or 7)
            lead_time_std = float(lead_time_days * 0.2)  # 仮: LTの20%を標準偏差とする

            # 6. 計算
            # Product情報からロットサイズなどを取得したい場合はProductをjoinまたは取得
            # ここでは ps.product を使う (eager loadされていれば)
            # ロットサイズ等の制約は ProductMapping などにあるかもしれないが、
            # 現状の Product モデルにはないので、qty_scale 等を使用
            # D12: MOQ -> ロット丸め
            # 今回は MOQ=なし, LotSize=qty_scale * 10 などを仮定、またはマスタにあれば使う
            # Productにqty_scaleを追加したのでそれを使う

            product = self.db.get(Product, ps.product_id)
            lot_size = None
            if product and product.qty_scale:
                lot_size = Decimal(product.qty_scale)  # 仮: qty_scale をロットサイズとして扱う

            rec = self.calculator.calculate(
                product_id=product_id,
                warehouse_id=warehouse_id,
                supplier_id=supplier_id,
                as_of_date=as_of_date,
                demand=forecast,
                lead_time_days=lead_time_days,
                lead_time_std=lead_time_std,
                on_hand=on_hand,
                reserved=reserved,
                inbound=inbound,
                moq=None,  # マスタにないためNone
                lot_size=lot_size,
            )

            if rec:
                # 説明文生成
                rec.explanation = self.explainer.explain(rec)
                recommendations.append(rec)

        return recommendations

    def _create_estimator(self, method: str) -> DemandEstimator:
        # Default: Moving Average + Seasonal (D11)
        use_seasonal = True

        if method == "ewma":
            base = EWMAEstimator(self.demand_repo, alpha=0.3)
            use_seasonal = False  # EWMAの場合はSeasonalを乗せるか？要件R3では ewma 実装、seasonalは base_estimatorを包む
            # D11は「初期予測手法」の話。method=ewmaならそのままか、seasonal乗せるか。
            # 計画書には "seasonal は base_estimator を包むラッパとして実装" とあるので、組み合わせ可能。
            # ここでは ewma 単体、または ewma + seasonal もあり得るが、
            # method="ewma" 指定時は ewma のみとする、あるいは ewma_seasonal も可。
            # 既定(moving_average)の場合は seasonal をつける。
            return base

        # Default fallback
        ma = MovingAverageEstimator(self.demand_repo, window_days=30)

        if use_seasonal:
            seasonal = SeasonalEstimator(ma)
            return OutlierHandler(seasonal)  # OutlierHandlerもデフォルトで適用

        return OutlierHandler(ma)

    def _get_on_hand(self, product_id: int, warehouse_id: int) -> Decimal:
        stmt = select(func.sum(LotReceipt.current_quantity)).where(
            LotReceipt.product_id == product_id,
            LotReceipt.warehouse_id == warehouse_id,
            # active lots only logic? valid_to check?
            # Assume all records with quantity > 0 are on hand
            LotReceipt.current_quantity > 0,
        )
        return self.db.execute(stmt).scalar() or Decimal("0")

    def _get_reserved(self, product_id: int, warehouse_id: int) -> Decimal:
        # Reservation logic: linked to LotReservation?
        # Need to join LotReservation -> LotReceipt to filter by warehouse
        stmt = (
            select(func.sum(LotReservation.reserved_qty))
            .join(LotReceipt, LotReservation.lot_id == LotReceipt.id)
            .where(
                LotReceipt.product_id == product_id,
                LotReceipt.warehouse_id == warehouse_id,
                LotReservation.status == "active",
            )
        )
        return self.db.execute(stmt).scalar() or Decimal("0")

    def _get_pending_inbound(self, product_id: int, warehouse_id: int, supplier_id: int) -> Decimal:
        # InboundPlanLine logic?
        # Assuming we check InboundPlanLine linked to InboundPlan
        # status planned or in_transit
        from app.infrastructure.persistence.models.inbound_models import InboundPlanLine

        stmt = (
            select(func.sum(InboundPlanLine.planned_quantity))
            .join(InboundPlan, InboundPlanLine.inbound_plan_id == InboundPlan.id)
            .where(
                InboundPlanLine.product_id == product_id,
                InboundPlan.supplier_id == supplier_id,
                InboundPlan.status.in_(["planned", "in_transit"]),
            )
        )
        return self.db.execute(stmt).scalar() or Decimal("0")
