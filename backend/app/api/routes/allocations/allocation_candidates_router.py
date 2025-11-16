"""Allocation candidates API (Phase 3-4: v2.2.1)."""

import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.models import OrderLine
from app.schemas.allocations_schema import CandidateLotsResponse


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
    候補ロット一覧取得（v2.2.1準拠）.

    指定された受注明細に対して、利用可能なロット候補を返却する（プレビューのみ、DB保存なし）。

    Args:
        order_line_id: 対象の受注明細 ID（必須）
        strategy: 引当戦略（デフォルト "fefo"、将来 "fifo" や "custom" 拡張を想定）
        limit: 最大取得件数（デフォルト200）
        db: データベースセッション

    Returns:
        CandidateLotsResponse: 候補ロット一覧

    Note:
        - free_qty > 0 のみ返却
        - ロック済み・期限切れは除外
        - 並び順: expiry_date NULLS FIRST, lot_id（FEFO戦略の場合）
    """
    # 受注明細の取得
    order_line = db.query(OrderLine).filter(OrderLine.id == order_line_id).first()
    if not order_line:
        raise HTTPException(status_code=404, detail=f"受注明細 ID {order_line_id} が見つかりません")

    # 製品IDと倉庫IDの取得
    product_id = order_line.product_id
    if not product_id:
        raise HTTPException(
            status_code=400,
            detail=f"受注明細 ID {order_line_id} に product_id が設定されていません",
        )

    # 倉庫IDは受注明細に直接ない場合、受注ヘッダから取得するか、全倉庫を対象とする
    warehouse_id = getattr(order_line, "warehouse_id", None)

    # 戦略のバリデーション（将来の拡張用）
    if strategy not in ["fefo", "fifo", "custom"]:
        raise HTTPException(
            status_code=400, detail=f"未対応の引当戦略: {strategy}。対応: fefo, fifo, custom"
        )

    try:
        # クエリタイムアウト設定（5秒）
        db.execute(text("SET LOCAL statement_timeout = '5s'"))

        # v2.2: メインクエリ - lots テーブルから直接取得
        # 並び順はFEFO戦略の場合: expiry_date NULLS FIRST（期限が近いものを優先）
        order_by_clause = (
            "l.expiry_date NULLS FIRST, l.id"
            if strategy == "fefo"
            else "l.id"  # fifoやcustomは将来実装
        )

        query = text(
            f"""
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
                {order_by_clause}
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

        logger.info(
            f"候補ロット取得成功: order_line_id={order_line_id}, product_id={product_id}, "
            f"strategy={strategy}, 候補数={len(items)}"
        )

        return CandidateLotsResponse(items=items, total=len(items))

    except Exception as e:
        logger.error(
            f"候補ロット取得エラー (order_line_id={order_line_id}, product_id={product_id}): {e}"
        )
        raise HTTPException(status_code=500, detail=f"候補ロット取得エラー: {str(e)}")
