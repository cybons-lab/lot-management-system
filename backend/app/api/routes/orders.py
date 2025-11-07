# backend/app/api/routes/orders.py
"""Order API routes including stock validation endpoint."""

from __future__ import annotations

from fastapi import Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.domain.errors import InsufficientStockError
from app.schemas import (
    OrderValidationErrorData,
    OrderValidationRequest,
    OrderValidationResponse,
)
from app.services.orders.validation import OrderLineDemand, OrderValidationService

from .orders_refactored import router as router


@router.post("/validate", response_model=OrderValidationResponse, summary="受注在庫検証")
def validate_order_stock(
    request: OrderValidationRequest,
    lock: bool = True,
    db: Session = Depends(get_db),
) -> OrderValidationResponse:
    """Validate that each requested order line can be fulfilled by available stock."""

    service = OrderValidationService(db)
    demands = [
        OrderLineDemand(
            product_code=line.product_code,
            warehouse_code=line.warehouse_code,
            quantity=line.quantity,
        )
        for line in request.lines
    ]

    try:
        service.validate_lines(demands, ship_date=request.ship_date, lock=lock)
    except InsufficientStockError as exc:
        return OrderValidationResponse(
            ok=False,
            message=str(exc),
            data=OrderValidationErrorData(
                product_code=exc.product_code,
                required=exc.required,
                available=exc.available,
                details=exc.details,
            ),
        )

    return OrderValidationResponse(ok=True, message="在庫で充足可能です。", data=None)


from .orders_refactored import *  # noqa: F401,F403,E402
