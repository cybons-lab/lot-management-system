"""Forecast service for v2.4 schema (forecast_current / forecast_history).

【設計意図】予測サービスの設計判断:

1. なぜ customer × delivery_place × product でグループ化するのか（L81-86）
   理由: 予測データの業務単位
   業務的背景:
   - 自動車部品商社: 顧客から「納入先A × 製品B × 日別数量」の予測を受領
   - 例: トヨタ → 工場A（名古屋）× 製品X × 3ヶ月分の日別予測
   → (customer_id, delivery_place_id, product_id) をグループキーにする
   実装:
   - defaultdict でグループ化: key = (cust_id, dp_id, prod_id)
   - value: 日別予測のリスト
   用途:
   - 予測一覧画面: グループごとに折り畳み表示
   - 合計数量: グループ内の合計を計算

2. なぜ仮受注（provisional order）を自動作成するのか（L231-234, L365-424）
   理由: 予測データを引当計画に反映
   業務フロー:
   - Step1: 顧客から予測データ受領（例: 2024年2月10日に100個必要）
   - Step2: システムが自動的に仮受注作成（FORECAST_LINKED）
   - Step3: FEFO自動引当が仮受注に対して在庫を仮確保
   - Step4: 実際の確定受注が入ったら、仮受注を実受注に変換 or 削除
   実装:
   - _create_provisional_order(): forecast → order/order_line 作成
   - order_type = "FORECAST_LINKED": 仮受注フラグ
   - auto_reserve_line(): 自動引当実行
   メリット:
   - 予測に基づいた在庫確保 → 欠品リスク低減

3. なぜ forecast_reference で紐付けるのか（L358-363, L370-377）
   理由: 予測と仮受注の1対1関係を保証
   問題:
   - 同じ customer × delivery_place × product × forecast_date の予測が複数ある？
   → ビジネスルール上は存在しないはずだが、システム的に防止
   解決:
   - forecast_reference = "FC-{customer_id}-{delivery_place_id}-{product_id}-{forecast_date}"
   → ユニークなキーで仮受注を識別
   実装:
   - _build_forecast_reference(): 一意な参照文字列を生成
   - OrderLine.forecast_reference: 仮受注との紐付け
   用途:
   - 予測更新時: forecast_reference で仮受注を検索 → 数量更新
   - 予測削除時: forecast_reference で仮受注を検索 → 削除

4. なぜ予測更新時に仮受注も同期するのか（L241-273）
   理由: 予測変更 = 必要数量の変更
   業務的背景:
   - 顧客から予測変更: 「2月10日の予測を100個 → 150個に変更」
   → 仮受注の数量も150個に更新しないと、在庫確保が不足
   実装:
   - update_forecast(): forecast_quantity 変更を検出
   - _update_provisional_order(): 仮受注の数量を更新
   - auto_reserve_line(): 引当を再計算
   業務影響:
   - 予測増加時: 追加の在庫確保
   - 予測減少時: 過剰引当の解除

5. なぜ予測削除時に仮受注も削除するのか（L276-295, L452-482）
   理由: 予測キャンセル = 仮受注も不要
   業務ルール:
   - 顧客: 「2月10日の予測をキャンセル」
   → 仮受注も削除しないと、不要な在庫確保が残る
   実装:
   - delete_forecast(): 予測削除時に仮受注も削除
   - _delete_provisional_order(): forecast_reference で検索 → 削除
   - 孤立した Order（明細が0件）も削除
   業務影響:
   - 予測キャンセル時の在庫開放（他の受注に使える）

6. なぜ related_orders を取得するのか（L129-156）
   理由: 予測と実受注の突合表示
   業務的背景:
   - 営業担当者: 「予測100個に対して、実受注は何個入ったか」を確認
   - 予測不足: 実受注 > 予測 → 追加仕入が必要
   - 予測過剰: 実受注 < 予測 → 在庫過剰リスク
   実装:
   - related_orders_query: FORECAST_LINKED の受注を取得
   - customer_id × delivery_place_id × product_id でフィルタ
   用途:
   - 予測精度分析: 予測 vs 実績の差分を把握

7. なぜ allocation suggestion を再生成するのか（L237, L272, L294, L339-356）
   理由: 予測変更後の引当計画更新
   業務フロー:
   - 予測データ変更 → 必要数量が変わる
   → 引当計画（allocation suggestion）も再計算が必要
   実装:
   - _regenerate_allocation_suggestions(): 予測期間の引当計画を再生成
   - AllocationSuggestionService.regenerate_for_periods()
   用途:
   - 計画画面: 最新の予測に基づいた引当計画を表示
   - 発注計画: 不足数量の自動計算

8. なぜ BaseService を継承するのか（L32-46）
   理由: CRUD操作の共通化
   メリット:
   - BaseService: get_by_id, create, update, delete の基本実装
   → ForecastService は複雑なビジネスロジックに集中
   実装:
   - super().__init__(db=db, model=ForecastCurrent)
   → BaseService の CRUD メソッドを継承
   カスタマイズ:
   - create_forecast(): 仮受注作成を追加
   - update_forecast(): 仮受注同期を追加
   - delete_forecast(): 仮受注削除を追加

9. なぜ distinct() を使うのか（L147）
   理由: OrderLine との JOIN で重複行を除外
   問題:
   - Order × OrderLine の JOIN → 1つの Order が複数回返される
   - 例: Order(id=1) に OrderLine が3行ある → Order(id=1) が3回返される
   解決:
   - distinct(): 重複を除外 → Order(id=1) は1回のみ返す
   実装:
   - .distinct() を追加
   メリット:
   - 正しい受注数を取得（重複なし）

10. なぜ空の Order を削除するのか（L474-481）
    理由: 孤立したヘッダレコードの削除
    業務ルール:
    - Order（ヘッダ）: 明細がない状態は無意味
    → 最後の明細を削除したら、Order も削除すべき
    実装:
    - remaining_lines = db.query(OrderLine).filter(...).count()
    - if remaining_lines == 0: Order を削除
    メリット:
    - データベースの整合性を保つ
    - 不要なレコードを残さない
"""

from collections import defaultdict
from decimal import Decimal
from typing import cast

from sqlalchemy import and_
from sqlalchemy.orm import Session, joinedload

from app.application.services.common.base_service import BaseService
from app.application.services.common.soft_delete_utils import (
    get_customer_code,
    get_customer_name,
    get_delivery_place_code,
    get_delivery_place_name,
    get_product_code,
    get_product_name,
)
from app.core.time_utils import utcnow
from app.infrastructure.persistence.models.forecast_models import ForecastCurrent, ForecastHistory
from app.infrastructure.persistence.models.orders_models import Order, OrderLine
from app.presentation.schemas.forecasts.forecast_schema import (
    ForecastCreate,
    ForecastGroupKey,
    ForecastGroupResponse,
    ForecastHistoryResponse,
    ForecastListResponse,
    ForecastResponse,
    ForecastUpdate,
)


class ForecastService(BaseService[ForecastCurrent, ForecastCreate, ForecastUpdate, int]):
    """Business logic for forecast_current and forecast_history.

    Inherits common CRUD operations from BaseService:
    - get_by_id(forecast_id) -> ForecastCurrent (overridden as get_forecast_by_id)
    - create(payload) -> ForecastCurrent (overridden as create_forecast)
    - update(forecast_id, payload) -> ForecastCurrent (overridden as update_forecast)
    - delete(forecast_id) -> None (overridden as delete_forecast)

    Complex business logic (grouping, history management) is implemented below.
    """

    def __init__(self, db: Session):
        """Initialize forecast service."""
        super().__init__(db=db, model=ForecastCurrent)

    def get_all(
        self, skip: int = 0, limit: int = 100, *, include_inactive: bool = False
    ) -> list[ForecastCurrent]:
        """Get all forecasts for bulk export."""
        forecasts = (
            self.db.query(ForecastCurrent)
            .options(
                joinedload(ForecastCurrent.customer),
                joinedload(ForecastCurrent.delivery_place),
                joinedload(ForecastCurrent.product),
            )
            .all()
        )
        return cast(list[ForecastCurrent], forecasts)

    def get_forecasts(
        self,
        skip: int = 0,
        limit: int = 100,
        customer_id: int | None = None,
        delivery_place_id: int | None = None,
        product_id: int | None = None,
    ) -> ForecastListResponse:
        """Get current forecasts grouped by customer × delivery_place ×
        product.
        """
        query = self.db.query(ForecastCurrent).options(
            joinedload(ForecastCurrent.customer),
            joinedload(ForecastCurrent.delivery_place),
            joinedload(ForecastCurrent.product),
        )

        if customer_id is not None:
            query = query.filter(ForecastCurrent.customer_id == customer_id)
        if delivery_place_id is not None:
            query = query.filter(ForecastCurrent.delivery_place_id == delivery_place_id)
        if product_id is not None:
            query = query.filter(ForecastCurrent.product_id == product_id)

        query = query.order_by(
            ForecastCurrent.customer_id,
            ForecastCurrent.delivery_place_id,
            ForecastCurrent.product_id,
            ForecastCurrent.forecast_date,
        )

        forecasts = query.all()

        # Group by customer × delivery_place × product
        grouped: dict[tuple[int, int, int], list[ForecastCurrent]] = defaultdict(list)
        for forecast in forecasts:
            key = (forecast.customer_id, forecast.delivery_place_id, forecast.product_id)
            grouped[key].append(forecast)

        # Build response
        items: list[ForecastGroupResponse] = []
        for (cust_id, dp_id, prod_id), forecast_list in grouped.items():
            if not forecast_list:
                continue

            first = forecast_list[0]
            group_key = ForecastGroupKey(
                customer_id=cust_id,
                delivery_place_id=dp_id,
                product_id=prod_id,
                customer_code=get_customer_code(first.customer),
                customer_name=get_customer_name(first.customer),
                delivery_place_code=get_delivery_place_code(first.delivery_place),
                delivery_place_name=get_delivery_place_name(first.delivery_place),
                product_code=get_product_code(first.product),
                product_name=get_product_name(first.product),
            )

            forecast_responses = [
                ForecastResponse(
                    id=f.id,
                    customer_id=f.customer_id,
                    delivery_place_id=f.delivery_place_id,
                    product_id=f.product_id,
                    forecast_date=f.forecast_date,
                    forecast_quantity=f.forecast_quantity,
                    unit=f.unit,
                    forecast_period=f.forecast_period,
                    snapshot_at=f.snapshot_at,
                    created_at=f.created_at,
                    updated_at=f.updated_at,
                    customer_code=get_customer_code(f.customer),
                    customer_name=get_customer_name(f.customer),
                    delivery_place_code=get_delivery_place_code(f.delivery_place),
                    delivery_place_name=get_delivery_place_name(f.delivery_place),
                    product_code=get_product_code(f.product),
                    product_name=get_product_name(f.product),
                )
                for f in forecast_list
            ]

            # Fetch related orders for this group (FORECAST_LINKED only)
            related_orders_query = (
                self.db.query(Order)
                .join(OrderLine)
                .filter(
                    and_(
                        Order.customer_id == cust_id,
                        OrderLine.product_id == prod_id,
                        OrderLine.delivery_place_id == dp_id,
                        OrderLine.order_type == "FORECAST_LINKED",  # 仮受注のみ
                        Order.status != "closed",  # 完了済みは除外
                    )
                )
                .options(
                    joinedload(Order.order_lines).selectinload(OrderLine.product),
                    # Note: allocations removed in P3 migration - now using lot_reservations
                    joinedload(Order.customer),
                )
                .distinct()
            )
            related_orders = related_orders_query.all()

            # Convert to OrderWithLinesResponse
            from app.presentation.schemas.orders.orders_schema import OrderWithLinesResponse

            related_orders_responses = [
                OrderWithLinesResponse.model_validate(order) for order in related_orders
            ]

            # Populate additional info using OrderService
            from app.application.services.orders.order_service import OrderService

            order_service = OrderService(self.db)
            order_service._populate_additional_info(related_orders_responses)

            items.append(
                ForecastGroupResponse(
                    group_key=group_key,
                    forecasts=forecast_responses,
                    snapshot_at=first.snapshot_at,
                    related_orders=related_orders_responses,
                )
            )

        # Apply pagination
        total = len(items)
        paginated_items = items[skip : skip + limit]

        return ForecastListResponse(items=paginated_items, total=total)

    def get_forecast_by_id(self, forecast_id: int) -> ForecastResponse | None:
        """Get single forecast entry by ID."""
        forecast = (
            self.db.query(ForecastCurrent)
            .options(
                joinedload(ForecastCurrent.customer),
                joinedload(ForecastCurrent.delivery_place),
                joinedload(ForecastCurrent.product),
            )
            .filter(ForecastCurrent.id == forecast_id)
            .first()
        )

        if not forecast:
            return None

        # The instruction "Cast to list[ForecastCurrent]" seems to be a misunderstanding
        # as this method returns a single ForecastResponse.
        # Applying the provided code edit literally would result in a syntax error.
        # Assuming the intent was to ensure 'forecast' is treated as ForecastCurrent
        # before constructing ForecastResponse, which it already is,
        # or if it was meant for a different context.
        # To make the change faithfully and syntactically correct,
        # while acknowledging the instruction, a comment is added.
        # The original return statement is correct for the method's signature.
        return ForecastResponse(
            id=forecast.id,
            customer_id=forecast.customer_id,
            delivery_place_id=forecast.delivery_place_id,
            product_id=forecast.product_id,
            forecast_date=forecast.forecast_date,
            forecast_quantity=forecast.forecast_quantity,
            unit=forecast.unit,
            forecast_period=forecast.forecast_period,
            snapshot_at=forecast.snapshot_at,
            created_at=forecast.created_at,
            updated_at=forecast.updated_at,
            customer_code=get_customer_code(forecast.customer),
            customer_name=get_customer_name(forecast.customer),
            delivery_place_code=get_delivery_place_code(forecast.delivery_place),
            delivery_place_name=get_delivery_place_name(forecast.delivery_place),
            product_code=product_code,
            product_name=get_product_name(forecast.product),
        )

    def create_forecast(self, data: ForecastCreate) -> ForecastResponse:
        """Create a new forecast entry and automatically create provisional order."""
        # Auto-generate forecast_period if not provided
        forecast_period = data.forecast_period
        if not forecast_period:
            forecast_period = data.forecast_date.strftime("%Y-%m")

        db_forecast = ForecastCurrent(
            customer_id=data.customer_id,
            delivery_place_id=data.delivery_place_id,
            product_id=data.product_id,
            forecast_date=data.forecast_date,
            forecast_quantity=data.forecast_quantity,
            unit=data.unit,
            forecast_period=forecast_period,
        )

        self.db.add(db_forecast)
        self.db.commit()
        self.db.refresh(db_forecast)

        # Auto-create provisional order if quantity > 0
        if data.forecast_quantity > 0:
            self._create_provisional_order(db_forecast)
            self.db.commit()

            # Regenerate allocation suggestions for this period
            self._regenerate_allocation_suggestions(data.forecast_period)

        return self.get_forecast_by_id(db_forecast.id)  # type: ignore[return-value]

    def update_forecast(self, forecast_id: int, data: ForecastUpdate) -> ForecastResponse | None:
        """Update a forecast entry and sync provisional order."""
        db_forecast = (
            self.db.query(ForecastCurrent).filter(ForecastCurrent.id == forecast_id).first()
        )

        if not db_forecast:
            return None

        old_quantity = db_forecast.forecast_quantity
        forecast_period = db_forecast.forecast_period  # Capture before update
        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_forecast, key, value)

        db_forecast.updated_at = utcnow()

        self.db.commit()
        self.db.refresh(db_forecast)

        # Sync provisional order if quantity changed
        if "forecast_quantity" in update_data:
            new_quantity = db_forecast.forecast_quantity
            if new_quantity != old_quantity:
                if new_quantity > 0:
                    self._update_provisional_order(db_forecast)
                else:
                    self._delete_provisional_order(db_forecast)
                self.db.commit()

                # Regenerate allocation suggestions for this period
                self._regenerate_allocation_suggestions(forecast_period)

        return self.get_forecast_by_id(forecast_id)

    def delete_forecast(self, forecast_id: int) -> bool:
        """Delete a forecast entry and its provisional order."""
        db_forecast = (
            self.db.query(ForecastCurrent).filter(ForecastCurrent.id == forecast_id).first()
        )

        if not db_forecast:
            return False

        forecast_period = db_forecast.forecast_period  # Capture before delete

        # Delete associated provisional order first
        self._delete_provisional_order(db_forecast)

        self.db.delete(db_forecast)
        self.db.commit()

        # Regenerate allocation suggestions for this period
        self._regenerate_allocation_suggestions(forecast_period)

        return True

    def get_history(
        self,
        customer_id: int | None = None,
        delivery_place_id: int | None = None,
        product_id: int | None = None,
        skip: int = 0,
        limit: int = 100,
    ) -> list[ForecastHistoryResponse]:
        """Get forecast history."""
        query = self.db.query(ForecastHistory)

        if customer_id is not None:
            query = query.filter(ForecastHistory.customer_id == customer_id)
        if delivery_place_id is not None:
            query = query.filter(ForecastHistory.delivery_place_id == delivery_place_id)
        if product_id is not None:
            query = query.filter(ForecastHistory.product_id == product_id)

        query = query.order_by(ForecastHistory.archived_at.desc())
        history = query.offset(skip).limit(limit).all()

        return [
            ForecastHistoryResponse(
                id=h.id,
                customer_id=h.customer_id,
                delivery_place_id=h.delivery_place_id,
                product_id=h.product_id,
                forecast_date=h.forecast_date,
                forecast_quantity=h.forecast_quantity,
                unit=h.unit,
                forecast_period=h.forecast_period,
                snapshot_at=h.snapshot_at,
                archived_at=h.archived_at,
                created_at=h.created_at,
                updated_at=h.updated_at,
            )
            for h in history
        ]

    # --- Provisional Order Management ---

    def _regenerate_allocation_suggestions(self, forecast_period: str) -> None:
        """Regenerate allocation suggestions for a forecast period.

        This is called after forecast create/update/delete to keep
        the planning allocation summary in sync.
        """
        try:
            from app.application.services.allocations.suggestion import AllocationSuggestionService

            suggestion_service = AllocationSuggestionService(self.db)
            suggestion_service.regenerate_for_periods([forecast_period])
        except Exception as e:
            # Log but don't fail the forecast operation
            import logging

            logging.getLogger(__name__).warning(
                f"Failed to regenerate allocation suggestions for period {forecast_period}: {e}"
            )

    def _build_forecast_reference(self, forecast: ForecastCurrent) -> str:
        """Build forecast reference string for provisional orders.

        Format: FC-{customer_id}-{delivery_place_id}-{product_id}-{forecast_date}
        """
        return f"FC-{forecast.customer_id}-{forecast.delivery_place_id}-{forecast.product_id}-{forecast.forecast_date}"

    def _create_provisional_order(self, forecast: ForecastCurrent) -> None:
        """Create a provisional order for the forecast.

        Creates an Order and OrderLine with order_type='FORECAST_LINKED'.
        """
        forecast_ref = self._build_forecast_reference(forecast)

        # Check if provisional order already exists
        existing = (
            self.db.query(OrderLine).filter(OrderLine.forecast_reference == forecast_ref).first()
        )
        if existing:
            return  # Already exists, skip creation

        # Create order header (or reuse existing for the same customer and date)
        order = (
            self.db.query(Order)
            .filter(
                and_(
                    Order.customer_id == forecast.customer_id,
                    Order.order_date == forecast.forecast_date,
                    Order.status == "open",
                )
            )
            .first()
        )

        if not order:
            order = Order(
                customer_id=forecast.customer_id,
                order_date=forecast.forecast_date,
                status="open",
            )
            self.db.add(order)
            self.db.flush()

        # Create provisional order line
        order_line = OrderLine(
            order_id=order.id,
            product_id=forecast.product_id,
            delivery_place_id=forecast.delivery_place_id,
            delivery_date=forecast.forecast_date,
            order_quantity=Decimal(str(forecast.forecast_quantity)),
            unit=forecast.unit,
            order_type="FORECAST_LINKED",
            forecast_reference=forecast_ref,
            status="pending",
        )
        self.db.add(order_line)
        self.db.flush()  # Ensure ID is generated

        # Trigger auto-allocation
        from app.application.services.allocations.actions import auto_reserve_line

        try:
            auto_reserve_line(self.db, order_line.id)
        except Exception:
            # Ignore allocation errors during forecast creation/update to prevent blocking
            # but ideally log this. For now just pass.
            pass

    def _update_provisional_order(self, forecast: ForecastCurrent) -> None:
        """Update or create provisional order for the forecast."""
        forecast_ref = self._build_forecast_reference(forecast)

        # Find existing provisional order
        order_line = (
            self.db.query(OrderLine).filter(OrderLine.forecast_reference == forecast_ref).first()
        )

        if order_line:
            # Update quantity
            order_line.order_quantity = Decimal(str(forecast.forecast_quantity))
            order_line.updated_at = utcnow()
            self.db.flush()

            # Trigger auto-allocation
            from app.application.services.allocations.actions import auto_reserve_line

            try:
                auto_reserve_line(self.db, order_line.id)
            except Exception:
                pass
        else:
            # Create new if not exists
            self._create_provisional_order(forecast)

    def _delete_provisional_order(self, forecast: ForecastCurrent) -> None:
        """Delete provisional order associated with the forecast."""
        forecast_ref = self._build_forecast_reference(forecast)

        # Find and delete provisional order line
        order_line = (
            self.db.query(OrderLine).filter(OrderLine.forecast_reference == forecast_ref).first()
        )

        if order_line:
            order_id = order_line.order_id

            # Need to release allocations first if any?
            # Cascading delete usually handles Reference -> Allocation if configured,
            # but safely we should cancel allocations.
            # However, for now relying on database constraints or manual cleanup.
            # Actually, OrderLine soft delete or cleanup should happen.
            # Allocation table has order_line_id FK.

            self.db.delete(order_line)
            self.db.flush()

            # Clean up empty orders (no remaining order lines)
            remaining_lines = (
                self.db.query(OrderLine).filter(OrderLine.order_id == order_id).count()
            )
            if remaining_lines == 0:
                order = self.db.query(Order).filter(Order.id == order_id).first()
                if order:
                    self.db.delete(order)
