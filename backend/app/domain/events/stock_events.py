# backend/app/domain/events/stock_events.py
"""Stock-related domain events."""

from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal

from app.domain.events.base import DomainEvent


@dataclass(frozen=True)
class StockChangedEvent(DomainEvent):
    """在庫数量変更イベント.

    ロットの在庫数量が変更されたときに発行される。
    調整、出荷、返品などの操作で発生。

    Attributes:
        lot_id: 変更されたロットID
        quantity_before: 変更前の数量
        quantity_after: 変更後の数量
        quantity_change: 変更量（正:増加、負:減少）
        reason: 変更理由
    """

    lot_id: int = 0
    quantity_before: Decimal = Decimal("0")
    quantity_after: Decimal = Decimal("0")
    quantity_change: Decimal = Decimal("0")
    reason: str = ""


@dataclass(frozen=True)
class AllocationCreatedEvent(DomainEvent):
    """引当作成イベント.

    新しい引当（ソフトまたはハード）が作成されたときに発行される。

    Attributes:
        allocation_id: 作成された引当ID
        order_line_id: 受注明細ID
        lot_id: 引当対象ロットID
        quantity: 引当数量
        allocation_type: 引当タイプ（soft/hard）
    """

    allocation_id: int = 0
    order_line_id: int = 0
    lot_id: int = 0
    quantity: Decimal = Decimal("0")
    allocation_type: str = "soft"


@dataclass(frozen=True)
class AllocationConfirmedEvent(DomainEvent):
    """引当確定イベント.

    ソフト引当がハード引当に確定されたときに発行される。

    Attributes:
        allocation_id: 確定された引当ID
        lot_id: ロットID
        quantity: 確定数量
    """

    allocation_id: int = 0
    lot_id: int = 0
    quantity: Decimal = Decimal("0")
