"""SAP Integration router (Mock)."""

import random
import time

from fastapi import APIRouter, Depends

from app.api.deps import get_db
from app.schemas.integration.sap_schema import (
    SAPOrderRegistrationRequest,
    SAPOrderRegistrationResponse,
    SAPOrderRegistrationResult,
)

router = APIRouter(prefix="/integration/sap", tags=["integration"])


@router.post("/sales-orders", response_model=SAPOrderRegistrationResponse)
async def register_sales_orders(
    request: SAPOrderRegistrationRequest,
) -> SAPOrderRegistrationResponse:
    """Register sales orders to SAP (Mock implementation).

    This endpoint simulates the registration of sales orders to SAP ERP.
    It returns dummy SAP order numbers for the provided order IDs.
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
