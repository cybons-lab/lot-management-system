"""純粋関数による引当計算エンジン.

このモジュールはDBに依存せず、入力データに対してのみ計算を行う。
テストが容易で、ビジネスロジックが明確に分離されている。
"""

from decimal import Decimal

from .types import AllocationDecision, AllocationRequest, AllocationResult, LotCandidate


def calculate_allocation(
    request: AllocationRequest, candidates: list[LotCandidate]
) -> AllocationResult:
    """引当計算のメインエンジン.

    ロジック:
    1. FEFO（First Expiry First Out）: 有効期限が近い順にソート
    2. 期限切れロットを除外
    3. 分納対応: 要求数に対し、在庫が足りない場合は「ある分だけ」引き当て
    4. 各ロットの採用/不採用理由を詳細にログ化

    Args:
        request: 引当リクエスト
        candidates: 候補ロットのリスト

    Returns:
        AllocationResult: 引当結果とトレースログ
    """
    trace_logs: list[AllocationDecision] = []
    allocated_lots: list[AllocationDecision] = []
    remaining_qty = request.required_quantity

    # FEFO: 有効期限でソート（期限なしは最後）
    sorted_candidates = _sort_by_fefo(candidates)

    for lot in sorted_candidates:
        # 期限切れチェック
        if lot.expiry_date and lot.expiry_date < request.reference_date:
            decision = AllocationDecision(
                lot_id=lot.lot_id,
                lot_number=lot.lot_number,
                score=None,
                decision="rejected",
                reason="期限切れ",
                allocated_qty=Decimal("0"),
            )
            trace_logs.append(decision)
            continue

        # ステータスチェック（active以外は引当不可）
        if lot.status != "active":
            decision = AllocationDecision(
                lot_id=lot.lot_id,
                lot_number=lot.lot_number,
                score=None,
                decision="rejected",
                reason=f"ステータス不適切: {lot.status}",
                allocated_qty=Decimal("0"),
            )
            trace_logs.append(decision)
            continue

        # 在庫がない場合
        if lot.available_quantity <= 0:
            decision = AllocationDecision(
                lot_id=lot.lot_id,
                lot_number=lot.lot_number,
                score=None,
                decision="rejected",
                reason="在庫不足（利用可能数量0）",
                allocated_qty=Decimal("0"),
            )
            trace_logs.append(decision)
            continue

        # スコア計算（期限までの日数、期限なしの場合は999999）
        score = _calculate_score(lot, request.reference_date)

        # 引き当て可能な数量を計算
        allocatable_qty = min(remaining_qty, lot.available_quantity)

        if allocatable_qty >= remaining_qty:
            # 完全に引き当て可能
            decision = AllocationDecision(
                lot_id=lot.lot_id,
                lot_number=lot.lot_number,
                score=score,
                decision="adopted",
                reason="FEFO採用（完全充足）",
                allocated_qty=allocatable_qty,
            )
            allocated_lots.append(decision)
            trace_logs.append(decision)
            remaining_qty = Decimal("0")
            break
        else:
            # 部分的に引き当て
            if request.allow_partial:
                decision = AllocationDecision(
                    lot_id=lot.lot_id,
                    lot_number=lot.lot_number,
                    score=score,
                    decision="partial",
                    reason="FEFO採用（部分充足）",
                    allocated_qty=allocatable_qty,
                )
                allocated_lots.append(decision)
                trace_logs.append(decision)
                remaining_qty -= allocatable_qty
            else:
                decision = AllocationDecision(
                    lot_id=lot.lot_id,
                    lot_number=lot.lot_number,
                    score=score,
                    decision="rejected",
                    reason="在庫不足（分納不可）",
                    allocated_qty=Decimal("0"),
                )
                trace_logs.append(decision)

    # 全て処理しても不足がある場合
    if remaining_qty > 0 and len(allocated_lots) == 0:
        # 引当可能なロットが1つもない場合のトレースログ
        trace_logs.append(
            AllocationDecision(
                lot_id=None,
                lot_number="",
                score=None,
                decision="rejected",
                reason="引当可能ロットなし",
                allocated_qty=Decimal("0"),
            )
        )

    total_allocated = sum((lot.allocated_qty for lot in allocated_lots), Decimal(0))
    shortage = request.required_quantity - total_allocated

    return AllocationResult(
        allocated_lots=allocated_lots,
        trace_logs=trace_logs,
        total_allocated=total_allocated,
        shortage=shortage,
    )


def _sort_by_fefo(candidates: list[LotCandidate]) -> list[LotCandidate]:
    """FEFO（First Expiry First Out）でソート.

    期限が近い順、期限なしは最後。

    Args:
        candidates: 候補ロットのリスト

    Returns:
        ソート済みの候補ロットリスト
    """
    return sorted(
        candidates,
        key=lambda lot: (
            lot.expiry_date is None,  # 期限なしは最後
            lot.expiry_date if lot.expiry_date else "",  # 期限が近い順
        ),
    )


def _calculate_score(lot: LotCandidate, reference_date) -> Decimal:
    """優先度スコアを計算.

    期限までの日数を計算。期限なしの場合は大きな値を返す。

    Args:
        lot: ロット候補
        reference_date: 基準日

    Returns:
        スコア（低いほど優先）
    """
    if lot.expiry_date is None:
        return Decimal("999999")

    days_to_expiry = (lot.expiry_date - reference_date).days
    return Decimal(str(days_to_expiry))
