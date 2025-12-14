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
        lot_id: 在庫不足のロットID
        lot_number: 表示用ロット番号
        required: 必要数量
        available: 利用可能数量
    """

    default_code = "INSUFFICIENT_STOCK"

    def __init__(
        self,
        lot_id: int,
        lot_number: str,
        required: float,
        available: float,
    ):
        self.lot_id = lot_id
        self.lot_number = lot_number
        self.required = required
        self.available = available
        message = (
            f"ロット {self.lot_number} の在庫が不足しています "
            f"(必要: {self.required}, 利用可能: {self.available})"
        )
        super().__init__(
            message,
            code=self.default_code,
            details={
                "lot_id": lot_id,
                "lot_number": lot_number,
                "required": required,
                "available": available,
            },
        )
