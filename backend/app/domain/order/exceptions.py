# backend/app/domain/order/exceptions.py
"""
受注ドメインの例外定義
"""

class OrderDomainError(Exception):
    """受注ドメイン層の基底例外"""
    def __init__(self, message: str, code: str = "ORDER_ERROR"):
        self.message = message
        self.code = code
        super().__init__(self.message)


class OrderNotFoundError(OrderDomainError):
    """受注不在エラー"""
    def __init__(self, order_id: int):
        message = f"Order not found: {order_id}"
        super().__init__(message, code="ORDER_NOT_FOUND")


class OrderLineNotFoundError(OrderDomainError):
    """受注明細不在エラー"""
    def __init__(self, order_line_id: int):
        message = f"OrderLine not found: {order_line_id}"
        super().__init__(message, code="ORDER_LINE_NOT_FOUND")


class InvalidOrderStatusError(OrderDomainError):
    """不正な受注ステータスエラー"""
    def __init__(self, current_status: str, operation: str):
        message = f"Cannot {operation} order with status: {current_status}"
        super().__init__(message, code="INVALID_ORDER_STATUS")


class DuplicateOrderError(OrderDomainError):
    """重複受注エラー"""
    def __init__(self, order_no: str):
        message = f"Order already exists: {order_no}"
        super().__init__(message, code="DUPLICATE_ORDER")


class OrderValidationError(OrderDomainError):
    """受注バリデーションエラー"""
    def __init__(self, message: str):
        super().__init__(message, code="ORDER_VALIDATION_ERROR")
