"""Mock SAP client for inventory synchronization.

This is a mock implementation for testing and development.
In production, replace with actual SAP API client.
"""

import random
from datetime import datetime
from decimal import Decimal


class SAPMockClient:
    """Mock SAP client for inventory sync.

    本番環境では実際のSAP APIクライアントに置き換え。
    """

    def get_total_inventory(self, params: dict | None = None) -> dict:
        """SAP側の在庫合計を取得（モック実装）.

        Args:
            params: クエリパラメータ（将来の拡張用）

        Returns:
            dict: {
                product_id: {
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

        for product_id in range(1, 21):
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

            mock_data[product_id] = {
                "sap_total": Decimal(str(round(sap_qty, 2))),
                "timestamp": datetime.now(),
            }

        return mock_data
