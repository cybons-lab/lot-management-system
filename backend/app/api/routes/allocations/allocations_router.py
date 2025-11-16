"""Allocation endpoints using FEFO strategy and drag-assign compatibility."""

import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.models import Allocation, Lot, OrderLine
from app.schemas.allocations.allocations_schema import (
    AllocationCommitRequest,
    AllocationCommitResponse,
    CandidateLotsResponse,
    DragAssignRequest,
    FefoCommitResponse,
    FefoLineAllocation,
    FefoLotAllocation,
    FefoPreviewRequest,
    FefoPreviewResponse,
)
from app.services.allocation.allocations_service import (
    AllocationCommitError,
    AllocationNotFoundError,
    cancel_allocation,
    commit_fefo_allocation,
    preview_fefo_allocation,
)


logger = logging.getLogger(__name__)
router = APIRouter(prefix="/allocations", tags=["allocations"])


# --- 追加: 旧 drag-assign 互換API ---
@router.post("/drag-assign", deprecated=True)
def drag_assign_allocation(request: DragAssignRequest, db: Session = Depends(get_db)):
    """
    互換エンドポイント: ドラッグ引当.

    DEPRECATED: Use POST /api/allocation-suggestions/manual instead.
    This endpoint will be removed in v3.0.

    ※元々 orders.py に存在したものを再実装（URL・I/O変更なし）.
    """
    logger.warning(
        "DEPRECATED: POST /allocations/drag-assign called. "
        "Please migrate to POST /allocation-suggestions/manual."
    )
    order_line = db.query(OrderLine).filter(OrderLine.id == request.order_line_id).first()
    if not order_line:
        raise HTTPException(status_code=404, detail="受注明細が見つかりません")

    lot = db.query(Lot).filter(Lot.id == request.lot_id).first()
    if not lot:
        raise HTTPException(status_code=404, detail="ロットが見つかりません")

    # v2.2: Calculate available stock from Lot model
    available_qty = float(lot.current_quantity - lot.allocated_quantity)
    if available_qty < request.allocate_qty:
        raise HTTPException(status_code=400, detail="Insufficient stock")

    allocation = Allocation(
        order_line_id=request.order_line_id,
        lot_id=request.lot_id,
        allocated_quantity=float(request.allocate_qty),
        status="allocated",
    )
    db.add(allocation)

    # v2.2: Update Lot.allocated_quantity instead of LotCurrentStock
    lot.allocated_quantity += float(request.allocate_qty)

    db.commit()
    db.refresh(allocation)
    db.refresh(lot)

    return {
        "success": True,
        "message": "引当成功",
        "allocation_id": allocation.id,
        "allocated_id": allocation.id,
        "remaining_lot_qty": float(lot.current_quantity - lot.allocated_quantity),
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


@router.post("/preview", response_model=FefoPreviewResponse, deprecated=True)
def preview_allocations(
    request: FefoPreviewRequest, db: Session = Depends(get_db)
) -> FefoPreviewResponse:
    """
    在庫を変更しない FEFO 引当プレビュー.

    DEPRECATED: Use POST /api/allocation-suggestions/fefo instead.
    This endpoint will be removed in v3.0.
    """
    logger.warning(
        "DEPRECATED: POST /allocations/preview called. "
        "Please migrate to POST /allocation-suggestions/fefo."
    )
    try:
        result = preview_fefo_allocation(db, request.order_id)
    except ValueError as exc:
        message = str(exc)
        status_code = 404 if "not found" in message.lower() else 400
        raise HTTPException(status_code=status_code, detail=message)

    return _to_preview_response(result)


@router.post("/orders/{order_id}/allocate", response_model=FefoCommitResponse, deprecated=True)
def allocate_order(order_id: int, db: Session = Depends(get_db)) -> FefoCommitResponse:
    """
    注文ID単位でのFEFO引当確定.

    DEPRECATED: Use POST /api/allocations/commit instead.
    This endpoint will be removed in v3.0.
    """
    logger.warning(
        "DEPRECATED: POST /allocations/orders/{id}/allocate called. "
        "Please migrate to POST /allocations/commit."
    )
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


@router.get("/candidate-lots", response_model=CandidateLotsResponse, deprecated=True)
def get_candidate_lots(
    product_id: int,
    warehouse_id: int | None = None,
    limit: int = 200,
    db: Session = Depends(get_db),
):
    """
    候補ロット一覧取得（product_id基準）.

    DEPRECATED: Use GET /api/allocation-candidates instead.
    This endpoint will be removed in v3.0.

    Args:
        product_id: 製品ID（必須）
        warehouse_id: 倉庫ID（任意フィルタ）
        limit: 最大取得件数（デフォルト200）
        db: データベースセッション

    Returns:
        CandidateLotsResponse: 候補ロット一覧

    Note:
        - free_qty > 0 のみ返却
        - ロック済み・期限切れは除外
        - 並び順: expiry_date NULLS FIRST, lot_id
    """
    logger.warning(
        "DEPRECATED: GET /allocations/candidate-lots called. "
        "Please migrate to GET /allocation-candidates."
    )

    try:
        # クエリタイムアウト設定（5秒）
        db.execute(text("SET LOCAL statement_timeout = '5s'"))

        # v2.2: メインクエリ - lots テーブルから直接取得
        query = text(
            """
            SELECT
                l.id AS lot_id,
                l.lot_number,
                l.current_quantity,
                l.allocated_quantity AS allocated_qty,
                (l.current_quantity - l.allocated_quantity) AS free_qty,
                l.product_id,
                l.product_code,
                l.warehouse_id,
                l.warehouse_code,
                l.expiry_date,
                l.updated_at AS last_updated
            FROM
                public.lots l
            WHERE
                l.product_id = :product_id
                AND l.current_quantity > 0
                AND l.deleted_at IS NULL
                AND (l.is_locked IS NULL OR l.is_locked = false)
                AND (l.expiry_date IS NULL OR l.expiry_date >= CURRENT_DATE)
                AND (:warehouse_id IS NULL OR l.warehouse_id = :warehouse_id)
                AND (l.current_quantity - l.allocated_quantity) > 0
            ORDER BY
                l.expiry_date NULLS FIRST,
                l.id
            LIMIT :limit
            """
        )

        result = db.execute(
            query, {"product_id": product_id, "warehouse_id": warehouse_id, "limit": limit}
        )
        rows = result.fetchall()

        items = [
            {
                "lot_id": row.lot_id,
                "lot_number": row.lot_number,
                "free_qty": float(row.free_qty),
                "current_quantity": float(row.current_quantity),
                "allocated_qty": float(row.allocated_qty),
                "product_id": row.product_id,
                "product_code": row.product_code,
                "warehouse_id": row.warehouse_id,
                "warehouse_code": row.warehouse_code,
                "expiry_date": row.expiry_date,
                "last_updated": row.last_updated.isoformat() if row.last_updated else None,
            }
            for row in rows
        ]

        return CandidateLotsResponse(items=items, total=len(items))

    except Exception as e:
        logger.error(f"候補ロット取得エラー (product_id={product_id}): {e}")
        raise HTTPException(status_code=500, detail=f"候補ロット取得エラー: {str(e)}")


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
