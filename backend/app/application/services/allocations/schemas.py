"""Allocation schema definitions.

Data transfer objects (DTOs) for allocation operations:
- FEFO allocation plans (preview/commit)
- Domain exceptions

【設計意図】引当スキーマの設計判断:

1. なぜ dataclass を使うのか
   理由: シンプルなデータ構造を簡潔に定義
   メリット:
   - __init__, __repr__, __eq__ が自動生成
   - 型ヒントが必須 → 型安全性向上
   - 不変性（frozen=True）が簡単に実現可能
   代替案との比較:
   - Pydantic: バリデーション機能が豊富だが、重い
   - dataclass: 軽量、ドメイン層に適している

2. FefoLotPlan の設計（L11-17）
   理由: 1ロットの引当計画を表現
   フィールド:
   - lot_id: どのロット
   - allocate_qty: 引当数量
   - expiry_date, receipt_date: ソート順の可視化
   - lot_number: UI表示用
   用途:
   - FEFO引当プレビューの表示
   → 「ロットAから50個、ロットBから30個」

3. FefoLinePlan の設計（L20-31）
   理由: 1明細の引当計画を表現
   フィールド:
   - order_line_id: どの明細
   - product_id, warehouse_id: 引当条件
   - required_qty: 必要数量
   - already_allocated_qty: 既存引当数量
   - allocations: ロット別の引当計画（FefoLotPlan のリスト）
   - next_div: 梱包単位（丸め処理用）
   - warnings: 警告メッセージ（次区未設定等）
   業務的意義:
   - 明細ごとの引当状況を構造化

4. default_factory=list の使用理由（L28, L30）
   理由: 可変デフォルト値の安全な実装
   問題:
   - allocations: list = [] → 全インスタンスで共有される（危険）
   解決:
   - allocations: list = field(default_factory=list)
   → インスタンスごとに新しいリストを生成
   Python の仕様:
   - デフォルト値は関数定義時に1回だけ評価される
   → 可変オブジェクトを共有してしまう

5. FefoPreviewResult の設計（L34-38）
   理由: 受注全体の引当プレビュー結果
   フィールド:
   - order_id: どの受注
   - lines: 全明細の引当計画（FefoLinePlan のリスト）
   - warnings: 受注レベルの警告（全明細で次区未設定等）
   用途:
   - フロントエンドでのプレビュー表示
   → 「確定」ボタン押下前の確認画面

6. FefoCommitResult の設計（L41-44）
   理由: 引当確定処理の結果
   フィールド:
   - preview: プレビュー結果（どの引当計画を確定したか）
   - created_reservations: 実際に作成された予約（P3: LotReservation）
   業務的意義:
   - 確定処理の結果を記録
   → 監査証跡、トラブルシューティング用

7. AllocationCommitError の設計（L46-69）
   理由: 引当確定時のエラーを構造化
   フィールド:
   - error_code: エラーコード（"ALREADY_CONFIRMED" 等）
   - message: エラーメッセージ
   後方互換性（L49-68）:
   - 旧: AllocationCommitError("エラーメッセージ")
   - 新: AllocationCommitError("ERROR_CODE", "エラーメッセージ")
   → 両方の呼び出し方に対応
   業務的意義:
   - エラーコードで分岐処理が可能
   → フロントエンドでエラーメッセージを表示

8. AllocationNotFoundError の設計（L71-75）
   理由: 引当が見つからないエラー
   用途:
   - confirm_reservation(reservation_id=999)
   → 存在しない予約IDを指定した場合
   業務的意義:
   - NotFoundエラーとして統一的に処理
   → 404 Not Found レスポンス

9. なぜ InsufficientStockError を再エクスポートするのか（L6）
   理由: 引当関連のエラーを1箇所にまとめる
   実装:
   - from app.domain.errors import InsufficientStockError
   → このモジュールから import 可能に
   メリット:
   - 呼び出し側で import 先を統一
   → from allocations.schemas import AllocationCommitError, InsufficientStockError

10. P3 コメントの意義（L43, L52, L86）
    理由: v3.0 での設計変更を明示
    変更内容:
    - v2.x: Allocation（引当）と LotReservation（予約）の2テーブル
    - v3.x: LotReservation のみに統一
    実装:
    - created_allocations → created_reservations（フィールド名変更）
    - lot_reservations instead of allocations（コメント）
    メリット:
    - レビュー時に「なぜ reservations なのか」がすぐわかる
    → コードの理解を促進
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date

from app.domain.errors import DomainError, InsufficientStockError  # noqa: F401
from app.infrastructure.persistence.models.lot_reservations_model import LotReservation


@dataclass
class FefoLotPlan:
    lot_id: int
    allocate_qty: float
    expiry_date: date | None
    receipt_date: date | None
    lot_number: str


@dataclass
class FefoLinePlan:
    order_line_id: int
    product_id: int | None
    product_code: str
    warehouse_id: int | None
    warehouse_code: str | None
    required_qty: float
    already_allocated_qty: float
    allocations: list[FefoLotPlan] = field(default_factory=list)
    next_div: str | None = None
    warnings: list[str] = field(default_factory=list)


@dataclass
class FefoPreviewResult:
    order_id: int
    lines: list[FefoLinePlan]
    warnings: list[str] = field(default_factory=list)


@dataclass
class FefoCommitResult:
    preview: FefoPreviewResult
    created_reservations: list[LotReservation]  # P3: Renamed from created_allocations


class AllocationCommitError(DomainError):
    """Raised when FEFO allocation cannot be committed."""

    def __init__(self, error_code_or_message: str, message: str | None = None):
        """Initialize with error code and optional message.

        Args:
            error_code_or_message: Error code (e.g., 'ALREADY_CONFIRMED') or message if only one arg
            message: Human-readable error message (optional, for new-style calls)

        Note:
            For backward compatibility, if only one argument is provided,
            it is treated as both error_code and message.
        """
        if message is None:
            # Backward compatible: single argument is both error_code and message
            self.error_code = "COMMIT_ERROR"
            self.message = error_code_or_message
        else:
            # New style: error_code + message
            self.error_code = error_code_or_message
            self.message = message
        super().__init__(self.message)


class AllocationNotFoundError(DomainError):
    """Raised when the specified allocation is not found in DB."""

    pass


class AllocationBlockedError(DomainError):
    """Raised when allocation is blocked due to missing supplier mapping."""

    pass
