"""Domain-level shared exception definitions."""

from __future__ import annotations


class DomainError(Exception):
    """Base exception for all domain-specific errors."""

    default_code = "DOMAIN_ERROR"

    def __init__(
        self,
        message: str,
        code: str | None = None,
        details: dict | None = None,
    ):
        """ドメインエラーの初期化.

        Args:
            message: エラーメッセージ
            code: エラーコード（省略時はdefault_codeを使用）
            details: 詳細情報（任意のメタデータ）
        """
        self.message = message
        self.code = code or self.default_code
        self.details = details or {}
        super().__init__(self.message)


class InsufficientStockError(DomainError):
    """在庫不足エラー（統合版）.

    Attributes:
        lot_id: 在庫不足のロットID（オプショナル）
        lot_number: 表示用ロット番号（オプショナル）
        product_code: 製品コード（オプショナル）
        required: 必要数量
        available: 利用可能数量
    """

    default_code = "INSUFFICIENT_STOCK"

    def __init__(
        self,
        required: float,
        available: float,
        *,
        lot_id: int | None = None,
        lot_number: str | None = None,
        product_code: str | None = None,
        details: dict | None = None,
    ):
        self.lot_id = lot_id
        self.lot_number = lot_number
        self.product_code = product_code
        self.required = required
        self.available = available

        if lot_number:
            message = (
                f"ロット {self.lot_number} の在庫が不足しています "
                f"(必要: {self.required}, 利用可能: {self.available})"
            )
        elif product_code:
            message = (
                f"製品 {self.product_code} の在庫が不足しています "
                f"(必要: {self.required}, 利用可能: {self.available})"
            )
        else:
            message = f"在庫が不足しています (必要: {self.required}, 利用可能: {self.available})"

        error_details: dict = details.copy() if details else {}
        if lot_id:
            error_details["lot_id"] = lot_id
        if lot_number:
            error_details["lot_number"] = lot_number
        if product_code:
            error_details["product_code"] = product_code
        error_details["required"] = required
        error_details["available"] = available

        super().__init__(
            message,
            code=self.default_code,
            details=error_details,
        )
