# backend/app/domain/allocation/__init__.py
"""Allocation Domain Layer.

【設計意図】引当ドメインパッケージの設計判断:

1. なぜ __init__.py で公開APIを定義するのか
   理由: パッケージの境界を明確にし、内部実装を隠蔽
   設計原則: Information Hiding（情報隠蔽）
   メリット:
   - 外部から使うべきクラス・関数が明確
   - 内部実装の変更が外部に影響しない
   - IDEの補完で必要なクラスのみ表示される

2. インポートの構成（L4-20）
   理由: 引当ドメインの4つの責務を分離
   構成:
   - calculator.py: 純粋関数による引当計算ロジック（FEFO）
   - exceptions.py: エラー処理（例外階層）
   - rounding.py: 丸めポリシー（Decimal精度）
   - types.py: データクラス定義（Request/Decision/Result）
   設計パターン: Single Responsibility Principle（単一責任の原則）
   → 各モジュールが1つの責務のみを持つ

3. LotCandidate の外部パッケージからのインポート（L4）
   理由: ロットドメインとの協調
   背景:
   - LotCandidate: ロット候補（ロットドメインで定義）
   - calculate_allocation: 引当計算（引当ドメイン）
   → ロットドメインの型を引当ドメインで利用
   設計:
   - app.domain.lot から明示的にインポート
   → ドメイン層間の依存関係を明確化

4. __all__ の構成（L23-40）
   理由: 引当ドメインの公開APIを3つのカテゴリに分類
   カテゴリ:
   - Exceptions（L24-30）: エラーハンドリング
   - Rounding（L31-33）: 丸めポリシー
   - Allocation Calculator（L34-39）: 引当計算

5. 例外の公開（L24-30）
   理由: 引当処理の全エラーを外部から利用可能に
   公開する例外:
   - ValidationError: バリデーションエラー
   - NotFoundError: リソース不在
   - ConflictError: 競合エラー
   - InvalidTransitionError: 不正な状態遷移
   - InsufficientStockError: 在庫不足（重要！）
   - AlreadyAllocatedError: 既に引当済み
   用途:
   - サービス層でのエラーハンドリング
   - APIレイヤーでのHTTPステータスコード変換

6. 丸めポリシーの公開（L31-33）
   理由: 数量計算の精度制御を外部から利用可能に
   公開するクラス:
   - RoundingPolicy: 丸め処理の実行クラス
   - RoundingMode: 丸めモード（CEIL/FLOOR/HALF_UP）
   用途:
   - 引当数量の丸め処理
   - 在庫調整の丸め処理
   業務的意義:
   - 自動車部品の最小単位（梱包単位等）への丸め

7. 引当計算の公開（L34-39）
   理由: 引当ドメインの中核ロジックを外部から利用可能に
   公開するAPI:
   - calculate_allocation: 引当計算関数（Pure Function）
   - LotCandidate: ロット候補（ロットドメインから再エクスポート）
   - AllocationRequest: 引当リクエスト（入力）
   - AllocationDecision: 引当決定（中間結果）
   - AllocationResult: 引当結果（出力）
   設計:
   - 純粋関数で実装（副作用なし）
   → テストが容易、並行処理で安全

8. なぜ型定義（Request/Decision/Result）を公開するのか
   理由: 引当計算のインターフェースを明確化
   メリット:
   - サービス層で AllocationRequest を構築
   - 引当結果を AllocationResult で受け取る
   → 型ヒントにより、IDEでの補完が効く
   → 誤った引数の受け渡しを防止

9. InsufficientStockError の重要性
   理由: 在庫不足は最も頻繁に発生するエラー
   業務シナリオ:
   - 受注100個に対して在庫50個しかない
   → InsufficientStockError(required=100, available=50)
   用途:
   - 在庫不足アラート通知
   - 発注提案の生成
   - フロントエンドでの在庫不足メッセージ表示

10. パッケージ設計の原則
    理由: クリーンアーキテクチャの実践
    原則:
    - ドメイン層は他の層に依存しない
    - 引当ロジックを純粋関数として実装
    - 技術的詳細（DB、API等）を排除
    効果:
    - テストが容易（モック不要、入力→出力のテスト）
    - ビジネスロジックの再利用性向上
    - 並行処理で安全（副作用なし）
"""

from app.domain.lot import LotCandidate

from .calculator import calculate_allocation
from .exceptions import (
    AlreadyAllocatedError,
    ConflictError,
    InsufficientStockError,
    InvalidTransitionError,
    NotFoundError,
    ValidationError,
)
from .rounding import RoundingMode, RoundingPolicy
from .types import (
    AllocationDecision,
    AllocationRequest,
    AllocationResult,
)


__all__ = [
    # Exceptions
    "ValidationError",
    "NotFoundError",
    "ConflictError",
    "InvalidTransitionError",
    "InsufficientStockError",
    "AlreadyAllocatedError",
    # Rounding
    "RoundingPolicy",
    "RoundingMode",
    # Allocation Calculator
    "calculate_allocation",
    "LotCandidate",
    "AllocationRequest",
    "AllocationDecision",
    "AllocationResult",
]
