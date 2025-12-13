from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.application.services.allocations import actions, fefo
from app.application.services.allocations.schemas import AllocationCommitError
from app.core.database import get_db
from app.presentation.schemas.allocations.allocations_schema import (
    AllocationCommitRequest,
    AllocationCommitResponse,
    BulkAutoAllocateRequest,
    BulkAutoAllocateResponse,
    BulkCancelRequest,
    BulkCancelResponse,
    FefoPreviewRequest,
    FefoPreviewResponse,
    HardAllocationBatchConfirmRequest,
    HardAllocationBatchConfirmResponse,
    HardAllocationConfirmRequest,
    HardAllocationConfirmResponse,
    ManualAllocationRequest,
    ManualAllocationResponse,
)

router = APIRouter()


@router.post("/preview", response_model=FefoPreviewResponse)
def preview_allocation(
    request: FefoPreviewRequest,
    db: Session = Depends(get_db),
) -> FefoPreviewResponse:
    """FEFO allocation preview."""
    try:
        result = fefo.preview_fefo_allocation(db, request.order_id)
        return FefoPreviewResponse(**result.__dict__)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/commit", response_model=AllocationCommitResponse)
def commit_allocation(
    request: AllocationCommitRequest,
    db: Session = Depends(get_db),
) -> AllocationCommitResponse:
    """Commit FEFO allocation."""
    try:
        result = actions.commit_fefo_allocation(db, request.order_id)
        return result
    except ValueError as e:
        if "not found" in str(e).lower():
            raise HTTPException(status_code=404, detail=str(e))
        raise HTTPException(status_code=400, detail=str(e))
    except AllocationCommitError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/drag-assign", response_model=ManualAllocationResponse)
def manual_allocate(
    request: ManualAllocationRequest,
    db: Session = Depends(get_db),
) -> ManualAllocationResponse:
    """Manual allocation (Drag & Assign)."""
    try:
        result = actions.allocate_manually(
            db,
            request.order_line_id,
            request.lot_id,
            float(request.allocated_quantity),
        )
        return result
    except ValueError as e:
        err_msg = str(e).lower()
        if "product mismatch" in err_msg:
            raise HTTPException(status_code=404, detail=str(e))
        if "insufficient" in err_msg:
            raise HTTPException(status_code=409, detail=str(e))
        raise HTTPException(status_code=400, detail=str(e))
    except AllocationCommitError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{allocation_id}/confirm", response_model=HardAllocationConfirmResponse)
def confirm_allocation(
    allocation_id: int,
    request: HardAllocationConfirmRequest,
    db: Session = Depends(get_db),
) -> HardAllocationConfirmResponse:
    """Confirm allocation (Soft to Hard)."""
    try:
        result = actions.confirm_hard_allocation(
            db,
            allocation_id,
            request.confirmed_by,
            float(request.quantity) if request.quantity else None,
        )
        return result
    except ValueError as e:
        err_msg = str(e).lower()
        if "not found" in err_msg:
            raise HTTPException(status_code=404, detail="ALLOCATION_NOT_FOUND")
        if "already confirmed" in err_msg:
            raise HTTPException(status_code=400, detail={"error": "ALREADY_CONFIRMED"})
        if "insufficient" in err_msg:
             raise HTTPException(status_code=409, detail={"error": "INSUFFICIENT_STOCK"})
        raise HTTPException(status_code=400, detail=str(e))
    except AllocationCommitError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/confirm-batch", response_model=HardAllocationBatchConfirmResponse)
def confirm_allocations_batch(
    request: HardAllocationBatchConfirmRequest,
    db: Session = Depends(get_db),
) -> HardAllocationBatchConfirmResponse:
    """Batch confirm allocations."""
    # Batch confirm logic handles errors internally and returns failed_ids?
    # confirm_hard_allocations_batch returns {confirmed: [], failed: []}
    result = actions.confirm_hard_allocations_batch(
        db,
        request.allocation_ids,
        request.confirmed_by,
    )
    return result


@router.delete("/{allocation_id}", status_code=status.HTTP_204_NO_CONTENT)
def cancel_allocation(
    allocation_id: int,
    db: Session = Depends(get_db),
):
    """Cancel allocation."""
    try:
        actions.cancel_allocation(db, allocation_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except AllocationCommitError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/bulk-cancel", response_model=BulkCancelResponse)
def bulk_cancel(
    request: BulkCancelRequest,
    db: Session = Depends(get_db),
) -> BulkCancelResponse:
    """Bulk cancel allocations."""
    result = actions.bulk_cancel_allocations(db, request.allocation_ids)
    return result


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
        # Helper string construction moved to logic or kept here if simple
        # Assuming result is a dict with necessary fields
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
