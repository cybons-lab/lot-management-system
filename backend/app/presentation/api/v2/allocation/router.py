"""API v2 Allocation router."""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.application.services.allocations.actions import (
    allocate_manually,
    cancel_allocation,
    commit_fefo_allocation,
)
from app.application.services.allocations.fefo import preview_fefo_allocation
from app.application.services.allocations.schemas import AllocationNotFoundError
from app.application.services.inventory.stock_calculation import get_available_quantity
from app.infrastructure.persistence.models import Allocation, Lot
from app.presentation.api.deps import get_db
from app.presentation.schemas.allocations.allocations_schema import (
    AllocationCommitRequest,
    AllocationCommitResponse,
    FefoLineAllocation,
    FefoLotAllocation,
    FefoPreviewRequest,
    FefoPreviewResponse,
    ManualAllocationRequest,
    ManualAllocationResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter()


def _to_preview_response(service_result) -> FefoPreviewResponse:
    lines = []
    for line in service_result.lines:
        lot_items = [
            FefoLotAllocation(
                lot_id=alloc.lot_id,
                lot_number=alloc.lot_number,
                allocated_quantity=alloc.allocate_qty,
                expiry_date=alloc.expiry_date,
                received_date=alloc.receipt_date,
            )
            for alloc in line.allocations
        ]
        lines.append(
            FefoLineAllocation(  # type: ignore[call-arg]
                order_line_id=line.order_line_id,
                product_id=line.product_id,
                product_code=line.product_code,
                order_quantity=line.required_qty,
                already_allocated_quantity=line.already_allocated_qty,
                allocations=lot_items,
                next_div=line.next_div,
                warnings=line.warnings,
            )
        )
    return FefoPreviewResponse(
        order_id=service_result.order_id, lines=lines, warnings=service_result.warnings
    )


@router.post("/preview", response_model=FefoPreviewResponse)
async def preview_allocations(request: FefoPreviewRequest, db: Session = Depends(get_db)):
    try:
        result = preview_fefo_allocation(db, request.order_id)
        return _to_preview_response(result)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/commit", response_model=AllocationCommitResponse)
async def commit_allocation(request: AllocationCommitRequest, db: Session = Depends(get_db)):
    try:
        result = commit_fefo_allocation(db, request.order_id)
    except ValueError as exc:
        message = str(exc)
        if "not found" in message.lower():
            raise HTTPException(status_code=404, detail=message) from exc
        raise HTTPException(status_code=400, detail=message) from exc

    preview_response = _to_preview_response(result.preview)
    created_ids = [alloc.id for alloc in result.created_allocations]

    return AllocationCommitResponse(
        order_id=request.order_id,
        created_allocation_ids=created_ids,
        preview=preview_response,
        status="committed",
        message=f"引当確定成功。{len(created_ids)}件の引当を作成しました。",
    )


@router.post("/manual", response_model=ManualAllocationResponse)
async def manual_allocate(request: ManualAllocationRequest, db: Session = Depends(get_db)):
    try:
        allocation = allocate_manually(
            db,
            order_line_id=request.order_line_id,
            lot_id=request.lot_id,
            quantity=request.allocated_quantity,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    lot = db.query(Lot).filter(Lot.id == request.lot_id).first()
    available = get_available_quantity(db, lot) if lot else 0

    return ManualAllocationResponse(
        order_line_id=request.order_line_id,
        lot_id=request.lot_id,
        lot_number=allocation.lot_reference or "",
        allocated_quantity=allocation.allocated_quantity,
        available_quantity=available,
        product_id=allocation.product_id,
        expiry_date=allocation.expiry_date,
        status=allocation.status,
        message="manual allocation created",
    )


@router.delete("/{allocation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_allocation(allocation_id: int, db: Session = Depends(get_db)):
    try:
        cancel_allocation(db, allocation_id)
        return None
    except AllocationNotFoundError:
        raise HTTPException(status_code=404, detail="allocation not found")


@router.get("/by-order/{order_id}", response_model=list[ManualAllocationResponse])
async def list_allocations_by_order(order_id: int, db: Session = Depends(get_db)):
    allocations = (
        db.query(Allocation).filter(Allocation.order_id == order_id).order_by(Allocation.id).all()
    )
    responses: list[ManualAllocationResponse] = []
    for alloc in allocations:
        lot = db.get(Lot, alloc.lot_id) if alloc.lot_id else None
        available_quantity = get_available_quantity(db, lot) if lot else 0
        responses.append(
            ManualAllocationResponse(
                order_line_id=alloc.order_line_id,
                lot_id=alloc.lot_id,
                lot_number=alloc.lot_reference or "",
                allocated_quantity=alloc.allocated_quantity,
                available_quantity=available_quantity,
                product_id=alloc.product_id,
                expiry_date=alloc.expiry_date,
                status=alloc.status,
                message="",
            )
        )
    return responses
