# backend/app/domain/order/__init__.py
"""Order Domain Layer.

【設計意図】受注ドメインパッケージの設計判断:

1. なぜ __init__.py で公開APIを定義するのか
   理由: パッケージの境界を明確にし、内部実装を隠蔽
   設計原則: Information Hiding（情報隠蔽）
   メリット:
   - 外部から使うべきクラス・関数が明確
   - 内部実装の変更が外部に影響しない
   - IDEの補完で必要なクラスのみ表示される

2. インポートの構成（L4-16）
   理由: 受注ドメインの3つの責務を分離
   構成:
   - exceptions.py: エラー処理（例外階層）
   - state_machine.py: 状態遷移ロジック
   - business_rules.py: ビジネスルール検証
   設計パターン: Single Responsibility Principle（単一責任の原則）
   → 各モジュールが1つの責務のみを持つ

3. __all__ の役割（L19-35）
   理由: 明示的な公開APIリストの定義
   効果:
   - from app.domain.order import * での制御
   - API ドキュメント生成時の明確化
   - 外部パッケージが依存すべきAPIの明示

4. 例外の公開（L20-29）
   理由: 受注ドメインの全エラーを外部から利用可能に
   公開する例外:
   - OrderDomainError: 基底例外（全エラーをキャッチ可能）
   - OrderNotFoundError: 受注不在
   - OrderLockedError: ロック中
   - OrderValidationError: バリデーションエラー
   用途:
   - サービス層でのエラーハンドリング
   - APIレイヤーでのHTTPステータスコード変換

5. 状態マシンの公開（L30-32）
   理由: 受注の状態遷移ロジックを外部から利用可能に
   公開するクラス:
   - OrderStateMachine: 状態遷移の検証・実行
   - OrderStatus: 状態Enum（draft, open, allocated, ...）
   用途:
   - サービス層での状態遷移チェック
   - UIでの状態表示・フィルタリング

6. ビジネスルールの公開（L33-34）
   理由: 受注のバリデーションロジックを外部から利用可能に
   公開するクラス:
   - OrderBusinessRules: 静的メソッドの集合
   用途:
   - サービス層での入力検証
   - 進捗率計算等のビジネスロジック

7. なぜ内部実装を非公開にするのか
   理由: 実装の詳細を隠蔽し、変更の影響を最小化
   非公開の例:
   - ヘルパー関数
   - 内部データ構造
   - 実装の詳細
   メリット:
   - リファクタリングが容易
   - 外部への影響を最小化

8. パッケージ設計の原則
   理由: クリーンアーキテクチャの実践
   原則:
   - ドメイン層は他の層に依存しない
   - ビジネスロジックをドメイン層に集約
   - 技術的詳細（DB、API等）を排除
   効果:
   - テストが容易（モック不要）
   - ビジネスロジックの再利用性向上
"""

from .business_rules import OrderBusinessRules
from .exceptions import (
    DuplicateOrderError,
    InvalidOrderStatusError,
    OrderDomainError,
    OrderLineNotFoundError,
    OrderLockedError,
    OrderLockOwnershipError,
    OrderNotFoundError,
    OrderValidationError,
    ProductNotFoundError,
)
from .state_machine import OrderStateMachine, OrderStatus


__all__ = [
    # Exceptions
    "OrderDomainError",
    "OrderNotFoundError",
    "OrderLineNotFoundError",
    "InvalidOrderStatusError",
    "DuplicateOrderError",
    "OrderValidationError",
    "ProductNotFoundError",
    "OrderLockedError",
    "OrderLockOwnershipError",
    # State Machine
    "OrderStateMachine",
    "OrderStatus",
    # Business Rules
    "OrderBusinessRules",
]
