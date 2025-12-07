"""Allocation endpoints using FEFO strategy and drag-assign compatibility."""

import logging
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.models import Allocation, Lot, OrderLine
from app.schemas.allocations.allocations_schema import (
    AllocationCommitRequest,
    AllocationCommitResponse,
    AutoAllocateRequest,
    AutoAllocateResponse,
    # vvv Imports vvv
    BatchAutoOrderRequest,
    BatchAutoOrderResponse,
    BatchAutoOrderResult,
    # ^^^ Imports ^^^
    BulkAutoAllocateFailedLine,
    BulkAutoAllocateRequest,
    BulkAutoAllocateResponse,
    BulkCancelRequest,
    BulkCancelResponse,
    DragAssignRequest,
    DragAssignResponse,
    FefoLineAllocation,
    FefoLotAllocation,
    FefoPreviewRequest,
    FefoPreviewResponse,
    HardAllocationBatchConfirmRequest,
    HardAllocationBatchConfirmResponse,
    HardAllocationBatchFailedItem,
    HardAllocationConfirmRequest,
    HardAllocationConfirmResponse,
)
from app.services.allocations.actions import (
    allocate_manually,
    auto_allocate_bulk,
    auto_allocate_line,
    bulk_cancel_allocations,
    cancel_allocation,
    cancel_allocations_for_order_line,
    commit_fefo_allocation,
    confirm_hard_allocation,
    confirm_hard_allocations_batch,
)
from app.services.allocations.fefo import preview_fefo_allocation
from app.services.allocations.schemas import (
    AllocationCommitError,
    AllocationNotFoundError,
    InsufficientStockError,
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
        if not lot:
            raise HTTPException(status_code=404, detail="Lot not found")
        remaining = lot.current_quantity - lot.allocated_quantity

        return DragAssignResponse(
            success=True,
            message="Allocation successful",
            allocation_id=allocation.id,
            remaining_lot_qty=remaining,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    except AllocationCommitError:
        raise  # Let global handler handle it


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
    """FEFO引当シミュレーション実行.

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
        raise HTTPException(status_code=404, detail=str(e)) from e


@router.post("/commit", response_model=AllocationCommitResponse)
def commit_allocation(request: AllocationCommitRequest, db: Session = Depends(get_db)):
    """引当確定（v2.2.1準拠）.

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
        if "not found" in message.lower():
            raise HTTPException(status_code=404, detail=message) from exc
        raise HTTPException(status_code=400, detail=message) from exc
    except AllocationCommitError:
        raise  # Let global handler handle it

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


# --- Phase 4: P1-5/6 新エンドポイント ---


@router.post("/bulk-cancel", response_model=BulkCancelResponse)
def bulk_cancel(request: BulkCancelRequest, db: Session = Depends(get_db)):
    """引当一括取消.

    複数の引当を一度に取り消す。部分的な失敗を許容する。

    Args:
        request: 取消対象の引当ID一覧
        db: データベースセッション

    Returns:
        BulkCancelResponse: 取消結果（成功ID、失敗ID）
    """
    cancelled_ids, failed_ids = bulk_cancel_allocations(db, request.allocation_ids)

    if not cancelled_ids and failed_ids:
        raise HTTPException(
            status_code=400,
            detail=f"全ての引当取消に失敗しました: {failed_ids}",
        )

    message = f"{len(cancelled_ids)}件取消成功"
    if failed_ids:
        message += f", {len(failed_ids)}件失敗"

    logger.info(f"引当一括取消: 成功={cancelled_ids}, 失敗={failed_ids}")

    return BulkCancelResponse(
        cancelled_ids=cancelled_ids,
        failed_ids=failed_ids,
        message=message,
    )


@router.post("/cancel-by-order-line", status_code=200)
def cancel_by_order_line(
    request: dict,  # Assuming { "order_line_id": int }
    db: Session = Depends(get_db),
):
    """受注明細に紐づく全ての引当を一括キャンセル.

    Args:
        request: { "order_line_id": int }
        db: DB Session

    Returns:
        { "success": bool, "message": str, "cancelled_ids": list[int] }
    """
    order_line_id = request.get("order_line_id")
    if not order_line_id:
        raise HTTPException(status_code=400, detail="order_line_id is required")

    try:
        cancelled_ids = cancel_allocations_for_order_line(db, order_line_id)
        return {
            "success": True,
            "message": f"{len(cancelled_ids)} allocations cancelled",
            "cancelled_ids": cancelled_ids,
        }
    except Exception as e:
        logger.exception(f"Failed to cancel allocations for line {order_line_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/auto-allocate", response_model=AutoAllocateResponse)
def auto_allocate(request: AutoAllocateRequest, db: Session = Depends(get_db)):
    """受注明細に対してFEFO戦略で自動引当を実行.

    Args:
        request: 自動引当リクエスト（order_line_id, strategy）
        db: データベースセッション

    Returns:
        AutoAllocateResponse: 引当結果
    """
    try:
        allocations = auto_allocate_line(db, request.order_line_id)

        # 結果集計
        total_allocated = sum(a.allocated_quantity for a in allocations)

        # 残量計算
        line = db.query(OrderLine).filter(OrderLine.id == request.order_line_id).first()
        existing = (
            db.query(Allocation)
            .filter(
                Allocation.order_line_id == request.order_line_id,
                Allocation.status == "allocated",
            )
            .all()
        )
        total_line_allocated = sum(a.allocated_quantity for a in existing)
        assert line is not None  # Already checked above
        remaining = max(Decimal("0"), Decimal(str(line.order_quantity)) - total_line_allocated)

        # レスポンス作成
        allocated_lots = [
            FefoLotAllocation(
                lot_id=a.lot_id,  # type: ignore[arg-type]
                lot_number=db.query(Lot).filter(Lot.id == a.lot_id).first().lot_number,  # type: ignore[union-attr]
                allocated_quantity=a.allocated_quantity,
                expiry_date=db.query(Lot).filter(Lot.id == a.lot_id).first().expiry_date,  # type: ignore[union-attr]
                received_date=db.query(Lot).filter(Lot.id == a.lot_id).first().received_date,  # type: ignore[union-attr]
            )
            for a in allocations
        ]

        if allocations:
            message = f"{len(allocations)}件のロットに引当しました"
        else:
            message = "引当可能なロットがありません、または既に全量引当済みです"

        logger.info(
            f"自動引当実行: order_line_id={request.order_line_id}, "
            f"allocated={len(allocations)}, remaining={remaining}"
        )

        return AutoAllocateResponse(
            order_line_id=request.order_line_id,
            allocated_lots=allocated_lots,
            total_allocated=total_allocated,  # type: ignore[arg-type]
            remaining_quantity=remaining,
            message=message,
        )

    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e


@router.post("/bulk-auto-allocate", response_model=BulkAutoAllocateResponse)
def bulk_auto_allocate(request: BulkAutoAllocateRequest, db: Session = Depends(get_db)):
    """複数受注明細に対して一括でFEFO自動引当を実行.

    フィルタリング条件を指定して対象を絞り込み可能。
    フォーキャストグループ、個別受注、全受注への一括引当に対応。

    - product_id: 製品IDでフィルタ
    - customer_id: 得意先IDでフィルタ
    - delivery_place_id: 納入先IDでフィルタ
    - order_type: 受注タイプでフィルタ (FORECAST_LINKED, KANBAN, SPOT, ORDER)

    Args:
        request: 一括引当リクエスト
        db: データベースセッション

    Returns:
        BulkAutoAllocateResponse: 一括引当結果
    """
    result = auto_allocate_bulk(
        db,
        product_id=request.product_id,
        customer_id=request.customer_id,
        delivery_place_id=request.delivery_place_id,
        order_type=request.order_type,
        skip_already_allocated=request.skip_already_allocated,
    )

    # 結果メッセージ作成
    if result["total_allocations"] > 0:
        message = (
            f"{result['allocated_lines']}件の明細に引当しました "
            f"(計{result['total_allocations']}件の引当レコード作成)"
        )
    elif result["skipped_lines"] > 0:
        message = f"{result['skipped_lines']}件の明細は既に引当済みのためスキップしました"
    else:
        message = "引当対象の明細がありません"

    if result["failed_lines"]:
        message += f", {len(result['failed_lines'])}件失敗"

    logger.info(
        f"一括自動引当実行: processed={result['processed_lines']}, "
        f"allocated={result['allocated_lines']}, skipped={result['skipped_lines']}"
    )

    return BulkAutoAllocateResponse(
        processed_lines=result["processed_lines"],
        allocated_lines=result["allocated_lines"],
        total_allocations=result["total_allocations"],
        skipped_lines=result["skipped_lines"],
        failed_lines=[
            BulkAutoAllocateFailedLine(line_id=f["line_id"], error=f["error"])
            for f in result["failed_lines"]
        ],
        message=message,
    )


@router.post("/auto-orders", response_model=BatchAutoOrderResponse)
def auto_allocate_orders(request: BatchAutoOrderRequest, db: Session = Depends(get_db)):
    """複数受注に対して一括で自動引当（Single Lot Fit + FEFO）を実行・確定する.

    - v0アルゴリズム (allocator.py) を使用
    - 成功/失敗を個別に記録
    - dry_run=True の場合は保存しない（未実装、今回はFalse前提）

    Args:
        request: 対象受注IDリスト
        db: DBセッション

    Returns:
        BatchAutoOrderResponse: 実行結果
    """
    results = []
    success_count = 0
    failure_count = 0

    for order_id in request.order_ids:
        try:
            # 既存のcommit_fefo_allocationを利用 (内部でpreview_fefo_allocation -> allocator.py を呼ぶ)
            commit_result = commit_fefo_allocation(db, order_id)

            created_ids = [a.id for a in commit_result.created_allocations]
            results.append(
                BatchAutoOrderResult(
                    order_id=order_id,
                    success=True,
                    message=f"Created {len(created_ids)} allocations",
                    created_allocation_ids=created_ids,
                )
            )
            success_count += 1
        except Exception as e:
            # 個別の失敗は全体を止めない
            logger.warning(f"Failed to auto-allocate order {order_id}: {e}")
            results.append(
                BatchAutoOrderResult(
                    order_id=order_id,
                    success=False,
                    message=str(e),
                )
            )
            failure_count += 1

    message = f"Processed {len(request.order_ids)} orders: {success_count} success, {failure_count} failed"
    logger.info(f"Batch Auto-Order: {message}")

    return BatchAutoOrderResponse(
        results=results,
        total_orders=len(request.order_ids),
        success_count=success_count,
        failure_count=failure_count,
        message=message,
    )


# --- Hard Allocation (確定引当) ---


@router.patch("/{allocation_id}/confirm", response_model=HardAllocationConfirmResponse)
def confirm_allocation_hard(
    allocation_id: int,
    request: HardAllocationConfirmRequest,
    db: Session = Depends(get_db),
):
    """Soft引当をHard引当に確定（Soft → Hard変換）.

    - 在庫をロックし、他オーダーからは引当不可にする
    - 部分確定も可能（quantity パラメータ指定時）

    Args:
        allocation_id: 確定対象の引当ID
        request: 確定リクエスト（confirmed_by, quantity）
        db: データベースセッション

    Returns:
        HardAllocationConfirmResponse: 確定された引当情報

    Raises:
        404: 引当が見つからない
        400: 既にhard確定済み、または不正なパラメータ
        409: 在庫不足
    """
    try:
        allocation, _remaining = confirm_hard_allocation(
            db,
            allocation_id,
            confirmed_by=request.confirmed_by,
            quantity=request.quantity,
        )

        logger.info(
            f"Hard引当確定成功: allocation_id={allocation_id}, "
            f"lot_id={allocation.lot_id}, qty={allocation.allocated_quantity}"
        )

        return HardAllocationConfirmResponse(
            id=allocation.id,
            order_line_id=allocation.order_line_id,
            lot_id=allocation.lot_id,  # type: ignore[arg-type]
            allocated_quantity=allocation.allocated_quantity,
            allocation_type=allocation.allocation_type,
            status=allocation.status,
            confirmed_at=allocation.confirmed_at,  # type: ignore[arg-type]
            confirmed_by=allocation.confirmed_by,
        )

    except AllocationNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error": "ALLOCATION_NOT_FOUND",
                "message": f"引当 {allocation_id} が見つかりません",
            },
        )
    except InsufficientStockError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"error": "INSUFFICIENT_STOCK", "message": str(e)},
        )
    except AllocationCommitError as e:
        status_code = (
            status.HTTP_400_BAD_REQUEST
            if e.error_code in ("ALREADY_CONFIRMED", "INVALID_QUANTITY", "PROVISIONAL_ALLOCATION")
            else status.HTTP_409_CONFLICT
        )
        raise HTTPException(
            status_code=status_code,
            detail={"error": e.error_code, "message": e.message},
        )


@router.post("/confirm-batch", response_model=HardAllocationBatchConfirmResponse)
def confirm_allocations_batch(
    request: HardAllocationBatchConfirmRequest,
    db: Session = Depends(get_db),
):
    """複数のSoft引当を一括でHard確定.

    部分的な失敗を許容し、成功・失敗をそれぞれ返す。

    Args:
        request: 一括確定リクエスト（allocation_ids, confirmed_by）
        db: データベースセッション

    Returns:
        HardAllocationBatchConfirmResponse: 確定結果（成功ID一覧、失敗情報一覧）
    """
    confirmed_ids, failed_items = confirm_hard_allocations_batch(
        db,
        request.allocation_ids,
        confirmed_by=request.confirmed_by,
    )

    logger.info(f"Hard引当一括確定: 成功={len(confirmed_ids)}, 失敗={len(failed_items)}")

    return HardAllocationBatchConfirmResponse(
        confirmed=confirmed_ids,
        failed=[
            HardAllocationBatchFailedItem(
                id=item["id"],
                error=item["error"],
                message=item["message"],
            )
            for item in failed_items
        ],
    )
