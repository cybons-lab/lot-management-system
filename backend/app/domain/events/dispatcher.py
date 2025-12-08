# backend/app/domain/events/dispatcher.py
"""Event dispatcher for domain events."""

from __future__ import annotations

import logging
from collections import defaultdict
from collections.abc import Awaitable, Callable
from typing import TypeVar

from app.domain.events.base import DomainEvent


logger = logging.getLogger(__name__)

T = TypeVar("T", bound=DomainEvent)
EventHandler = Callable[[T], Awaitable[None] | None]


class EventDispatcher:
    """ドメインイベントのディスパッチャー.

    イベントを発行し、登録されたハンドラーに通知する。
    シングルトンパターンでグローバルに利用可能。

    Usage:
        # ハンドラー登録
        @EventDispatcher.subscribe(StockChangedEvent)
        async def handle_stock_changed(event: StockChangedEvent):
            logger.info(f"Stock changed: {event.lot_id}")

        # イベント発行
        event = StockChangedEvent(lot_id=1, quantity_change=Decimal("-10"))
        await EventDispatcher.dispatch(event)
    """

    _handlers: dict[type[DomainEvent], list[EventHandler]] = defaultdict(list)
    _pending_events: list[DomainEvent] = []

    @classmethod
    def subscribe(cls, event_type: type[T]) -> Callable[[EventHandler[T]], EventHandler[T]]:
        """イベントハンドラーを登録するデコレーター.

        Args:
            event_type: 購読するイベントタイプ

        Returns:
            デコレーター関数
        """

        def decorator(handler: EventHandler[T]) -> EventHandler[T]:
            cls._handlers[event_type].append(handler)  # type: ignore[arg-type]
            logger.debug(f"Registered handler {handler.__name__} for {event_type.__name__}")
            return handler

        return decorator

    @classmethod
    def register_handler(cls, event_type: type[T], handler: EventHandler[T]) -> None:
        """イベントハンドラーを直接登録.

        Args:
            event_type: イベントタイプ
            handler: ハンドラー関数
        """
        cls._handlers[event_type].append(handler)  # type: ignore[arg-type]
        logger.debug(f"Registered handler {handler.__name__} for {event_type.__name__}")

    @classmethod
    async def dispatch(cls, event: DomainEvent) -> None:
        """イベントを発行し、登録されたハンドラーを実行.

        Args:
            event: 発行するドメインイベント
        """
        event_type = type(event)
        handlers = cls._handlers.get(event_type, [])

        if not handlers:
            logger.debug(f"No handlers registered for {event_type.__name__}")
            return

        logger.info(f"Dispatching {event_type.__name__} to {len(handlers)} handlers")

        for handler in handlers:
            try:
                result = handler(event)
                if result is not None and hasattr(result, "__await__"):
                    await result
            except Exception:
                logger.exception(f"Error in handler {handler.__name__} for {event_type.__name__}")

    @classmethod
    def queue(cls, event: DomainEvent) -> None:
        """イベントをキューに追加（後で一括発行用）.

        トランザクション完了後にイベントを発行したい場合に使用。

        Args:
            event: キューに追加するイベント
        """
        cls._pending_events.append(event)
        logger.debug(f"Queued {type(event).__name__} (pending: {len(cls._pending_events)})")

    @classmethod
    async def dispatch_pending(cls) -> None:
        """キューに溜まったイベントを全て発行."""
        events = cls._pending_events.copy()
        cls._pending_events.clear()

        for event in events:
            await cls.dispatch(event)

    @classmethod
    def clear_pending(cls) -> None:
        """キューをクリア（ロールバック時等に使用）."""
        cls._pending_events.clear()

    @classmethod
    def clear_handlers(cls) -> None:
        """全てのハンドラーをクリア（テスト用）."""
        cls._handlers.clear()
