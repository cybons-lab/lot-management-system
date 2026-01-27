"""API v2 Allocation router.

P3: Uses LotReservation instead of Allocation.
"""

from __future__ import annotations

import logging
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.application.services.allocations.actions import (
    commit_fefo_reservation,
    create_manual_reservation,
    release_reservation,
)
from app.application.services.allocations.fefo import preview_fefo_allocation
from app.application.services.allocations.schemas import AllocationNotFoundError
from app.application.services.inventory.stock_calculation import get_available_quantity
from app.infrastructure.persistence.models import LotReceipt, OrderLine
from app.infrastructure.persistence.models.lot_reservations_model import (
    LotReservation,
    ReservationSourceType,
    ReservationStatus,
)
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
                product_group_id=line.product_group_id,
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
        result = commit_fefo_reservation(db, request.order_id)
    except ValueError as exc:
        message = str(exc)
        if "not found" in message.lower():
            raise HTTPException(status_code=404, detail=message) from exc
        raise HTTPException(status_code=400, detail=message) from exc

    preview_response = _to_preview_response(result.preview)
    # P3: Use created_reservations instead of created_allocations
    created_ids = [res.id for res in result.created_reservations]

    return AllocationCommitResponse(
        order_id=request.order_id,
        created_allocation_ids=created_ids,
        preview=preview_response,
        status="committed",
        message=f"引当確定成功。{len(created_ids)}件の予約を作成しました。",
    )


@router.post("/manual", response_model=ManualAllocationResponse)
async def manual_allocate(request: ManualAllocationRequest, db: Session = Depends(get_db)):
    try:
        reservation = create_manual_reservation(
            db,
            order_line_id=request.order_line_id,
            lot_id=request.lot_id,
            quantity=request.allocated_quantity,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    lot = db.query(LotReceipt).filter(LotReceipt.id == request.lot_id).first()
    available = get_available_quantity(db, lot) if lot else Decimal("0")

    # P3: Map LotReservation fields to response
    lot_number = lot.lot_number if lot else ""
    res_status = "allocated" if reservation.status == ReservationStatus.ACTIVE else "confirmed"

    return ManualAllocationResponse(
        id=reservation.id,
        order_line_id=request.order_line_id,
        lot_id=request.lot_id,
        lot_number=lot_number,
        allocated_quantity=reservation.reserved_qty,
        available_quantity=Decimal(available),
        product_group_id=lot.product_group_id if lot else 0,
        expiry_date=lot.expiry_date if lot else None,
        status=res_status,
        message="manual reservation created",
    )


@router.delete("/{allocation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_allocation(allocation_id: int, db: Session = Depends(get_db)):
    try:
        release_reservation(db, allocation_id)
        return None
    except AllocationNotFoundError:
        raise HTTPException(status_code=404, detail="reservation not found")


@router.get("/by-order/{order_id}", response_model=list[ManualAllocationResponse])
async def list_allocations_by_order(order_id: int, db: Session = Depends(get_db)):
    # P3: Query LotReservation instead of Allocation
    from sqlalchemy import select

    stmt = (
        select(LotReservation)
        .join(OrderLine, LotReservation.source_id == OrderLine.id)
        .where(
            LotReservation.source_type == ReservationSourceType.ORDER,
            LotReservation.status != ReservationStatus.RELEASED,
            OrderLine.order_id == order_id,
        )
        .order_by(LotReservation.id)
    )

    reservations = db.execute(stmt).scalars().all()
    responses: list[ManualAllocationResponse] = []

    # Pre-fetch lots needed
    lot_ids = {res.lot_id for res in reservations if res.lot_id}
    lots = {}
    if lot_ids:
        lots = {l.id: l for l in db.query(LotReceipt).filter(LotReceipt.id.in_(lot_ids)).all()}

    for res in reservations:
        lot = lots.get(res.lot_id) if res.lot_id else None
        lot_id = res.lot_id or 0
        available_quantity = get_available_quantity(db, lot) if lot else Decimal("0")

        order_line = db.get(OrderLine, res.source_id)
        product_group_id = (
            order_line.product_group_id if order_line else (lot.product_group_id if lot else 0)
        )

        res_status = "allocated" if res.status == ReservationStatus.ACTIVE else "confirmed"

        responses.append(
            ManualAllocationResponse(
                id=res.id,
                order_line_id=res.source_id or 0,
                lot_id=lot_id,
                lot_number=lot.lot_number if lot else "",
                allocated_quantity=res.reserved_qty,
                available_quantity=Decimal(available_quantity),
                product_group_id=product_group_id or 0,
                expiry_date=lot.expiry_date if lot else None,
                status=res_status,
                message="",
            )
        )
    return responses
