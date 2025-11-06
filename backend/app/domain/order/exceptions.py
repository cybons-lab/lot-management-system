# backend/app/domain/order/exceptions.py
"""受注ドメインの例外定義."""

from app.domain.errors import DomainError


class OrderDomainError(DomainError):
    """受注ドメイン層の基底例外."""

    default_code = "ORDER_ERROR"

    def __init__(self, message: str, code: str | None = None):
        super().__init__(message, code=code or self.default_code)


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


class ProductNotFoundError(OrderDomainError):
    """製品が存在しない場合のエラー."""

    def __init__(self, product_code: str):
        message = f"Product not found: {product_code}"
        super().__init__(message, code="PRODUCT_NOT_FOUND")
