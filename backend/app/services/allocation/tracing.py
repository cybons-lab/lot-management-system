from __future__ import annotations

from datetime import date
from datetime import date as date_type

from sqlalchemy import nulls_last, select
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.orm.exc import StaleDataError

from app.domain.allocation import (
    AllocationRequest,
    LotCandidate,
    calculate_allocation,
)
from app.models import AllocationTrace, Lot, OrderLine

from .schemas import AllocationCommitError


def allocate_with_tracing(
    db: Session,
    order_line_id: int,
    reference_date: date | None = None,
) -> dict:
    """トレースログ付き引当処理（エンタープライズレベル）.

    純粋関数の計算エンジンを使用し、引当の推論過程を記録します。
    楽観的ロックを使用して同時実行制御を行います。

    Args:
        db: データベースセッション
        order_line_id: 注文明細ID
        reference_date: 基準日（期限切れ判定用、デフォルトは今日）

    Returns:
        dict: 引当結果とトレースログ
            - allocated_lots: 引き当てられたロット情報のリスト
            - total_allocated: 引当合計数量
            - shortage: 不足数量
            - trace_count: 保存されたトレースログ数

    Raises:
        ValueError: 注文明細が見つからない場合
        AllocationCommitError: 引当処理に失敗した場合
    """
    if reference_date is None:
        reference_date = date_type.today()

    # 注文明細を取得
    line_stmt = (
        select(OrderLine)
        .options(joinedload(OrderLine.product))
        .where(OrderLine.id == order_line_id)
    )
    order_line = db.execute(line_stmt).scalar_one_or_none()
    if not order_line:
        raise ValueError(f"OrderLine {order_line_id} not found")

    product_id = order_line.product_id
    if not product_id:
        raise ValueError(f"OrderLine {order_line_id} has no product_id")

    # 候補ロットを取得
    lot_stmt = (
        select(Lot)
        .where(
            Lot.product_id == product_id,
            (Lot.current_quantity - Lot.allocated_quantity) > 0,
            Lot.status == "active",
        )
        .order_by(
            nulls_last(Lot.expiry_date.asc()),
            Lot.received_date.asc(),
            Lot.id.asc(),
        )
    )
    lots = db.execute(lot_stmt).scalars().all()

    # LotCandidateに変換
    candidates = [
        LotCandidate(
            lot_id=lot.id,
            lot_number=lot.lot_number,
            expiry_date=lot.expiry_date,
            available_quantity=lot.current_quantity - lot.allocated_quantity,
            current_quantity=lot.current_quantity,
            allocated_quantity=lot.allocated_quantity,
            status=lot.status,
        )
        for lot in lots
    ]

    # 引当計算エンジンを実行
    request = AllocationRequest(
        order_line_id=order_line_id,
        required_quantity=order_line.converted_quantity
        if order_line.converted_quantity is not None
        else order_line.order_quantity,
        reference_date=reference_date,
    )
    result = calculate_allocation(request, candidates)

    # 結果を保存（楽観的ロック）
    try:
        # トレースログの保存
        for log in result.trace_logs:
            trace = AllocationTrace(
                order_line_id=order_line_id,
                lot_id=log.lot_id,
                action=log.action,
                message=log.message,
                details=log.details,
            )
            db.add(trace)

        # 引当の適用
        for alloc in result.allocations:
            lot = db.get(Lot, alloc.lot_id)
            if not lot:
                raise AllocationCommitError(f"Lot {alloc.lot_id} not found during commit")

            # 楽観的ロックチェック
            # current_quantityは変わっていないはずだが、allocated_quantityは変わっている可能性がある
            # ここでは簡易的に、計算時のavailableがまだあるかチェックする
            current_available = lot.current_quantity - lot.allocated_quantity
            if current_available < alloc.allocated_quantity:
                raise StaleDataError(
                    f"Lot {lot.id} stock changed. Expected {alloc.allocated_quantity}, got {current_available}"
                )

            lot.allocated_quantity += alloc.allocated_quantity
            db.add(lot)

        db.commit()

        return {
            "allocated_lots": [
                {"lot_id": a.lot_id, "quantity": a.allocated_quantity} for a in result.allocations
            ],
            "total_allocated": result.total_allocated,
            "shortage": result.shortage,
            "trace_count": len(result.trace_logs),
        }

    except StaleDataError as e:
        db.rollback()
        raise AllocationCommitError(f"Concurrent modification detected: {str(e)}")
    except Exception as e:
        db.rollback()
        raise AllocationCommitError(f"Failed to commit allocation: {str(e)}")
