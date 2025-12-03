"""Allocation endpoints using FEFO strategy and drag-assign compatibility."""

import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.models import Lot
from app.schemas.allocations.allocations_schema import (
    AllocationCommitRequest,
    AllocationCommitResponse,
    DragAssignRequest,
    DragAssignResponse,
    FefoLineAllocation,
    FefoLotAllocation,
    FefoPreviewRequest,
    FefoPreviewResponse,
)
from app.services.allocations.actions import (
    allocate_manually,
    cancel_allocation,
    commit_fefo_allocation,
)
from app.services.allocations.fefo import preview_fefo_allocation
from app.services.allocations.schemas import (
    AllocationCommitError,
    AllocationNotFoundError,
)


logger = logging.getLogger(__name__)
router = APIRouter(prefix="/allocations", tags=["allocations"])


# --- 既存機能 ---
@router.post("/drag-assign", response_model=DragAssignResponse)
def drag_assign(request: DragAssignRequest, db: Session = Depends(get_db)):
    """手動引当実行 (Drag & Assign) - Deprecated endpoint name but kept for compatibility."""
    try:
        # Handle deprecated allocate_qty vs allocated_quantity
        qty = request.allocated_quantity
        if qty is None and request.allocate_qty is not None:
            qty = request.allocate_qty

        if qty is None:
            raise HTTPException(status_code=400, detail="allocated_quantity is required")

        allocation = allocate_manually(
            db, order_line_id=request.order_line_id, lot_id=request.lot_id, quantity=qty
        )

        lot = db.query(Lot).filter(Lot.id == request.lot_id).first()
        remaining = lot.current_quantity - lot.allocated_quantity

        return DragAssignResponse(
            success=True,
            message="Allocation successful",
            allocation_id=allocation.id,
            remaining_lot_qty=remaining,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except AllocationCommitError as e:
        raise HTTPException(status_code=409, detail=str(e))


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
                allocated_quantity=alloc.allocate_qty,
                expiry_date=alloc.expiry_date,
                receipt_date=alloc.receipt_date,
            )
            for alloc in line.allocations
        ]
        lines.append(
            FefoLineAllocation(
                order_line_id=line.order_line_id,
                product_id=line.product_id,
                product_code=line.product_code,
                order_quantity=line.required_qty,
                already_allocated_qty=line.already_allocated_qty,
                allocations=lot_items,
                next_div=line.next_div,
                warnings=line.warnings,
            )
        )
    return FefoPreviewResponse(
        order_id=service_result.order_id, lines=lines, warnings=service_result.warnings
    )


# --- Phase 3-4: v2.2.1 新エンドポイント ---


@router.post("/preview", response_model=FefoPreviewResponse)
def preview_allocations(request: FefoPreviewRequest, db: Session = Depends(get_db)):
    """
    FEFO引当シミュレーション実行.

    Args:
        request: プレビューリクエスト（order_id）
        db: データベースセッション

    Returns:
        FefoPreviewResponse: 引当プレビュー結果
    """
    try:
        result = preview_fefo_allocation(db, request.order_id)
        return _to_preview_response(result)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/commit", response_model=AllocationCommitResponse)
def commit_allocation(request: AllocationCommitRequest, db: Session = Depends(get_db)):
    """
    引当確定（v2.2.1準拠）.

    FEFO・手動いずれかで作成された仮引当案を元に、実績の allocations を生成し、在庫を確定させる。

    Args:
        request: 引当確定リクエスト（order_id）
        db: データベースセッション

    Returns:
        AllocationCommitResponse: 確定結果

    Note:
        - allocations テーブルにレコード作成
        - lots.quantity から実績数量を減算
        - stock_history への出庫履歴記録
    """
    try:
        # 既存のFEFO確定サービスを再利用
        result = commit_fefo_allocation(db, request.order_id)
    except ValueError as exc:
        message = str(exc)
        status_code = 404 if "not found" in message.lower() else 400
        raise HTTPException(status_code=status_code, detail=message)
    except AllocationCommitError as exc:
        raise HTTPException(status_code=409, detail=str(exc))

    # プレビュー結果をレスポンススキーマに変換
    preview_response = _to_preview_response(result.preview)
    created_ids = [alloc.id for alloc in result.created_allocations]

    logger.info(f"引当確定成功: order_id={request.order_id}, 作成引当数={len(created_ids)}")

    return AllocationCommitResponse(
        order_id=request.order_id,
        created_allocation_ids=created_ids,
        preview=preview_response,
        status="committed",
        message=f"引当確定成功。{len(created_ids)}件の引当を作成しました。",
    )
