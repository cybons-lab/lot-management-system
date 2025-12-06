# backend/app/domain/allocation/state_machine.py
"""引当状態遷移マシン 引当ステータスの遷移ルールを集約管理."""

from enum import Enum

from .exceptions import InvalidTransitionError


class AllocationStatus(Enum):
    """引当ステータス."""

    ACTIVE = "active"  # 有効（引当済み）
    SHIPPED = "shipped"  # 出荷済み
    CANCELLED = "cancelled"  # 取消済み


class AllocationStateMachine:
    """引当状態遷移マシン.

    状態遷移ルール:
    - active -> shipped (出荷時)
    - active -> cancelled (引当取消時)
    - shipped -> (遷移不可)
    - cancelled -> (遷移不可)
    """

    # 許可された状態遷移マップ
    TRANSITIONS: dict[AllocationStatus, set[AllocationStatus]] = {
        AllocationStatus.ACTIVE: {AllocationStatus.SHIPPED, AllocationStatus.CANCELLED},
        AllocationStatus.SHIPPED: set(),  # 終端状態
        AllocationStatus.CANCELLED: set(),  # 終端状態
    }

    @classmethod
    def can_transition(
        cls, from_status: str | AllocationStatus, to_status: str | AllocationStatus
    ) -> bool:
        """指定された状態遷移が可能かチェック.

        Args:
            from_status: 遷移元ステータス
            to_status: 遷移先ステータス

        Returns:
            遷移可能ならTrue
        """
        if isinstance(from_status, str):
            try:
                from_status = AllocationStatus(from_status)
            except ValueError:
                return False

        if isinstance(to_status, str):
            try:
                to_status = AllocationStatus(to_status)
            except ValueError:
                return False

        return to_status in cls.TRANSITIONS.get(from_status, set())

    @classmethod
    def validate_transition(
        cls, from_status: str | AllocationStatus, to_status: str | AllocationStatus
    ) -> None:
        """状態遷移をバリデーション（不正な場合は例外）.

        Args:
            from_status: 遷移元ステータス
            to_status: 遷移先ステータス

        Raises:
            InvalidTransitionError: 不正な遷移の場合
        """
        from_str = from_status.value if isinstance(from_status, AllocationStatus) else from_status
        to_str = to_status.value if isinstance(to_status, AllocationStatus) else to_status

        if not cls.can_transition(from_status, to_status):
            raise InvalidTransitionError(from_str, to_str)

    @classmethod
    def can_cancel(cls, status: str | AllocationStatus) -> bool:
        """引当を取り消せるかチェック."""
        return cls.can_transition(status, AllocationStatus.CANCELLED)

    @classmethod
    def can_ship(cls, status: str | AllocationStatus) -> bool:
        """出荷できるかチェック."""
        return cls.can_transition(status, AllocationStatus.SHIPPED)
