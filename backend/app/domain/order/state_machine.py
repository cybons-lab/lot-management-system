# backend/app/domain/order/state_machine.py
"""
受注状態遷移マシン
"""

from enum import Enum
from typing import Set

from .exceptions import InvalidOrderStatusError


class OrderStatus(Enum):
    """受注ステータス"""
    OPEN = "open"              # 新規受注
    ALLOCATED = "allocated"    # 引当済み
    SHIPPED = "shipped"        # 出荷済み
    CLOSED = "closed"          # 完了
    CANCELLED = "cancelled"    # キャンセル


class OrderStateMachine:
    """
    受注状態遷移マシン
    
    状態遷移ルール:
    - open -> allocated (引当完了時)
    - open -> cancelled (キャンセル時)
    - allocated -> shipped (出荷時)
    - allocated -> open (引当取消時)
    - allocated -> cancelled (キャンセル時)
    - shipped -> closed (完了時)
    - closed -> (遷移不可)
    - cancelled -> (遷移不可)
    """
    
    TRANSITIONS: dict[OrderStatus, Set[OrderStatus]] = {
        OrderStatus.OPEN: {
            OrderStatus.ALLOCATED,
            OrderStatus.CANCELLED
        },
        OrderStatus.ALLOCATED: {
            OrderStatus.SHIPPED,
            OrderStatus.OPEN,
            OrderStatus.CANCELLED
        },
        OrderStatus.SHIPPED: {
            OrderStatus.CLOSED
        },
        OrderStatus.CLOSED: set(),      # 終端状態
        OrderStatus.CANCELLED: set(),   # 終端状態
    }
    
    @classmethod
    def can_transition(
        cls,
        from_status: str | OrderStatus,
        to_status: str | OrderStatus
    ) -> bool:
        """状態遷移が可能かチェック"""
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
        operation: str = "transition"
    ) -> None:
        """状態遷移をバリデーション"""
        from_str = from_status.value if isinstance(from_status, OrderStatus) else from_status
        
        if not cls.can_transition(from_status, to_status):
            raise InvalidOrderStatusError(from_str, operation)
    
    @classmethod
    def can_cancel(cls, status: str | OrderStatus) -> bool:
        """キャンセル可能かチェック"""
        return cls.can_transition(status, OrderStatus.CANCELLED)
    
    @classmethod
    def can_ship(cls, status: str | OrderStatus) -> bool:
        """出荷可能かチェック"""
        return cls.can_transition(status, OrderStatus.SHIPPED)
