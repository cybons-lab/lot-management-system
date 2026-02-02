# backend/app/domain/events/handlers.py
"""Event handlers for domain events.

イベントハンドラーの実装例。
アプリケーション起動時にこのモジュールをインポートすることで
ハンドラーが自動的に登録される。

Usage:
    # main.py などで
    import app.domain.events.handlers  # noqa: F401

【設計意図】イベントハンドラーの設計判断:

1. なぜハンドラーを独立したモジュールに配置するのか
   理由: イベント駆動アーキテクチャの実装パターン
   設計:
   - dispatcher.py: イベントディスパッチャー（仕組み）
   - handlers.py: 具体的なハンドラー実装（ビジネスロジック）
   → 関心事の分離（Separation of Concerns）
   メリット:
   - ハンドラーの追加・削除が容易
   - テストが独立して実行可能
   - ディスパッチャーの変更がハンドラーに影響しない

2. モジュールインポートによる自動登録（L9-10）
   理由: デコレーターベースの宣言的登録
   動作:
   - このモジュールがインポートされると、@EventDispatcher.subscribe デコレーターが実行される
   → ハンドラーが自動的に登録される
   使用例:
   ```python
   # main.py
   import app.domain.events.handlers  # noqa: F401
   # この時点で log_stock_change() 等が登録される
   ```
   メリット:
   - 明示的な登録コード不要
   - ハンドラー追加時はこのファイルに関数を追加するだけ

3. 現在は全てログ出力のみ（L32-68）
   理由: シンプルな実装から開始
   業務的意義:
   - 現時点: イベントの発生を記録（監査ログ）
   - 将来: 複雑な処理を追加予定（L71-82のコメント参照）
   段階的な実装:
   - Phase 1: ログ出力のみ（現在）
   - Phase 2: アラート通知（在庫不足警告等）
   - Phase 3: 外部システム連携（SAPへの自動同期）

4. log_stock_change ハンドラーの設計（L32-45）
   理由: 在庫変更の監査ログ
   記録内容:
   - lot_id: どのロット
   - quantity_change: 変更量（+100, -50 等）
   - quantity_before/after: 変更前後の数量
   - reason: 変更理由（"入庫", "出荷", "引当"等）
   業務的意義:
   - 在庫の増減を全て記録 → 監査対応
   - 問題発生時の原因追跡
   例:
   - 「ロット123の在庫が突然減った」
   → ログを見れば「2024-12-01 10:30 に引当で -50」と分かる

5. log_allocation_created ハンドラー（L48-57）
   理由: 引当の作成を記録
   記録内容:
   - allocation_id: 引当ID
   - lot_id: どのロットから引当
   - quantity: 引当数量
   - allocation_type: "reserved" or "confirmed"
   業務的意義:
   - 引当履歴の記録 → 「いつ、誰が、どのロットを引当したか」
   - トラブルシューティング用

6. log_allocation_confirmed ハンドラー（L60-68）
   理由: 引当確定の記録
   業務フロー:
   - 引当作成（reserved）: 仮引当
   - 引当確定（confirmed）: 出荷確定
   → 確定時に AllocationConfirmedEvent が発行される
   記録内容:
   - allocation_id, lot_id, quantity
   業務的意義:
   - 出荷実績の記録
   - 在庫確定のタイミングを追跡

7. 将来の拡張例（L71-82）
   理由: 実装予定の機能を明示
   notify_low_stock (L74-77):
   - 用途: 在庫が閾値を下回ったらアラート
   - 業務シナリオ: 在庫50個以下になったら購買部門に通知
   → 自動発注の起点
   sync_to_erp (L80-82):
   - 用途: SAPへの引当データ同期
   - 業務シナリオ: 引当確定後、自動的にSAPに登録
   → 手作業不要、リアルタイム連携

8. async/await の使用（L33, L49, L61）
   理由: 非同期処理対応
   現在:
   - logger.info() のみ → 実際は同期処理
   - しかし、async def にしておく → 将来の拡張に備える
   将来:
   - DB書き込み: await db.execute(...)
   - API呼び出し: await http_client.post(...)
   → async/await が必須

9. なぜログレベルを info にするのか（L38, L51, L63）
   理由: イベントは正常な業務フロー
   ログレベル:
   - error: エラー発生時
   - warning: 異常だが続行可能
   - info: 通常の業務イベント（←今回）
   - debug: 開発時のデバッグ情報
   業務的意義:
   - 在庫変更や引当は正常な業務 → info レベル
   → 本番環境でも記録される

10. TYPE_CHECKING の使用（L16, L26-27）
    理由: 循環インポート回避
    問題:
    - handlers.py → events.py → handlers.py（循環）
    → インポートエラー
    解決:
    - TYPE_CHECKING: 型チェック時のみインポート
    → 実行時はインポートされない
    → 循環回避
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
