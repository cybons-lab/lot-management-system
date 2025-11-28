# backend/app/domain/order/exceptions.py
"""受注ドメインの例外定義."""

from app.domain.errors import DomainError


class OrderDomainError(DomainError):
    """受注ドメイン層の基底例外."""

    default_code = "ORDER_ERROR"

    def __init__(self, message: str, code: str | None = None, details: dict | None = None):
        """初期化.

        Args:
            message: エラーメッセージ
            code: エラーコード
            details: 詳細情報
        """
        super().__init__(message, code=code or self.default_code, details=details)


class OrderNotFoundError(OrderDomainError):
    """受注不在エラー."""

    def __init__(self, order_id: int):
        """初期化.

        Args:
            order_id: 見つからなかった受注ID
        """
        message = f"Order not found: {order_id}"
        super().__init__(message, code="ORDER_NOT_FOUND", details={"order_id": order_id})


class OrderLineNotFoundError(OrderDomainError):
    """受注明細不在エラー."""

    def __init__(self, order_line_id: int):
        """初期化.

        Args:
            order_line_id: 見つからなかった受注明細ID
        """
        message = f"OrderLine not found: {order_line_id}"
        super().__init__(
            message,
            code="ORDER_LINE_NOT_FOUND",
            details={"order_line_id": order_line_id},
        )


class InvalidOrderStatusError(OrderDomainError):
    """不正な受注ステータスエラー."""

    def __init__(self, current_status: str, operation: str):
        """初期化.

        Args:
            current_status: 現在のステータス
            operation: 実行しようとした操作
        """
        message = f"Cannot {operation} order with status: {current_status}"
        super().__init__(
            message,
            code="INVALID_ORDER_STATUS",
            details={"current_status": current_status, "operation": operation},
        )


class DuplicateOrderError(OrderDomainError):
    """重複受注エラー."""

    def __init__(self, order_no: str):
        """初期化.

        Args:
            order_no: 重複した受注番号
        """
        message = f"Order already exists: {order_no}"
        super().__init__(
            message,
            code="DUPLICATE_ORDER",
            details={"order_no": order_no},
        )


class OrderValidationError(OrderDomainError):
    """受注バリデーションエラー."""

    def __init__(self, message: str, details: dict | None = None):
        """初期化.

        Args:
            message: エラーメッセージ
            details: 詳細情報
        """
        super().__init__(message, code="ORDER_VALIDATION_ERROR", details=details)


class ProductNotFoundError(OrderDomainError):
    """製品が存在しない場合のエラー."""

    def __init__(self, product_code: str):
        """初期化.

        Args:
            product_code: 見つからなかった製品コード
        """
        message = f"Product not found: {product_code}"
        super().__init__(
            message,
            code="PRODUCT_NOT_FOUND",
            details={"product_code": product_code},
        )
