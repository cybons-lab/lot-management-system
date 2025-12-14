from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.application.services.allocations import actions, fefo
from app.application.services.allocations.schemas import (
    AllocationCommitError,
    AllocationNotFoundError,
    InsufficientStockError,
)
from app.application.services.inventory.stock_calculation import get_available_quantity
from app.core.database import get_db
from app.presentation.schemas.allocations.allocations_schema import (
    AllocationCommitRequest,
    AllocationCommitResponse,
    BulkAutoAllocateRequest,
    BulkAutoAllocateResponse,
    BulkCancelRequest,
    BulkCancelResponse,
    FefoLineAllocation,
    FefoLotAllocation,
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


def _map_fefo_preview(result) -> FefoPreviewResponse:
    """Map internal FefoPreviewResult to FefoPreviewResponse schema."""
    lines = []
    for line_plan in result.lines:
        allocations = [
            FefoLotAllocation(
                lot_id=plans.lot_id,
                lot_number=plans.lot_number,
                allocated_quantity=plans.allocate_qty,
                expiry_date=plans.expiry_date,
                received_date=plans.receipt_date,
            )
            for plans in line_plan.allocations
        ]
        lines.append(
            FefoLineAllocation(
                order_line_id=line_plan.order_line_id,
                product_id=line_plan.product_id or 0,  # Handle None safety
                order_quantity=line_plan.required_qty,  # Mapped from required_qty
                already_allocated_quantity=line_plan.already_allocated_qty,
                allocations=allocations,
                warnings=line_plan.warnings,
            )
        )
    return FefoPreviewResponse(
        order_id=result.order_id,
        lines=lines,
        warnings=result.warnings,
    )


@router.post("/preview", response_model=FefoPreviewResponse)
def preview_allocation(
    request: FefoPreviewRequest,
    db: Session = Depends(get_db),
) -> FefoPreviewResponse:
    """FEFO allocation preview."""
    try:
        result = fefo.preview_fefo_allocation(db, request.order_id)
        return _map_fefo_preview(result)
    except ValueError as e:
        if "not found" in str(e).lower():
            raise HTTPException(status_code=404, detail=str(e))
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
        result = actions.commit_fefo_reservation(db, request.order_id)

        # Map internal result to schema
        created_ids = [a.id for a in result.created_reservations]
        preview_response = _map_fefo_preview(result.preview)

        return AllocationCommitResponse(
            order_id=request.order_id,
            created_allocation_ids=created_ids,
            preview=preview_response,
            status="committed",
            message="Commit successful",
        )
    except ValueError as e:
        if "not found" in str(e).lower():
            raise HTTPException(status_code=404, detail=str(e))
        raise HTTPException(status_code=400, detail=str(e))
    except AllocationCommitError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception:
        raise  # グローバルハンドラに委譲


@router.post("/drag-assign", response_model=ManualAllocationResponse)
def manual_allocate(
    request: ManualAllocationRequest,
    db: Session = Depends(get_db),
) -> ManualAllocationResponse:
    """Manual allocation (Drag & Assign)."""
    try:
        reservation = actions.create_manual_reservation(
            db,
            request.order_line_id,
            request.lot_id,
            float(request.allocated_quantity),
        )

        # Ensure relationships are loaded for response
        db.refresh(reservation)
        lot = reservation.lot
        available_qty = get_available_quantity(db, lot)

        return ManualAllocationResponse(
            id=reservation.id,
            order_line_id=reservation.source_id,
            lot_id=reservation.lot_id,
            lot_number=lot.lot_number if lot else "",
            allocated_quantity=reservation.reserved_qty,
            available_quantity=available_qty,
            product_id=lot.product_id if lot else 0,
            expiry_date=lot.expiry_date if lot else None,
            status="preview",
            message="Reservation created",
        )
    except ValueError as e:
        err_msg = str(e).lower()
        if "product mismatch" in err_msg:
            raise HTTPException(status_code=404, detail=str(e))
        if "insufficient" in err_msg:
            raise HTTPException(status_code=409, detail=str(e))
        if "not found" in err_msg:
            raise HTTPException(status_code=404, detail=str(e))
        raise HTTPException(status_code=400, detail=str(e))
    except AllocationCommitError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception:
        raise  # グローバルハンドラに委譲


@router.patch("/{allocation_id}/confirm", response_model=HardAllocationConfirmResponse)
def confirm_allocation(
    allocation_id: int,
    request: HardAllocationConfirmRequest,
    db: Session = Depends(get_db),
) -> HardAllocationConfirmResponse:
    """Confirm allocation (Soft to Hard)."""
    try:
        # returns confirmed reservation
        confirmed_res = actions.confirm_reservation(
            db,
            allocation_id,
            confirmed_by=request.confirmed_by,
        )

        return HardAllocationConfirmResponse(
            id=confirmed_res.id,
            order_line_id=confirmed_res.source_id,
            lot_id=confirmed_res.lot_id,
            allocated_quantity=confirmed_res.reserved_qty,
            allocation_type="hard" if confirmed_res.status.value == "confirmed" else "soft",
            status=confirmed_res.status.value,
            confirmed_at=confirmed_res.confirmed_at,
            confirmed_by=None,
        )
    except ValueError as e:
        err_msg = str(e).lower()
        if "not found" in err_msg:
            raise HTTPException(
                status_code=404, detail={"error": "ALLOCATION_NOT_FOUND", "message": str(e)}
            )
        if "already confirmed" in err_msg:
            raise HTTPException(
                status_code=400, detail={"error": "ALREADY_CONFIRMED", "message": str(e)}
            )
        if "insufficient" in err_msg:
            raise HTTPException(
                status_code=409, detail={"error": "INSUFFICIENT_STOCK", "message": str(e)}
            )
        raise HTTPException(status_code=400, detail=str(e))
    except AllocationCommitError as e:
        # Map known error codes
        if getattr(e, "error_code", "") == "ALREADY_CONFIRMED":
            raise HTTPException(
                status_code=400, detail={"error": "ALREADY_CONFIRMED", "message": str(e)}
            )
        if getattr(e, "error_code", "") == "LOT_NOT_FOUND":
            raise HTTPException(
                status_code=404, detail={"error": "LOT_NOT_FOUND", "message": str(e)}
            )

        raise HTTPException(status_code=400, detail=str(e))
    except AllocationNotFoundError as e:
        raise HTTPException(
            status_code=404, detail={"error": "ALLOCATION_NOT_FOUND", "message": str(e)}
        )
    except InsufficientStockError as e:
        raise HTTPException(
            status_code=409,
            detail={
                "error": "INSUFFICIENT_STOCK",
                "message": str(e),
                "lot_id": e.lot_id,
                "lot_number": e.lot_number,
                "required": e.required,
                "available": e.available,
            },
        )


@router.post("/confirm-batch", response_model=HardAllocationBatchConfirmResponse)
def confirm_allocations_batch(
    request: HardAllocationBatchConfirmRequest,
    db: Session = Depends(get_db),
) -> HardAllocationBatchConfirmResponse:
    """Batch confirm allocations."""
    # returns (confirmed_ids, failed_items)
    confirmed_ids, failed_items = actions.confirm_reservations_batch(
        db,
        request.allocation_ids,
        confirmed_by=request.confirmed_by,
    )

    return HardAllocationBatchConfirmResponse(confirmed=confirmed_ids, failed=failed_items)


@router.delete("/{allocation_id}", status_code=status.HTTP_204_NO_CONTENT)
def cancel_allocation(
    allocation_id: int,
    db: Session = Depends(get_db),
):
    """Cancel allocation."""
    try:
        actions.release_reservation(db, allocation_id)
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
    cancelled, failed = actions.bulk_release_reservations(db, request.allocation_ids)

    msg = f"Cancelled {len(cancelled)} allocations"
    if failed:
        msg += f", failed {len(failed)}"

    return BulkCancelResponse(cancelled_ids=cancelled, failed_ids=failed, message=msg)


@router.post("/bulk-auto-allocate", response_model=BulkAutoAllocateResponse)
def bulk_auto_allocate(
    request: BulkAutoAllocateRequest,
    db: Session = Depends(get_db),
) -> BulkAutoAllocateResponse:
    """Group-based bulk auto-allocation using FEFO strategy.

    Can filter by product, customer, delivery_place, and order_type.
    """
    try:
        result = actions.auto_reserve_bulk(
            db,
            product_id=request.product_id,
            customer_id=request.customer_id,
            delivery_place_id=request.delivery_place_id,
            order_type=request.order_type,
            skip_already_reserved=request.skip_already_allocated,
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
    except Exception:
        raise  # グローバルハンドラに委譲
