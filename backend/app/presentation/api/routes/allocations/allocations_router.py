from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.application.services.allocations import actions
from app.core.database import get_db
from app.presentation.schemas.allocations.allocations_schema import (
    BulkAutoAllocateRequest,
    BulkAutoAllocateResponse,
)


router = APIRouter()


@router.post("/bulk-auto-allocate", response_model=BulkAutoAllocateResponse)
def bulk_auto_allocate(
    request: BulkAutoAllocateRequest,
    db: Session = Depends(get_db),
) -> BulkAutoAllocateResponse:
    """Group-based bulk auto-allocation using FEFO strategy.

    Can filter by product, customer, delivery_place, and order_type.
    """
    try:
        result = actions.auto_allocate_bulk(
            db,
            product_id=request.product_id,
            customer_id=request.customer_id,
            delivery_place_id=request.delivery_place_id,
            order_type=request.order_type,
            skip_already_allocated=request.skip_already_allocated,
        )
        result["message"] = (
            f"処理数: {result['processed_lines']}件, "
            f"引当数: {result['allocated_lines']}件, "
            f"作成: {result['total_allocations']}ロット"
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
