"""Inventory synchronization service for SAP integration."""

from datetime import datetime
from decimal import Decimal

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.infrastructure.external.sap_mock_client import SAPMockClient
from app.infrastructure.persistence.models.logs_models import BusinessRule


class InventorySyncService:
    """Service for SAP inventory synchronization."""

    # 許容差異率（パーセント）
    TOLERANCE_PCT = 1.0

    def __init__(self, db: Session):
        """Initialize service with database session."""
        self.db = db
        self.sap_client = SAPMockClient()

    def check_inventory_totals(self) -> dict:
        """在庫トータルチェック実行.

        1. ローカルDBから商品別在庫合計を計算
        2. SAPから商品別在庫合計を取得
        3. 差異を検出
        4. 差異があればBusinessRuleテーブルに記録

        Returns:
            dict: {
                "checked_products": int,
                "discrepancies_found": int,
                "alerts_created": int,
                "details": list[dict]
            }
        """
        # 1. ローカルDB集計
        local_totals = self._get_local_totals()

        # 2. SAP取得
        sap_totals = self.sap_client.get_total_inventory({})

        # 3. 差異検出
        discrepancies = self._find_discrepancies(local_totals, sap_totals)

        # 4. アラート作成（既存のBusinessRuleテーブルを活用）
        alerts = self._create_alerts(discrepancies)

        return {
            "checked_products": len(local_totals),
            "discrepancies_found": len(discrepancies),
            "alerts_created": len(alerts),
            "details": discrepancies,
        }

    def _get_local_totals(self) -> dict[int, Decimal]:
        """ローカルDBから商品別在庫合計を取得.

        Returns:
            dict: {product_id: total_quantity}
        """
        query = text(
            """
            SELECT 
                product_id,
                SUM(current_quantity) as total_quantity
            FROM lots
            WHERE status != 'deleted'
            GROUP BY product_id
        """
        )

        result = self.db.execute(query)
        local_totals = {}

        for row in result:
            product_id = row.product_id
            total_qty = Decimal(str(row.total_quantity)) if row.total_quantity else Decimal("0")
            local_totals[product_id] = total_qty

        return local_totals

    def _find_discrepancies(self, local: dict[int, Decimal], sap: dict[int, dict]) -> list[dict]:
        """差異検出.

        Args:
            local: ローカルDB在庫 {product_id: quantity}
            sap: SAP在庫 {product_id: {"sap_total": Decimal, "timestamp": datetime}}

        Returns:
            list: 差異リスト
        """
        discrepancies = []

        # ローカルDBにある商品をチェック
        for product_id, local_qty in local.items():
            sap_data = sap.get(product_id, {})
            sap_qty = sap_data.get("sap_total", Decimal("0"))

            # 差異率計算
            if sap_qty > 0:
                diff_pct = abs((local_qty - sap_qty) / sap_qty * 100)
            else:
                # SAP側が0の場合、ローカルに在庫があれば100%差異
                diff_pct = Decimal("100") if local_qty > 0 else Decimal("0")

            # 許容範囲を超えたら記録
            if diff_pct > Decimal(str(self.TOLERANCE_PCT)):
                discrepancies.append(
                    {
                        "product_id": product_id,
                        "local_qty": float(local_qty),
                        "sap_qty": float(sap_qty),
                        "diff_pct": float(diff_pct),
                        "diff_amount": float(local_qty - sap_qty),
                    }
                )

        return discrepancies

    def _create_alerts(self, discrepancies: list[dict]) -> list[BusinessRule]:
        """アラート作成.

        BusinessRuleテーブルに差異情報を記録。

        Args:
            discrepancies: 差異リスト

        Returns:
            list: 作成されたBusinessRuleレコード
        """
        created_alerts = []

        for disc in discrepancies:
            # 既存の同一商品のアラートを検索
            existing_alert = (
                self.db.query(BusinessRule)
                .filter(
                    BusinessRule.rule_code == f"inv_sync_alert_{disc['product_id']}",
                )
                .first()
            )

            if existing_alert:
                # 既存アラートを更新
                existing_alert.rule_name = f"在庫差異アラート: Product {disc['product_id']}"
                existing_alert.rule_type = "inventory_sync_alert"
                existing_alert.rule_parameters = {
                    "product_id": disc["product_id"],
                    "local_qty": disc["local_qty"],
                    "sap_qty": disc["sap_qty"],
                    "diff_pct": disc["diff_pct"],
                    "diff_amount": disc["diff_amount"],
                    "checked_at": datetime.now().isoformat(),
                }
                existing_alert.is_active = True
                existing_alert.updated_at = datetime.now()
                created_alerts.append(existing_alert)
            else:
                # 新しいアラート作成
                alert = BusinessRule(
                    rule_code=f"inv_sync_alert_{disc['product_id']}",
                    rule_name=f"在庫差異アラート: Product {disc['product_id']}",
                    rule_type="inventory_sync_alert",
                    rule_parameters={
                        "product_id": disc["product_id"],
                        "local_qty": disc["local_qty"],
                        "sap_qty": disc["sap_qty"],
                        "diff_pct": disc["diff_pct"],
                        "diff_amount": disc["diff_amount"],
                        "checked_at": datetime.now().isoformat(),
                    },
                    is_active=True,
                )
                self.db.add(alert)
                created_alerts.append(alert)

        if created_alerts:
            self.db.commit()

        return created_alerts
