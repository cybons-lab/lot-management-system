"""Allocation endpoints using FEFO strategy and drag-assign compatibility."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.models import Allocation, Lot, LotCurrentStock, OrderLine
from app.schemas import (
    DragAssignRequest,
    FefoCommitResponse,
    FefoLineAllocation,
    FefoLotAllocation,
    FefoPreviewRequest,
    FefoPreviewResponse,
)

# ←ここまでは既存の import 群
# ↓ここを修正版に置き換えてください
from app.services.allocations_service import (
    AllocationCommitError,
    AllocationNotFoundError,
    cancel_allocation,
    commit_fefo_allocation,
    preview_fefo_allocation,
)


router = APIRouter(prefix="/allocations", tags=["allocations"])


# --- 追加: 旧 drag-assign 互換API ---
@router.post("/drag-assign")
def drag_assign_allocation(request: DragAssignRequest, db: Session = Depends(get_db)):
    """
    互換エンドポイント: ドラッグ引当
    ※元々 orders.py に存在したものを再実装（URL・I/O変更なし）.
    """
    order_line = db.query(OrderLine).filter(OrderLine.id == request.order_line_id).first()
    if not order_line:
        raise HTTPException(status_code=404, detail="受注明細が見つかりません")

    lot = db.query(Lot).filter(Lot.id == request.lot_id).first()
    if not lot:
        raise HTTPException(status_code=404, detail="ロットが見つかりません")

    stock = db.query(LotCurrentStock).filter(LotCurrentStock.lot_id == request.lot_id).first()
    current_qty = float(stock.current_quantity if stock else 0.0)
    if current_qty < request.allocate_qty:
        raise HTTPException(status_code=400, detail="Insufficient stock")

    allocation = Allocation(
        order_line_id=request.order_line_id,
        lot_id=request.lot_id,
        allocated_qty=float(request.allocate_qty),
        status="active",
    )
    db.add(allocation)
    stock.current_quantity = current_qty - float(request.allocate_qty)
    db.commit()
    db.refresh(allocation)
    db.refresh(stock)

    return {
        "success": True,
        "message": "引当成功",
        "allocation_id": allocation.id,
        "allocated_id": allocation.id,
        "remaining_lot_qty": stock.current_quantity,
    }


# --- 既存機能 ---
@router.delete("/{allocation_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_allocation(allocation_id: int, db: Session = Depends(get_db)):
    """引当取消（DELETE API, ソフトキャンセル対応）."""
    try:
        cancel_allocation(db, allocation_id)
    except AllocationNotFoundError:
        raise HTTPException(status_code=404, detail="allocation not found")
    return None


def _to_preview_response(service_result) -> FefoPreviewResponse:
    """Convert service result to API response schema."""
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
    return FefoPreviewResponse(
        order_id=service_result.order_id, lines=lines, warnings=service_result.warnings
    )


@router.post("/preview", response_model=FefoPreviewResponse)
def preview_allocations(
    request: FefoPreviewRequest, db: Session = Depends(get_db)
) -> FefoPreviewResponse:
    """在庫を変更しない FEFO 引当プレビュー."""
    try:
        result = preview_fefo_allocation(db, request.order_id)
    except ValueError as exc:
        message = str(exc)
        status_code = 404 if "not found" in message.lower() else 400
        raise HTTPException(status_code=status_code, detail=message)

    return _to_preview_response(result)


@router.post("/orders/{order_id}/allocate", response_model=FefoCommitResponse)
def allocate_order(order_id: int, db: Session = Depends(get_db)) -> FefoCommitResponse:
    """注文ID単位でのFEFO引当確定."""
    try:
        result = commit_fefo_allocation(db, order_id)
    except ValueError as exc:
        message = str(exc)
        status_code = 404 if "not found" in message.lower() else 400
        raise HTTPException(status_code=status_code, detail=message)
    except AllocationCommitError as exc:
        raise HTTPException(status_code=409, detail=str(exc))

    preview_response = _to_preview_response(result.preview)
    created_ids = [alloc.id for alloc in result.created_allocations]
    return FefoCommitResponse(
        order_id=order_id,
        created_allocation_ids=created_ids,
        preview=preview_response,
    )
