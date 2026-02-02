"""Mock SAP client for inventory synchronization.

This is a mock implementation for testing and development. In
production, replace with actual SAP API client.
"""

import random
from datetime import timedelta
from decimal import Decimal

from app.core.time_utils import utcnow


class SAPMockClient:
    """TODO: [MOCK] Mock SAP client for inventory sync.

    本番環境では実際のSAP APIクライアントに置き換え。
    """

    def get_total_inventory(self, params: dict | None = None) -> dict:
        """SAP側の在庫合計を取得（モック実装）.

        Args:
            params: クエリパラメータ（将来の拡張用）

        Returns:
            dict: {
                supplier_item_id: {
                    "sap_total": Decimal,
                    "timestamp": datetime
                }
            }

        Note:
            モック実装では、ランダムな差異を生成してテストを容易にする。
            本番環境では、実際のSAP REST APIまたはRFCを呼び出す。
        """
        # モック: 商品ID 1-20 の在庫データを生成
        mock_data = {}

        for supplier_item_id in range(1, 21):
            # ベース数量（100-1000の範囲）
            base_qty = random.randint(100, 1000)

            # 90%の確率で一致、10%の確率で差異あり
            if random.random() < 0.9:
                # 一致（±0.5%の微小な差異）
                variance = random.uniform(-0.005, 0.005)
                sap_qty = base_qty * (1 + variance)
            else:
                # 差異あり（±2-10%）
                variance = random.choice([random.uniform(-0.1, -0.02), random.uniform(0.02, 0.1)])
                sap_qty = base_qty * (1 + variance)

            mock_data[supplier_item_id] = {
                "sap_total": Decimal(str(round(sap_qty, 2))),
                "timestamp": utcnow(),
            }

        return mock_data

    def get_inbound_orders(self) -> list[dict]:
        """入荷予定（発注残）のモックデータを返す.

        Returns:
            list[dict]: 入荷予定の一覧

        Notes:
            - UI確認のため、日付は現在日からの相対値で生成
            - 数量はDecimalで返し、単位も併せて提供
        """
        today = utcnow().date()

        return [
            {
                "po_number": "PO-2025-0001",
                "supplier_code": "SUP-001",
                "supplier_name": "北海物産",
                "warehouse_code": "TOKYO",
                "warehouse_name": "東京第1倉庫",
                "expected_date": (today + timedelta(days=3)).isoformat(),
                "items": [
                    {
                        "customer_part_no": "CUST-001-PRD-1001",
                        "product_name": "サーモン切り身 10kg",
                        "quantity": Decimal("1200"),
                        "unit": "KG",
                    },
                    {
                        "customer_part_no": "CUST-001-PRD-1002",
                        "product_name": "冷凍ホタテ M",
                        "quantity": Decimal("850"),
                        "unit": "KG",
                    },
                ],
            },
            {
                "po_number": "PO-2025-0002",
                "supplier_code": "SUP-004",
                "supplier_name": "南洋商事",
                "warehouse_code": "OSAKA",
                "warehouse_name": "大阪南港センター",
                "expected_date": (today + timedelta(days=7)).isoformat(),
                "items": [
                    {
                        "customer_part_no": "CUST-002-PRD-2005",
                        "product_name": "ココナッツウォーター 500ml",
                        "quantity": Decimal("3600"),
                        "unit": "EA",
                    }
                ],
            },
            {
                "po_number": "PO-2025-0003",
                "supplier_code": "SUP-002",
                "supplier_name": "東亜水産",
                "warehouse_code": "FUKUOKA",
                "warehouse_name": "福岡空港DC",
                "expected_date": (today + timedelta(days=12)).isoformat(),
                "items": [
                    {
                        "customer_part_no": "CUST-003-PRD-3007",
                        "product_name": "エビ（L/26-30）",
                        "quantity": Decimal("540"),
                        "unit": "CASE",
                    },
                    {
                        "customer_part_no": "CUST-003-PRD-3010",
                        "product_name": "蟹ミソパック",
                        "quantity": Decimal("120"),
                        "unit": "CASE",
                    },
                ],
            },
        ]
