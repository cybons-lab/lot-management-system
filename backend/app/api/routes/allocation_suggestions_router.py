"""Allocation suggestions API (Phase 3-4: v2.2.1 + Phase 4)."""

import logging

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.inventory_models import Lot
from app.models.orders_models import OrderLine
from app.schemas.allocation_suggestions_schema import (
    AllocationSuggestionGenerateRequest,
    AllocationSuggestionGenerateResponse,
    AllocationSuggestionListResponse,
    AllocationSuggestionResponse,
)
from app.schemas.allocations_schema import (
    AllocationSuggestionManualRequest,
    AllocationSuggestionManualResponse,
    FefoLineAllocation,
    FefoLotAllocation,
    FefoPreviewRequest,
    FefoPreviewResponse,
)
from app.services.allocation_suggestions_service import AllocationSuggestionService
from app.services.allocations_service import preview_fefo_allocation


logger = logging.getLogger(__name__)
router = APIRouter(prefix="/allocation-suggestions", tags=["allocation-suggestions"])


# ========================================
# Phase 4: 引当推奨テーブルベースのAPI
# ========================================


@router.get("", response_model=AllocationSuggestionListResponse)
def list_allocation_suggestions(
    skip: int = Query(0, ge=0, description="スキップ件数"),
    limit: int = Query(100, ge=1, le=1000, description="取得件数上限"),
    forecast_line_id: int | None = Query(None, description="フォーキャスト明細IDでフィルタ"),
    lot_id: int | None = Query(None, description="ロットIDでフィルタ"),
    db: Session = Depends(get_db),
):
    """
    引当推奨一覧取得（Phase 4）.

    Args:
        skip: スキップ件数
        limit: 取得件数上限
        forecast_line_id: フォーキャスト明細IDでフィルタ（オプション）
        lot_id: ロットIDでフィルタ（オプション）
        db: データベースセッション

    Returns:
        引当推奨のリスト
    """
    service = AllocationSuggestionService(db)
    suggestions, total = service.get_all(
        skip=skip, limit=limit, forecast_line_id=forecast_line_id, lot_id=lot_id
    )

    return AllocationSuggestionListResponse(
        suggestions=[AllocationSuggestionResponse.model_validate(s) for s in suggestions],
        total=total,
    )


@router.get("/{suggestion_id}", response_model=AllocationSuggestionResponse)
def get_allocation_suggestion(suggestion_id: int, db: Session = Depends(get_db)):
    """
    引当推奨詳細取得（Phase 4）.

    Args:
        suggestion_id: 推奨ID
        db: データベースセッション

    Returns:
        引当推奨詳細

    Raises:
        HTTPException: 推奨が存在しない場合
    """
    service = AllocationSuggestionService(db)
    suggestion = service.get_by_id(suggestion_id)
    if not suggestion:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Allocation suggestion not found"
        )

    return AllocationSuggestionResponse.model_validate(suggestion)


@router.get("/forecast-line/{forecast_line_id}", response_model=list[AllocationSuggestionResponse])
def get_suggestions_by_forecast_line(forecast_line_id: int, db: Session = Depends(get_db)):
    """
    フォーキャスト明細別の引当推奨取得（Phase 4）.

    Args:
        forecast_line_id: フォーキャスト明細ID
        db: データベースセッション

    Returns:
        引当推奨のリスト（降順）
    """
    service = AllocationSuggestionService(db)
    suggestions = service.get_by_forecast_line(forecast_line_id)

    return [AllocationSuggestionResponse.model_validate(s) for s in suggestions]


@router.post("/generate", response_model=AllocationSuggestionGenerateResponse)
def generate_allocation_suggestions(
    request: AllocationSuggestionGenerateRequest,
    db: Session = Depends(get_db),
):
    """
    引当推奨生成（Phase 4）.

    指定されたフォーキャスト明細に対して、引当推奨を自動生成します。
    既存の推奨は削除され、新しい推奨が作成されます。

    注意: これはスタブ実装です。本番環境では、より高度な引当アルゴリズムを使用してください。

    Args:
        request: 引当推奨生成リクエスト
        db: データベースセッション

    Returns:
        生成された引当推奨のリスト
    """
    service = AllocationSuggestionService(db)

    suggestions = service.generate_suggestions(
        forecast_line_id=request.forecast_line_id,
        logic=request.logic,
        max_suggestions=request.max_suggestions,
    )

    return AllocationSuggestionGenerateResponse(
        forecast_line_id=request.forecast_line_id,
        suggestions_created=len(suggestions),
        suggestions=[AllocationSuggestionResponse.model_validate(s) for s in suggestions],
    )


@router.delete("/{suggestion_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_allocation_suggestion(suggestion_id: int, db: Session = Depends(get_db)):
    """
    引当推奨削除（Phase 4）.

    Args:
        suggestion_id: 推奨ID
        db: データベースセッション

    Raises:
        HTTPException: 推奨が存在しない場合
    """
    service = AllocationSuggestionService(db)
    deleted = service.delete(suggestion_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Allocation suggestion not found"
        )

    return None


@router.delete("/forecast-line/{forecast_line_id}/clear", status_code=status.HTTP_204_NO_CONTENT)
def delete_suggestions_by_forecast_line(forecast_line_id: int, db: Session = Depends(get_db)):
    """
    フォーキャスト明細別の引当推奨一括削除（Phase 4）.

    Args:
        forecast_line_id: フォーキャスト明細ID
        db: データベースセッション

    Returns:
        None
    """
    service = AllocationSuggestionService(db)
    service.delete_by_forecast_line(forecast_line_id)

    return None


# ========================================
# 既存API（v2.2.1）- 受注明細ベースの引当プレビュー
# ========================================


@router.post("/manual", response_model=AllocationSuggestionManualResponse)
def create_manual_suggestion(
    request: AllocationSuggestionManualRequest, db: Session = Depends(get_db)
):
    """
    手動仮引当（v2.2.1準拠）.

    ユーザーが手動でロットを割り当てるケース（ドラッグ＆ドロップ操作など）。
    レスポンスのみで返し、DBには保存しない（プレビュー方式）。

    Args:
        request: 手動引当リクエスト（order_line_id, lot_id, quantity）
        db: データベースセッション

    Returns:
        AllocationSuggestionManualResponse: 仮引当プレビュー結果

    Note:
        - DB に `allocation_suggestions` レコードは作成しない
        - 在庫チェックのみ実施し、実際の引当は `/allocations/commit` で確定
    """
    # 受注明細の確認
    order_line = db.query(OrderLine).filter(OrderLine.id == request.order_line_id).first()
    if not order_line:
        raise HTTPException(status_code=404, detail="受注明細が見つかりません")

    # ロットの確認
    lot = db.query(Lot).filter(Lot.id == request.lot_id).first()
    if not lot:
        raise HTTPException(status_code=404, detail="ロットが見つかりません")

    # v2.2: 在庫確認 - Lot モデルから直接計算
    available_qty = float(lot.current_quantity - lot.allocated_quantity)
    if available_qty < request.quantity:
        raise HTTPException(
            status_code=400,
            detail=f"在庫不足: ロット {lot.lot_number} の利用可能数量 {available_qty} < 要求数量 {request.quantity}",
        )

    # プレビュー結果を返す（DB保存なし）
    logger.info(
        f"手動仮引当プレビュー: order_line_id={request.order_line_id}, "
        f"lot_id={request.lot_id}, quantity={request.quantity}"
    )

    # Get product_code from relationship (DDL v2.2: maker_part_code)
    product_code = order_line.product.maker_part_code if order_line.product else "UNKNOWN"

    return AllocationSuggestionManualResponse(
        order_line_id=request.order_line_id,
        lot_id=request.lot_id,
        lot_number=lot.lot_number,
        suggested_quantity=request.quantity,
        available_quantity=available_qty,
        product_id=order_line.product_id,
        product_code=product_code,
        warehouse_id=getattr(lot, "warehouse_id", None),
        expiry_date=lot.expiry_date,
        status="preview",
        message="手動仮引当プレビュー成功。確定するには /allocations/commit を呼び出してください。",
    )


@router.post("/fefo", response_model=FefoPreviewResponse)
def create_fefo_suggestion(request: FefoPreviewRequest, db: Session = Depends(get_db)):
    """
    FEFO仮引当（v2.2.1準拠）.

    FEFOロジックに基づいて、指定された注文に対する「推奨引当案」を一括生成。
    レスポンスのみで返し、DBには保存しない（プレビュー方式）。

    Args:
        request: FEFO引当リクエスト（order_id）
        db: データベースセッション

    Returns:
        FefoPreviewResponse: FEFO引当プレビュー結果

    Note:
        - DB に `allocation_suggestions` レコードは作成しない
        - 実際の引当は `/allocations/commit` で確定
    """
    try:
        # 既存のFEFOプレビューサービスを再利用
        result = preview_fefo_allocation(db, request.order_id)
    except ValueError as exc:
        message = str(exc)
        status_code = 404 if "not found" in message.lower() else 400
        raise HTTPException(status_code=status_code, detail=message)

    # サービス結果をレスポンススキーマに変換
    lines = []
    for line in result.lines:
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

    logger.info(
        f"FEFO仮引当プレビュー: order_id={request.order_id}, 明細数={len(lines)}, "
        f"警告数={len(result.warnings)}"
    )

    return FefoPreviewResponse(order_id=result.order_id, lines=lines, warnings=result.warnings)
