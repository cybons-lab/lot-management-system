# backend/app/domain/events/dispatcher.py
"""Event dispatcher for domain events.

【設計意図】イベントディスパッチャーの設計判断:

1. なぜイベント駆動アーキテクチャを採用するのか
   理由: ドメイン層とインフラ層の疎結合化
   問題:
   - 在庫更新時に複数の処理が必要
   → ログ記録、アラート通知、統計更新、監査ログ等
   → これらを直接ドメイン層に書くと、ドメインロジックが肥大化
   解決:
   - イベント駆動: ドメイン層は「在庫が変わった」というイベントを発行
   → 各処理はイベントハンドラーとして独立実装
   メリット:
   - ドメイン層がシンプル（ビジネスルールに集中）
   - 機能追加が容易（新しいハンドラーを追加するだけ）
   - テストが容易（ハンドラー単位でテスト可能）

2. シングルトンパターンの採用（L20, L37-38）
   理由: アプリケーション全体でイベントシステムを共有
   設計:
   - クラス変数で状態を保持（_handlers, _pending_events）
   → 全てのコードから同じイベントシステムにアクセス
   使用例:
   ```python
   # どこからでも同じディスパッチャーを使用
   await EventDispatcher.dispatch(event)
   ```
   代替案との比較:
   - インスタンス化: dispatcher = EventDispatcher()
   → インスタンスの受け渡しが煩雑、DI コンテナが必要
   - グローバル関数: dispatch_event()
   → 名前空間がない、テスト時のモックが困難
   - シングルトンクラス: EventDispatcher.dispatch()
   → 明確な名前空間、テスト時に clear_handlers() でリセット可能

3. defaultdict の使用理由（L7, L37）
   理由: ハンドラー登録時の初期化を自動化
   動作:
   - defaultdict(list): キーが存在しない場合、自動的に空リストを作成
   例:
   ```python
   # defaultdict を使わない場合
   if event_type not in self._handlers:
       self._handlers[event_type] = []
   self._handlers[event_type].append(handler)

   # defaultdict を使う場合
   self._handlers[event_type].append(handler)  # シンプル
   ```
   メリット:
   - コードが簡潔
   - KeyError のリスクなし

4. デコレーター方式の subscribe()（L40-56）
   理由: 宣言的なハンドラー登録
   使用例:
   ```python
   @EventDispatcher.subscribe(StockChangedEvent)
   async def handle_stock_changed(event: StockChangedEvent):
       logger.info(f"Stock changed: {event.lot_id}")
   ```
   メリット:
   - 可読性: イベントとハンドラーの関係が一目瞭然
   - 初期化時に自動登録: デコレーターでマーク → 起動時に登録
   代替案:
   - 手動登録: EventDispatcher.register_handler(StockChangedEvent, handler)
   → コード分散、登録漏れのリスク

5. register_handler() も提供する理由（L58-67）
   理由: デコレーターが使えない場合の代替手段
   ユースケース:
   - 動的にハンドラーを登録したい場合
   - ラムダ関数をハンドラーにしたい場合
   - テストコードでモックハンドラーを登録
   例:
   ```python
   # テストコード
   mock_handler = AsyncMock()
   EventDispatcher.register_handler(StockChangedEvent, mock_handler)
   ```

6. TypeVar と Generic の活用（L16-17）
   理由: 型安全なイベントハンドラー
   設計:
   - T = TypeVar("T", bound=DomainEvent)
   → T は DomainEvent のサブクラスに限定
   - EventHandler = Callable[[T], Awaitable[None] | None]
   → ハンドラーは T型のイベントを受け取る関数
   型チェック:
   ```python
   @EventDispatcher.subscribe(StockChangedEvent)
   async def handler(event: StockChangedEvent):  # 型一致
       ...


   @EventDispatcher.subscribe(StockChangedEvent)
   async def handler(event: OrderCreatedEvent):  # 型不一致 → エラー
       ...
   ```

7. dispatch() の非同期処理（L69-91）
   理由: async/await 対応のハンドラーをサポート
   動作:
   - hasattr(result, "__await__"): 非同期関数かチェック
   → 非同期なら await、同期ならそのまま実行
   メリット:
   - 同期・非同期ハンドラーを混在可能
   → DBアクセス（非同期）、ログ出力（同期）を同じイベントで処理
   エラーハンドリング:
   - try-except でハンドラーのエラーをキャッチ
   → 1つのハンドラーが失敗しても、他のハンドラーは実行継続

8. queue() と dispatch_pending() の設計（L93-112）
   理由: トランザクション完了後のイベント発行
   業務シナリオ:
   - 在庫を更新 → StockChangedEvent を発行
   - しかし、トランザクションがロールバックされるかもしれない
   → イベントを即座に発行すると、ロールバック後も通知が飛んでしまう
   解決:
   - queue(): イベントをキューに溜める（発行しない）
   - トランザクションコミット後: dispatch_pending() で一括発行
   - トランザクションロールバック: clear_pending() でキューをクリア
   使用例:
   ```python
   try:
       # トランザクション開始
       update_stock(lot_id, qty)
       EventDispatcher.queue(StockChangedEvent(...))
       db.commit()
       # コミット成功 → イベント発行
       await EventDispatcher.dispatch_pending()
   except:
       db.rollback()
       # ロールバック → イベント破棄
       EventDispatcher.clear_pending()
   ```

9. エラーログの設計（L90-91）
   理由: ハンドラーのエラーでイベントシステムが停止しないようにする
   動作:
   - logger.exception(): エラーをログに記録
   - 例外は再送出しない → 他のハンドラーは実行継続
   業務的意義:
   - 1つのハンドラー（例: メール送信）が失敗しても
   → 他のハンドラー（例: 監査ログ）は動作
   → システム全体の可用性向上

10. clear_handlers() の設計（L119-122）
    理由: テスト時のクリーンアップ
    用途:
    - pytest の setUp/tearDown でハンドラーをリセット
    → テスト間で状態が漏れない
    例:
    ```python
    def test_event_handling():
        EventDispatcher.clear_handlers()  # クリーン状態
        mock_handler = AsyncMock()
        EventDispatcher.register_handler(StockChangedEvent, mock_handler)
        # テスト実行
    ```
    メリット:
    - テストの独立性保証
    - テスト間の干渉を防止
"""

from __future__ import annotations

import logging
from collections import defaultdict
from collections.abc import Awaitable, Callable
from typing import TypeVar, cast

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
            handlers = cast(list[EventHandler[T]], cls._handlers[event_type])
            handlers.append(handler)
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
        handlers = cast(list[EventHandler[T]], cls._handlers[event_type])
        handlers.append(handler)
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
            except (
                RuntimeError,
                TypeError,
                ValueError,
                LookupError,
                AttributeError,
                NotImplementedError,
                NameError,
            ) as exc:
                logger.exception(
                    f"Error in handler {handler.__name__} for {event_type.__name__}: {exc}"
                )

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
