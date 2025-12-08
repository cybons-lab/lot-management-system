# backend/app/domain/events/__init__.py
"""Domain Events Package.

ドメインイベントを使用して、ドメイン内の重要な出来事を通知し、
サブスクライバーが反応できるようにする。

Usage:
    from app.domain.events import DomainEvent, EventDispatcher, StockChangedEvent

    # イベント発行
    event = StockChangedEvent(lot_id=1, quantity_change=Decimal("-10"))
    await EventDispatcher.dispatch(event)
"""

from app.domain.events.base import DomainEvent
from app.domain.events.dispatcher import EventDispatcher
from app.domain.events.stock_events import (
    AllocationConfirmedEvent,
    AllocationCreatedEvent,
    StockChangedEvent,
)


__all__ = [
    "DomainEvent",
    "EventDispatcher",
    "StockChangedEvent",
    "AllocationCreatedEvent",
    "AllocationConfirmedEvent",
]
