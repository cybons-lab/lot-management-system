"""Allocation endpoints using FEFO strategy."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.schemas import (
    FefoCommitResponse,
    FefoLineAllocation,
    FefoLotAllocation,
    FefoPreviewRequest,
    FefoPreviewResponse,
)
from app.services.allocations import (
    AllocationCommitError,
    commit_fefo_allocation,
    preview_fefo_allocation,
)

router = APIRouter(tags=["allocations"])


def _to_preview_response(service_result) -> FefoPreviewResponse:
    lines = []
    for line in service_result.lines:
        lot_items = [
            FefoLotAllocation(
                lot_id=alloc.lot_id,
                lot_number=alloc.lot_number,
                allocate_qty=alloc.allocate_qty,
                expiry_date=alloc.expiry_date,
                receipt_date=alloc.receipt_date,
            )
            for alloc in line.allocations
        ]
        lines.append(
            FefoLineAllocation(
                order_line_id=line.order_line_id,
                product_code=line.product_code,
                required_qty=line.required_qty,
                already_allocated_qty=line.already_allocated_qty,
                allocations=lot_items,
                next_div=line.next_div,
                warnings=line.warnings,
            )
        )
    return FefoPreviewResponse(order_id=service_result.order_id, lines=lines, warnings=service_result.warnings)


@router.post("/allocations/preview", response_model=FefoPreviewResponse)
def preview_allocations(
    request: FefoPreviewRequest, db: Session = Depends(get_db)
) -> FefoPreviewResponse:
    """Preview FEFO allocation results without mutating inventory."""

    try:
        result = preview_fefo_allocation(db, request.order_id)
    except ValueError as exc:  # order not found or invalid status
        message = str(exc)
        status = 404 if "not found" in message.lower() else 400
        raise HTTPException(status_code=status, detail=message)

    return _to_preview_response(result)


@router.post("/orders/{order_id}/allocate", response_model=FefoCommitResponse)
def allocate_order(order_id: int, db: Session = Depends(get_db)) -> FefoCommitResponse:
    """Commit FEFO allocation for the given order."""

    try:
        result = commit_fefo_allocation(db, order_id)
    except ValueError as exc:
        message = str(exc)
        status = 404 if "not found" in message.lower() else 400
        raise HTTPException(status_code=status, detail=message)
    except AllocationCommitError as exc:
        raise HTTPException(status_code=409, detail=str(exc))

    preview_response = _to_preview_response(result.preview)
    created_ids = [alloc.id for alloc in result.created_allocations]
    return FefoCommitResponse(
        order_id=order_id,
        created_allocation_ids=created_ids,
        preview=preview_response,
    )

