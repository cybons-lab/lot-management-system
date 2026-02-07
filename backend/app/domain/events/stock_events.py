# backend/app/domain/events/stock_events.py
"""Stock-related domain events.

【設計意図】在庫イベント設計の設計判断:

1. なぜ在庫変更をイベントとして発行するのか
   理由: 在庫変更の履歴追跡と副作用の分離
   問題:
   - 在庫更新時: ログ記録、アラート通知、統計更新等が必要
   → これらをサービス層に直接書くと、コードが肥大化
   解決:
   - イベント発行: 「在庫が変わった」という事実のみ記録
   → 各ハンドラーが独立して処理（ログ、通知、統計）
   メリット:
   - ビジネスロジックがシンプル
   - 機能追加が容易（新しいハンドラーを追加するだけ）
   - テストが容易（イベント発行の検証のみ）

2. @dataclass(frozen=True) の理由（L12, L34, L55）
   理由: イベントの不変性保証
   設計原則:
   - イベント: 「発生した事実」を表す
   → 事実は変更不可能（過去の歴史は書き換えられない）
   frozen=True の効果:
   - フィールドの変更を禁止
   → event.quantity = 100 → エラー
   メリット:
   - イベントの改ざんを防止
   - 並行処理で安全（複数スレッドで共有可能）
   - Event Sourcing パターンに準拠

3. StockChangedEvent の設計（L13-31）
   理由: 在庫数量変更の詳細を記録
   フィールド:
   - lot_id: どのロット
   - quantity_before: 変更前の数量
   - quantity_after: 変更後の数量
   - quantity_change: 変更量（+100, -50 等）
   - reason: 変更理由（"入庫", "出荷", "調整" 等）
   業務的意義:
   - 監査ログ: 在庫の増減を全て記録
   - トラブルシューティング: 「なぜ在庫が減ったか」を追跡
   - 統計分析: 出荷量、入庫量の集計
   使用例:
   ```python
   event = StockChangedEvent(
       lot_id=123,
       quantity_before=Decimal("100"),
       quantity_after=Decimal("50"),
       quantity_change=Decimal("-50"),
       reason="出荷",
   )
   await EventDispatcher.dispatch(event)
   ```

4. quantity_change の符号規則
   理由: 増減を明確に表現
   規則:
   - 正数（+100）: 在庫増加（入庫、返品等）
   - 負数（-50）: 在庫減少（出荷、調整等）
   - ゼロ（0）: 補正（変更なし）
   メリット:
   - 符号だけで増減が判断可能
   - 統計計算が容易（sum で合計変更量）
   使用例:
   ```python
   # 入庫
   StockChangedEvent(quantity_change=Decimal("100"), reason="入庫")
   # 出荷
   StockChangedEvent(quantity_change=Decimal("-50"), reason="出荷")
   ```

5. AllocationCreatedEvent の設計（L35-52）
   理由: 引当作成の記録
   フィールド:
   - allocation_id: 作成された引当ID
   - order_line_id: どの受注明細に対する引当か
   - lot_id: どのロットから引当したか
   - quantity: 引当数量
   - allocation_type: "soft"（仮引当） or "hard"（確定引当）
   業務的意義:
   - 引当履歴の記録
   - 在庫引当アラート（在庫が減った通知）
   - 受注進捗の追跡
   使用例:
   ```python
   event = AllocationCreatedEvent(
       allocation_id=456,
       order_line_id=789,
       lot_id=123,
       quantity=Decimal("50"),
       allocation_type="soft",
   )
   ```

6. AllocationConfirmedEvent の設計（L56-69）
   理由: ソフト引当からハード引当への確定を記録
   業務フロー:
   - ソフト引当（soft）: 仮引当（在庫確保）
   - ハード引当（hard）: 確定引当（出荷確定）
   → 確定時に AllocationConfirmedEvent が発行される
   フィールド:
   - allocation_id: 確定された引当ID
   - lot_id: ロットID
   - quantity: 確定数量
   用途:
   - 出荷実績の記録
   - SAP連携のトリガー（確定後にSAP登録）
   - 在庫確定のタイミング記録

7. デフォルト値の設計（L27-31, L48-52, L67-69）
   理由: dataclass の初期化を安全にする
   背景:
   - frozen=True: 不変オブジェクト
   → __init__() で全フィールドを指定する必要
   → デフォルト値があれば、省略可能
   デフォルト値:
   - int: 0
   - Decimal: Decimal("0")
   - str: ""
   メリット:
   - テストコードで部分的な初期化が可能
   - 将来的なフィールド追加時の互換性

8. Decimal 型の使用（L7, L28-30）
   理由: 数量計算の精度保証
   問題:
   - float: 0.1 + 0.2 = 0.30000000000000004（誤差）
   → イベントログの数量が不正確
   解決:
   - Decimal: 十進数を正確に表現
   → イベントログの数量が正確
   業務影響:
   - 監査ログで正確な数量を記録
   - 統計計算で誤差が蓄積しない

9. DomainEvent 継承の意義（L9, L13, L35, L56）
   理由: 全イベントで共通の構造を持つ
   base.py からの継承:
   - event_id: UUID（イベントの一意識別子）
   - occurred_at: UTC datetime（発生日時）
   メリット:
   - 全イベントが追跡可能（event_id でログ検索）
   - 時系列順にソート可能（occurred_at でソート）
   - Event Sourcing パターンに準拠

10. イベント名の命名規則
    理由: 過去形で「発生した事実」を表現
    命名:
    - StockChanged（在庫が変わった）
    - AllocationCreated（引当が作成された）
    - AllocationConfirmed（引当が確定された）
    × 命令形（ChangeStock, CreateAllocation）は不適
    メリット:
    - イベントの性質が明確（事実の記録）
    - ドメインイベントパターンに準拠
"""

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
