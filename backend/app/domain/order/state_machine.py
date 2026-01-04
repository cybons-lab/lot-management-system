# backend/app/domain/order/state_machine.py
"""受注状態遷移マシン.

【設計意図】状態遷移マシンパターンの設計判断:

1. なぜ状態遷移マシンパターンを採用したのか
   理由: 受注の複雑な状態管理を明示的・安全に実装
   業務背景:
   - 自動車部品の受注は、複数の段階を経て完了する
   - 各段階で許可される操作が異なる
   - 不正な状態遷移（例: 出荷済み→下書き）を防ぐ必要がある

   代替案との比較:
   - if文で都度チェック → 漏れやバグが発生しやすい
   - 状態遷移マシン → 遷移ルールを1箇所で定義、変更が容易

2. 状態遷移の業務的意義
   状態フロー:
   draft → open → part_allocated → allocated → shipped → closed
   ↓         ↓          ↓              ↓
   cancelled  cancelled   cancelled      cancelled

   各状態の業務的意味:
   - draft: 営業担当者が受注書を作成中（確定前）
   - open: 得意先から正式受注、引当可能
   - part_allocated: 一部の明細のみ引当済み（在庫不足等）
   - allocated: 全明細の引当完了、出荷準備可能
   - shipped: 出荷完了、納品書発行済み
   - closed: 得意先が検収完了、売上計上
   - cancelled: キャンセル（理由: 得意先都合、在庫不足等）

3. なぜ Enum を使うのか（L13-48）
   理由: 型安全性と IDE 補完のサポート
   比較:
   - 文字列定数: "open", "closed" → タイポでバグ、IDE補完なし
   - Enum: OrderStatus.OPEN → タイポ時にエラー、IDE補完あり
   メリット:
   - リファクタリング時に全ての参照箇所を自動検出
   - 誤った値の代入をコンパイル時（型チェック時）に検出

4. TRANSITIONS 辞書の設計（L72-93）
   理由: 遷移ルールを宣言的に定義
   データ構造:
   ```python
   {
     OrderStatus.OPEN: {OrderStatus.PART_ALLOCATED, OrderStatus.ALLOCATED, ...},
     # → OPEN から遷移可能な状態のセット
   }
   ```
   メリット:
   - ビジネスルール変更時に、この辞書を修正するだけ
   - 新しい状態追加時に、遷移ルールを一目で把握可能
   - グラフ理論的な解析が容易（孤立状態の検出等）

5. 終端状態の設計（L91-92）
   理由: 不可逆な状態を明示的に表現
   業務ルール:
   - closed（完了）: 売上計上済み → 過去の取引記録として固定
   - cancelled（キャンセル）: 取引中止 → 履歴として残すが変更不可
   → 空セットで「どこにも遷移できない」ことを表現
   メリット: 誤って過去取引を変更するバグを防止

6. can_transition() の柔軟性（L96-110）
   理由: 文字列と Enum の両方をサポート
   背景:
   - ドメイン層: Enum を使用（型安全）
   - データベース: 文字列で保存
   - API: JSON で文字列として送受信
   → 各レイヤーで自然な形式を使いつつ、変換は自動化

7. validate_transition() でログ出力する理由（L139-151）
   理由: 不正な遷移試行をトレースして業務分析
   用途:
   - デバッグ: どの操作で不正遷移が起きたか特定
   - 業務分析: 「キャンセルから出荷への遷移試行」が多い
   → UI の改善ポイント（キャンセル済み受注を出荷ボタンから除外）
   ログレベル:
   - DEBUG: 正常な遷移チェック（大量に出力）
   - WARNING: 不正な遷移試行（異常検知）

8. can_cancel() / can_ship() の存在理由（L154-161）
   理由: 業務的によく使う判定をヘルパーメソッド化
   用途:
   - UI: 「キャンセルボタンを表示するか」の判定
   - ビジネスロジック: 出荷処理前の状態チェック
   メリット:
   - can_transition(status, OrderStatus.CANCELLED) より読みやすい
   - 業務用語に近い命名（can_cancel）でコードの意図が明確
"""

import logging
from enum import Enum

from .exceptions import InvalidOrderStatusError


logger = logging.getLogger(__name__)


class OrderStatus(Enum):
    """受注ステータス."""

    DRAFT = "draft"  # 下書き
    OPEN = "open"  # 新規受注（引当可能）
    PART_ALLOCATED = "part_allocated"  # 部分引当済み
    ALLOCATED = "allocated"  # 完全引当済み
    SHIPPED = "shipped"  # 出荷済み
    CLOSED = "closed"  # 完了
    CANCELLED = "cancelled"  # キャンセル

    @classmethod
    def from_str(cls, status: str) -> "OrderStatus":
        """文字列からEnumに変換.

        Args:
            status: ステータス文字列

        Returns:
            OrderStatus: 対応するEnum

        Raises:
            ValueError: 無効なステータス文字列の場合
        """
        try:
            return cls(status)
        except ValueError as e:
            raise ValueError(f"Invalid order status: {status}") from e

    def to_str(self) -> str:
        """EnumからDB保存用の文字列に変換.

        Returns:
            str: ステータス文字列
        """
        return self.value


class OrderStateMachine:
    """受注状態遷移マシン.

    状態遷移ルール:
    - draft -> open (受注確定時)
    - draft -> cancelled (キャンセル時)
    - open -> part_allocated (部分引当時)
    - open -> allocated (完全引当時)
    - open -> cancelled (キャンセル時)
    - part_allocated -> open (引当取消時)
    - part_allocated -> allocated (完全引当時)
    - part_allocated -> cancelled (キャンセル時)
    - allocated -> shipped (出荷時)
    - allocated -> part_allocated (一部引当解除時)
    - allocated -> open (全引当取消時)
    - allocated -> cancelled (キャンセル時)
    - shipped -> closed (完了時)
    - closed -> (遷移不可)
    - cancelled -> (遷移不可)
    """

    TRANSITIONS: dict[OrderStatus, set[OrderStatus]] = {
        OrderStatus.DRAFT: {OrderStatus.OPEN, OrderStatus.CANCELLED},
        OrderStatus.OPEN: {
            OrderStatus.PART_ALLOCATED,
            OrderStatus.ALLOCATED,
            OrderStatus.CANCELLED,
        },
        OrderStatus.PART_ALLOCATED: {
            OrderStatus.OPEN,
            OrderStatus.ALLOCATED,
            OrderStatus.CANCELLED,
        },
        OrderStatus.ALLOCATED: {
            OrderStatus.SHIPPED,
            OrderStatus.PART_ALLOCATED,
            OrderStatus.OPEN,
            OrderStatus.CANCELLED,
        },
        OrderStatus.SHIPPED: {OrderStatus.CLOSED},
        OrderStatus.CLOSED: set(),  # 終端状態
        OrderStatus.CANCELLED: set(),  # 終端状態
    }

    @classmethod
    def can_transition(cls, from_status: str | OrderStatus, to_status: str | OrderStatus) -> bool:
        """状態遷移が可能かチェック."""
        if isinstance(from_status, str):
            try:
                from_status = OrderStatus(from_status)
            except ValueError:
                return False

        if isinstance(to_status, str):
            try:
                to_status = OrderStatus(to_status)
            except ValueError:
                return False

        return to_status in cls.TRANSITIONS.get(from_status, set())

    @classmethod
    def validate_transition(
        cls,
        from_status: str | OrderStatus,
        to_status: str | OrderStatus,
        operation: str = "transition",
    ) -> None:
        """状態遷移をバリデーション（Enum推奨）.

        Args:
            from_status: 遷移元ステータス（Enum推奨、str互換）
            to_status: 遷移先ステータス（Enum推奨、str互換）
            operation: 操作名（ログ・エラーメッセージ用）

        Raises:
            InvalidOrderStatusError: 遷移が不正な場合
        """
        # Enum に変換
        from_enum = (
            from_status
            if isinstance(from_status, OrderStatus)
            else OrderStatus.from_str(from_status)
        )
        to_enum = (
            to_status if isinstance(to_status, OrderStatus) else OrderStatus.from_str(to_status)
        )

        logger.debug(
            f"CALL validate_transition: from={from_enum.value} to={to_enum.value} operation={operation}"
        )

        if not cls.can_transition(from_enum, to_enum):
            logger.warning(
                f"EXC validate_transition: Invalid transition from={from_enum.value} to={to_enum.value}"
            )
            raise InvalidOrderStatusError(from_enum.value, operation)

        logger.debug(
            f"RET validate_transition: Transition allowed from={from_enum.value} to={to_enum.value}"
        )

    @classmethod
    def can_cancel(cls, status: str | OrderStatus) -> bool:
        """キャンセル可能かチェック."""
        return cls.can_transition(status, OrderStatus.CANCELLED)

    @classmethod
    def can_ship(cls, status: str | OrderStatus) -> bool:
        """出荷可能かチェック."""
        return cls.can_transition(status, OrderStatus.SHIPPED)
