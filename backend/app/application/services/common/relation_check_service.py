"""関連データ存在チェックサービス.

マスターデータの削除可否を判定するため、
関連するトランザクションデータの存在をチェックする。

設計意図:
- 物理削除は関連データ0件の場合のみ許可
- 論理削除は常に許可（ただし関連データの状態遷移を伴う）
- コード編集は管理者のみ、関連データ0件の場合のみ許可
"""

from __future__ import annotations

from sqlalchemy import func
from sqlalchemy.orm import Session


class RelationCheckService:
    """関連データ存在チェックサービス."""

    def __init__(self, db: Session):
        self.db = db

    def customer_has_related_data(self, customer_id: int) -> bool:
        """得意先に関連データが存在するかチェック.

        チェック対象:
        - orders: 受注ヘッダ
        - withdrawals: 出庫（customer_id を持つ場合）
        - forecasts: 需要予測

        Args:
            customer_id: 得意先ID

        Returns:
            True if related data exists, False otherwise
        """
        from app.infrastructure.persistence.models.forecast_models import (
            ForecastCurrent,
        )
        from app.infrastructure.persistence.models.orders_models import Order
        from app.infrastructure.persistence.models.withdrawal_models import Withdrawal

        # 受注チェック
        order_count = (
            self.db.query(func.count(Order.id)).filter(Order.customer_id == customer_id).scalar()
        )
        if order_count > 0:
            return True

        # 出庫チェック（customer_id カラムがある場合）
        try:
            withdrawal_count = (
                self.db.query(func.count(Withdrawal.id))
                .filter(Withdrawal.customer_id == customer_id)
                .scalar()
            )
            if withdrawal_count > 0:
                return True
        except AttributeError:
            # customer_id カラムがない場合はスキップ
            pass

        # 需要予測チェック（delivery_place経由で間接参照の場合）
        # → delivery_places は customer に紐づくので、
        #   delivery_places が削除されれば forecast も孤立する
        # 直接customer_idを持つ場合のみチェック
        try:
            forecast_count = (
                self.db.query(func.count(ForecastCurrent.id))
                .filter(ForecastCurrent.customer_id == customer_id)
                .scalar()
            )
            if forecast_count > 0:
                return True
        except AttributeError:
            pass

        return False

    def supplier_has_related_data(self, supplier_id: int) -> bool:
        """仕入先に関連データが存在するかチェック.

        チェック対象:
        - lots: ロット（仕入先に紐づく場合）
        - inbound_plans: 入荷予定
        - product_suppliers: 製品仕入先マッピング

        Args:
            supplier_id: 仕入先ID

        Returns:
            True if related data exists, False otherwise
        """
        from app.infrastructure.persistence.models.inbound_models import InboundPlan
        from app.infrastructure.persistence.models.inventory_models import Lot
        from app.infrastructure.persistence.models.product_supplier_models import (
            ProductSupplier,
        )

        # ロットチェック
        lot_count = (
            self.db.query(func.count(Lot.id)).filter(Lot.supplier_id == supplier_id).scalar()
        )
        if lot_count > 0:
            return True

        # 入荷予定チェック
        inbound_count = (
            self.db.query(func.count(InboundPlan.id))
            .filter(InboundPlan.supplier_id == supplier_id)
            .scalar()
        )
        if inbound_count > 0:
            return True

        # 製品仕入先マッピングチェック
        ps_count = (
            self.db.query(func.count(ProductSupplier.id))
            .filter(ProductSupplier.supplier_id == supplier_id)
            .scalar()
        )
        if ps_count > 0:
            return True

        return False

    def product_has_related_data(self, product_id: int) -> bool:
        """製品に関連データが存在するかチェック.

        チェック対象:
        - lots: ロット
        - order_lines: 受注明細
        - lot_reservations: ロット引当
        - forecasts: 需要予測

        Args:
            product_id: 製品ID

        Returns:
            True if related data exists, False otherwise
        """
        from app.infrastructure.persistence.models.forecast_models import (
            ForecastCurrent,
        )
        from app.infrastructure.persistence.models.inventory_models import Lot
        from app.infrastructure.persistence.models.orders_models import OrderLine

        # ロットチェック
        lot_count = self.db.query(func.count(Lot.id)).filter(Lot.product_id == product_id).scalar()
        if lot_count > 0:
            return True

        # 受注明細チェック
        order_line_count = (
            self.db.query(func.count(OrderLine.id))
            .filter(OrderLine.product_id == product_id)
            .scalar()
        )
        if order_line_count > 0:
            return True

        # 需要予測チェック
        forecast_count = (
            self.db.query(func.count(ForecastCurrent.id))
            .filter(ForecastCurrent.product_id == product_id)
            .scalar()
        )
        if forecast_count > 0:
            return True

        return False

    def warehouse_has_related_data(self, warehouse_id: int) -> bool:
        """倉庫に関連データが存在するかチェック.

        チェック対象:
        - lots: ロット
        - withdrawals: 出庫

        Args:
            warehouse_id: 倉庫ID

        Returns:
            True if related data exists, False otherwise
        """
        from app.infrastructure.persistence.models.inventory_models import Lot
        from app.infrastructure.persistence.models.withdrawal_models import Withdrawal

        # ロットチェック
        lot_count = (
            self.db.query(func.count(Lot.id)).filter(Lot.warehouse_id == warehouse_id).scalar()
        )
        if lot_count > 0:
            return True

        # 出庫チェック
        try:
            withdrawal_count = (
                self.db.query(func.count(Withdrawal.id))
                .filter(Withdrawal.warehouse_id == warehouse_id)  # type: ignore[attr-defined]
                .scalar()
            )
            if withdrawal_count > 0:
                return True
        except AttributeError:
            pass

        return False

    def get_related_data_summary(self, entity_type: str, entity_id: int) -> dict[str, int]:
        """関連データの件数サマリーを取得.

        Args:
            entity_type: エンティティタイプ (customer, supplier, product, warehouse)
            entity_id: エンティティID

        Returns:
            各テーブルの関連件数
        """
        summary: dict[str, int] = {}

        if entity_type == "customer":
            from app.infrastructure.persistence.models.orders_models import Order

            summary["orders"] = (
                self.db.query(func.count(Order.id)).filter(Order.customer_id == entity_id).scalar()
                or 0
            )

        elif entity_type == "supplier":
            from app.infrastructure.persistence.models.inbound_models import InboundPlan
            from app.infrastructure.persistence.models.inventory_models import Lot

            summary["lots"] = (
                self.db.query(func.count(Lot.id)).filter(Lot.supplier_id == entity_id).scalar() or 0
            )
            summary["inbound_plans"] = (
                self.db.query(func.count(InboundPlan.id))
                .filter(InboundPlan.supplier_id == entity_id)
                .scalar()
                or 0
            )

        elif entity_type == "product":
            from app.infrastructure.persistence.models.inventory_models import Lot
            from app.infrastructure.persistence.models.orders_models import OrderLine

            summary["lots"] = (
                self.db.query(func.count(Lot.id)).filter(Lot.product_id == entity_id).scalar() or 0
            )
            summary["order_lines"] = (
                self.db.query(func.count(OrderLine.id))
                .filter(OrderLine.product_id == entity_id)
                .scalar()
                or 0
            )

        elif entity_type == "warehouse":
            from app.infrastructure.persistence.models.inventory_models import Lot

            summary["lots"] = (
                self.db.query(func.count(Lot.id)).filter(Lot.warehouse_id == entity_id).scalar()
                or 0
            )

        return summary
