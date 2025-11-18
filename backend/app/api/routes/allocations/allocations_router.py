"""Allocation endpoints using FEFO strategy and drag-assign compatibility."""

import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.schemas.allocations.allocations_schema import (
    AllocationCommitRequest,
    AllocationCommitResponse,
    FefoLineAllocation,
    FefoLotAllocation,
    FefoPreviewResponse,
)
from app.services.allocation.allocations_service import (
    AllocationCommitError,
    AllocationNotFoundError,
    cancel_allocation,
    commit_fefo_allocation,
)


logger = logging.getLogger(__name__)
router = APIRouter(prefix="/allocations", tags=["allocations"])


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


# --- Phase 3-4: v2.2.1 新エンドポイント ---


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
