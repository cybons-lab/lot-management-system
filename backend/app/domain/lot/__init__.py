# backend/app/domain/lot/__init__.py
"""
Lot Domain Layer
FEFOロジック、在庫チェック、ロット状態管理.
"""

from dataclasses import dataclass
from datetime import date

from app.domain.errors import DomainError


# ===== 例外定義 =====
class LotDomainError(DomainError):
    """ロットドメイン層の基底例外."""

    default_code = "LOT_ERROR"

    def __init__(self, message: str, code: str | None = None):
        super().__init__(message, code=code or self.default_code)


class LotNotFoundError(LotDomainError):
    """ロット不在エラー."""

    def __init__(self, lot_id: int):
        message = f"ロットが見つかりません: ID={lot_id}"
        super().__init__(message, code="LOT_NOT_FOUND")


class InsufficientLotStockError(LotDomainError):
    """ロット在庫不足エラー."""

    def __init__(self, lot_id: int, required: float, available: float):
        message = f"在庫不足: ロット={lot_id}, 必要数量={required}, 利用可能={available}"
        super().__init__(message, code="INSUFFICIENT_LOT_STOCK")


class ExpiredLotError(LotDomainError):
    """期限切れロットエラー."""

    def __init__(self, lot_id: int, expiry_date: date):
        message = f"ロット {lot_id} は期限切れです: {expiry_date}"
        super().__init__(message, code="EXPIRED_LOT")


class LotValidationError(LotDomainError):
    """ロット関連のバリデーションエラー."""

    def __init__(self, message: str):
        super().__init__(message, code="LOT_VALIDATION_ERROR")


class LotProductNotFoundError(LotDomainError):
    """ロット作成時に製品が見つからないエラー."""

    def __init__(self, product_id: int):
        message = f"製品が見つかりません: ID={product_id}"
        super().__init__(message, code="PRODUCT_NOT_FOUND")


class LotSupplierNotFoundError(LotDomainError):
    """ロット作成時に仕入先が見つからないエラー."""

    def __init__(self, supplier_code: str):
        message = f"仕入先が見つかりません: コード={supplier_code}"
        super().__init__(message, code="SUPPLIER_NOT_FOUND")


class LotWarehouseNotFoundError(LotDomainError):
    """ロット作成時に倉庫が見つからないエラー."""

    def __init__(self, identifier: str | int):
        message = f"倉庫が見つかりません: {identifier}"
        super().__init__(message, code="WAREHOUSE_NOT_FOUND")


class LotDatabaseError(LotDomainError):
    """ロット関連のデータベースエラー."""

    def __init__(self, operation: str, original_error: Exception | None = None):
        message = f"データベースエラー: {operation}"
        if original_error:
            message += f" ({original_error!s})"
        super().__init__(message, code="LOT_DATABASE_ERROR")


# ===== FEFOロジック =====
@dataclass
class LotCandidate:
    """FEFO用のロット候補."""

    lot_id: int
    lot_code: str
    lot_number: str | None
    product_code: str
    warehouse_code: str
    available_qty: float
    expiry_date: date | None
    receipt_date: date | None

    def is_expired(self, reference_date: date | None = None) -> bool:
        """期限切れかチェック."""
        if not self.expiry_date:
            return False
        ref = reference_date or date.today()
        return self.expiry_date < ref


class FefoPolicy:
    """
    FEFO（先入先出）ポリシー
    有効期限が近いロットから優先的に割り当て.
    """

    @staticmethod
    def sort_lots_by_fefo(lots: list[LotCandidate]) -> list[LotCandidate]:
        """
        ロットをFEFO順にソート.

        優先順位:
        1. 有効期限が近いもの（expiryDateの昇順）
        2. 有効期限がないものは後回し
        3. 同じ有効期限の場合は、入荷日が古いもの（receiptDateの昇順）

        Args:
            lots: ロット候補のリスト

        Returns:
            ソート済みロットのリスト
        """

        def fefo_key(lot: LotCandidate):
            # 有効期限がないものは後回し
            if lot.expiry_date is None:
                expiry_sort = date.max
            else:
                expiry_sort = lot.expiry_date

            # 入荷日がないものは後回し
            if lot.receipt_date is None:
                receipt_sort = date.max
            else:
                receipt_sort = lot.receipt_date

            return (expiry_sort, receipt_sort)

        return sorted(lots, key=fefo_key)

    @staticmethod
    def filter_expired_lots(
        lots: list[LotCandidate], reference_date: date | None = None
    ) -> tuple[list[LotCandidate], list[LotCandidate]]:
        """
        期限切れロットを除外.

        Args:
            lots: ロット候補のリスト
            reference_date: 基準日（デフォルト: 今日）

        Returns:
            (有効なロット, 期限切れロット)のタプル
        """
        ref = reference_date or date.today()
        valid_lots = []
        expired_lots = []

        for lot in lots:
            if lot.is_expired(ref):
                expired_lots.append(lot)
            else:
                valid_lots.append(lot)

        return valid_lots, expired_lots


# ===== 在庫チェック =====
class StockValidator:
    """在庫バリデーター."""

    @staticmethod
    def validate_sufficient_stock(lot_id: int, required_qty: float, available_qty: float) -> None:
        """
        十分な在庫があるかチェック.

        Args:
            lot_id: ロットID
            required_qty: 必要数量
            available_qty: 利用可能数量

        Raises:
            InsufficientLotStockError: 在庫不足の場合
        """
        if available_qty < required_qty:
            raise InsufficientLotStockError(lot_id, required_qty, available_qty)

    @staticmethod
    def validate_not_expired(
        lot_id: int, expiry_date: date | None, reference_date: date | None = None
    ) -> None:
        """
        期限切れでないかチェック.

        Args:
            lot_id: ロットID
            expiry_date: 有効期限
            reference_date: 基準日（デフォルト: 今日）

        Raises:
            ExpiredLotError: 期限切れの場合
        """
        if expiry_date:
            ref = reference_date or date.today()
            if expiry_date < ref:
                raise ExpiredLotError(lot_id, expiry_date)


__all__ = [
    # Exceptions
    "LotDomainError",
    "LotNotFoundError",
    "InsufficientLotStockError",
    "ExpiredLotError",
    "LotValidationError",
    "LotProductNotFoundError",
    "LotSupplierNotFoundError",
    "LotWarehouseNotFoundError",
    "LotDatabaseError",
    # FEFO
    "LotCandidate",
    "FefoPolicy",
    # Validation
    "StockValidator",
]
