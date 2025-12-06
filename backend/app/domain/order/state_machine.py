# backend/app/domain/order/state_machine.py
"""受注状態遷移マシン."""

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
