"""Allocation candidates API (Phase 3-4: v2.2.1)."""

import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.models import OrderLine
from app.schemas.allocations.allocations_schema import CandidateLotsResponse


logger = logging.getLogger(__name__)
router = APIRouter(prefix="/allocation-candidates", tags=["allocation-candidates"])


@router.get("", response_model=CandidateLotsResponse)
def get_allocation_candidates(
    order_line_id: int,
    strategy: str = "fefo",
    limit: int = 200,
    db: Session = Depends(get_db),
):
    """
    候補ロット一覧取得（v2.5準拠）.

    指定された受注明細に対して、利用可能なロット候補を返却する（プレビューのみ、DB保存なし）。

    v2.5 Refactor:
    - forecast に含まれない商品でも、有効在庫があれば候補ロットを返す
    - v_lot_available_qty + v_order_line_context を使用

    Args:
        order_line_id: 対象の受注明細 ID（必須）
        strategy: 引当戦略（デフォルト "fefo"、将来 "fifo" や "custom" 拡張を想定）
        limit: 最大取得件数（デフォルト200）
        db: データベースセッション

    Returns:
        CandidateLotsResponse: 候補ロット一覧

    Note:
        - available_quantity > 0 のみ返却
        - ロック済み・期限切れは除外
        - 並び順: expiry_date NULLS LAST, received_date, lot_id（FEFO戦略の場合）
    """
    # 受注明細の存在確認
    order_line = db.query(OrderLine).filter(OrderLine.id == order_line_id).first()
    if not order_line:
        raise HTTPException(status_code=404, detail=f"受注明細 ID {order_line_id} が見つかりません")

    # 戦略のバリデーション（将来の拡張用）
    if strategy not in ["fefo", "fifo", "custom"]:
        raise HTTPException(
            status_code=400, detail=f"未対応の引当戦略: {strategy}。対応: fefo, fifo, custom"
        )

    try:
        # クエリタイムアウト設定（5秒）
        db.execute(text("SET LOCAL statement_timeout = '5s'"))

        # ✅ v2.5: allocation_candidates_service を使用
        from app.services.allocations.search import (
            execute_candidate_lot_query,
        )

        items = execute_candidate_lot_query(
            db=db,
            order_line_id=order_line_id,
            strategy=strategy,
            limit=limit,
        )

        logger.info(
            f"候補ロット取得成功: order_line_id={order_line_id}, "
            f"strategy={strategy}, 候補数={len(items)}"
        )

        return CandidateLotsResponse(items=items, total=len(items))

    except Exception as e:
        logger.error(f"候補ロット取得エラー (order_line_id={order_line_id}): {e}")
        raise HTTPException(status_code=500, detail=f"候補ロット取得エラー: {str(e)}")
