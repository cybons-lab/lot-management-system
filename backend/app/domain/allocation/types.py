"""データクラス定義: 引当計算のための型定義."""

from dataclasses import dataclass
from datetime import date
from decimal import Decimal


@dataclass
class AllocationRequest:
    """引当リクエスト.

    Attributes:
        order_line_id: 注文明細ID
        required_quantity: 必要数量
        reference_date: 基準日（期限切れ判定に使用）
        allow_partial: 分納を許可するか（デフォルト: True）
    """

    order_line_id: int
    required_quantity: Decimal
    reference_date: date
    allow_partial: bool = True
    strategy: str = "fefo"  # "fefo" or "single_lot_fit"


@dataclass
class AllocationDecision:
    """個別ロットの引当判定結果.

    Attributes:
        lot_id: ロットID（判定対象外の場合はNone）
        lot_number: ロット番号（判定対象外の場合は空文字）
        score: 優先度スコア（低いほど優先、期限までの日数など）
        decision: 判定結果 ('adopted', 'rejected', 'partial')
        reason: 理由（"FEFO採用", "期限切れ", "在庫不足" 等）
        allocated_qty: 実際に引き当てた数量
    """

    lot_id: int | None
    lot_number: str
    score: Decimal | None
    decision: str  # 'adopted', 'rejected', 'partial'
    reason: str
    allocated_qty: Decimal


@dataclass
class AllocationResult:
    """引当計算の最終結果.

    Attributes:
        allocated_lots: 引き当てられたロットのリスト（採用されたもののみ）
        trace_logs: 全てのトレースログ（採用/不採用両方）
        total_allocated: 引当合計数量
        shortage: 不足数量
    """

    allocated_lots: list[AllocationDecision]
    trace_logs: list[AllocationDecision]
    total_allocated: Decimal
    shortage: Decimal
