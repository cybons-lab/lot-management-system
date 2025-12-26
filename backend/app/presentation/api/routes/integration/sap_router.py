"""SAP Integration router (Mock)."""

import random
import time

from fastapi import APIRouter

from app.presentation.schemas.integration.sap_schema import (
    SAPOrderRegistrationRequest,
    SAPOrderRegistrationResponse,
    SAPOrderRegistrationResult,
)


router = APIRouter(prefix="/integration/sap", tags=["integration"])


@router.post("/sales-orders", response_model=SAPOrderRegistrationResponse)
async def register_sales_orders(
    request: SAPOrderRegistrationRequest,
) -> SAPOrderRegistrationResponse:
    """受注をSAPに登録（モック実装）.

    SAPシステムへの受注登録をシミュレートします。
    提供された受注IDに対してダミーのSAP受注番号を返します。

    Args:
        request: SAP受注登録リクエスト（受注IDリスト）

    Returns:
        SAPOrderRegistrationResponse: 登録結果（受注ID、SAP受注番号、ステータス）

    Note:
        現在はモック実装です。本番環境では実際のSAP APIに接続します。
        1秒のネットワーク遅延をシミュレートしています。
    """
    # Simulate network latency
    time.sleep(1)

    results = []
    for order_id in request.order_ids:
        # Generate dummy SAP Order No (e.g., SAP-000123)
        dummy_sap_no = f"SAP-{random.randint(100000, 999999)}"

        results.append(
            SAPOrderRegistrationResult(
                order_id=order_id,
                sap_order_no=dummy_sap_no,
                status="registered",
            )
        )

    return SAPOrderRegistrationResponse(
        status="success",
        registered_count=len(results),
        results=results,
    )
