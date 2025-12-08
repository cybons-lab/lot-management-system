# backend/app/domain/events/handlers.py
"""Event handlers for domain events.

イベントハンドラーの実装例。
アプリケーション起動時にこのモジュールをインポートすることで
ハンドラーが自動的に登録される。

Usage:
    # main.py などで
    import app.domain.events.handlers  # noqa: F401
"""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING

from app.domain.events.dispatcher import EventDispatcher
from app.domain.events.stock_events import (
    AllocationConfirmedEvent,
    AllocationCreatedEvent,
    StockChangedEvent,
)


if TYPE_CHECKING:
    pass

logger = logging.getLogger(__name__)


@EventDispatcher.subscribe(StockChangedEvent)
async def log_stock_change(event: StockChangedEvent) -> None:
    """在庫変更をログに記録.

    将来的には監査ログや外部システム連携に使用可能。
    """
    logger.info(
        "Stock changed: lot_id=%d, change=%s, before=%s, after=%s, reason=%s",
        event.lot_id,
        event.quantity_change,
        event.quantity_before,
        event.quantity_after,
        event.reason,
    )


@EventDispatcher.subscribe(AllocationCreatedEvent)
async def log_allocation_created(event: AllocationCreatedEvent) -> None:
    """引当作成をログに記録."""
    logger.info(
        "Allocation created: id=%d, lot_id=%d, quantity=%s, type=%s",
        event.allocation_id,
        event.lot_id,
        event.quantity,
        event.allocation_type,
    )


@EventDispatcher.subscribe(AllocationConfirmedEvent)
async def log_allocation_confirmed(event: AllocationConfirmedEvent) -> None:
    """引当確定をログに記録."""
    logger.info(
        "Allocation confirmed: id=%d, lot_id=%d, quantity=%s",
        event.allocation_id,
        event.lot_id,
        event.quantity,
    )


# 将来の拡張例:
#
# @EventDispatcher.subscribe(StockChangedEvent)
# async def notify_low_stock(event: StockChangedEvent) -> None:
#     """在庫が閾値を下回ったらアラートを発生."""
#     if event.quantity_after < LOW_STOCK_THRESHOLD:
#         await create_alert(event.lot_id, "LOW_STOCK")
#
# @EventDispatcher.subscribe(AllocationConfirmedEvent)
# async def sync_to_erp(event: AllocationConfirmedEvent) -> None:
#     """ERP/SAPへの引当同期."""
#     await erp_client.sync_allocation(event.allocation_id)
