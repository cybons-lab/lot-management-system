# app/api/routes/orders_validate.py
import logging
import traceback

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.schemas import (
    OrderValidationDetails,
    OrderValidationErrorData,
    OrderValidationLotAvailability,
    OrderValidationRequest,
    OrderValidationResponse,
)
from app.services.orders.validation_service import OrderLineDemand, OrderValidationService


router = APIRouter(prefix="/orders", tags=["orders"])
logger = logging.getLogger(__name__)


def get_db():
    from app.db.session import SessionLocal

    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/validate", response_model=OrderValidationResponse, summary="受注在庫検証")
def validate_order_stock(payload: OrderValidationRequest, db: Session = Depends(get_db)):
    try:
        # Convert request to domain objects
        demands = [
            OrderLineDemand(
                product_code=l.product_code,
                warehouse_code=l.warehouse_code,
                quantity=l.quantity,
            )
            for l in payload.lines
        ]

        # Call service
        result = OrderValidationService.validate(db=db, demands=demands, date=payload.ship_date)

        # Convert domain result to API schema
        if result.ok:
            return OrderValidationResponse(
                ok=True,
                message=result.message,
                data=None,
            )
        else:
            # Convert error_data dict to schema
            error_data = result.error_data or {}
            details_raw = error_data.get("details", {})
            per_lot_raw = details_raw.get("per_lot", [])

            per_lot = [
                OrderValidationLotAvailability(
                    lot_id=item["lot_id"],
                    available=item["available"],
                )
                for item in per_lot_raw
            ]

            return OrderValidationResponse(
                ok=False,
                message=result.message,
                data=OrderValidationErrorData(
                    product_code=error_data["product_code"],
                    required=error_data["required"],
                    available=error_data["available"],
                    details=OrderValidationDetails(
                        warehouse_code=details_raw.get("warehouse_code", ""),
                        per_lot=per_lot,
                        ship_date=payload.ship_date,
                    ),
                ),
            )

    except Exception as e:
        # ログにフルスタック
        logger.error("validate_order_stock failed: %s", e)
        logger.error(traceback.format_exc())
        # 開発中はメッセージを返して原因特定を優先（本番では500固定に戻す）
        raise HTTPException(status_code=500, detail=f"{type(e).__name__}: {e}")
