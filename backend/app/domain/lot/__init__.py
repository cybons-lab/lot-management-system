# backend/app/domain/lot/__init__.py
"""Lot Domain Layer FEFOロジック、在庫チェック、ロット状態管理.

【設計意図】ロットドメイン層の設計判断:

1. なぜドメイン層にFEFOロジックを配置するのか
   理由: FEFOはビジネスルールの中核
   設計原則（DDD）:
   - ドメイン層: ビジネスルールの実装（FEFO、在庫チェック等）
   - アプリケーション層: ユースケースのオーケストレーション
   - インフラ層: データベースアクセス
   メリット:
   - ビジネスルールがドメイン層に集約される
   - テストが容易（DB不要でFEFOロジックをテスト可能）
   - ルール変更時の影響範囲が明確

2. LotCandidate dataclass の設計（L86-105）
   理由: 引当候補ロットのデータ構造を定義
   フィールド:
   - lot_id, lot_code, lot_number: ロット識別子
   - product_code, warehouse_code: 製品・倉庫識別子
   - available_qty: 引当可能数量
   - expiry_date: 有効期限（FEFO判定に使用）
   - receipt_date: 入荷日（同一期限時のソート用）
   is_expired() メソッド（L99-104）:
   - 用途: 期限切れ判定
   - reference_date: デフォルトは今日、将来日付も指定可能
   → 出荷予定日時点での期限切れを予測可能

3. FefoPolicy クラスの設計（L107-167）
   理由: FEFO（First Expiry First Out）ロジックの実装
   静的メソッドの採用:
   - sort_lots_by_fefo(): ロットをFEFO順にソート
   - filter_expired_lots(): 期限切れを除外
   → インスタンス化不要、純粋な関数として使用
   業務的意義:
   - 自動車部品の期限管理（ゴム部品、樹脂部品等）
   - 期限切れ廃棄を最小化

4. sort_lots_by_fefo() の優先順位（L111-141）
   理由: 複数の条件でソート順を決定
   ソート基準:
   1. 有効期限が近いもの（expiry_date 昇順）
   2. 有効期限なしは最後（date.max）
   3. 同一期限なら入荷日が古いもの（receipt_date 昇順）
   4. 入荷日なしは最後（date.max）
   業務例:
   - ロットA: 期限2025-01-15、入荷2024-12-01
   - ロットB: 期限2025-01-15、入荷2024-12-05
   - ロットC: 期限なし
   → ソート順: A → B → C

5. filter_expired_lots() の設計（L143-167）
   理由: 期限切れロットを明示的に分離
   戻り値:
   - (有効なロット, 期限切れロット)のタプル
   → 両方のリストを返すことで、除外理由を追跡可能
   用途:
   - 有効なロット: 引当処理に使用
   - 期限切れロット: ログ出力、監査用

6. StockValidator クラスの設計（L170-206）
   理由: 在庫バリデーションロジックの集約
   validate_sufficient_stock（L173-186）:
   - 用途: 在庫不足チェック
   - 例外: InsufficientLotStockError（在庫不足時）
   validate_not_expired（L188-205）:
   - 用途: 期限切れチェック
   - 例外: ExpiredLotError（期限切れ時）
   メリット:
   - バリデーションロジックが一箇所に集約
   - 例外処理が統一される

7. ドメイン例外の階層（L10-83）
   理由: エラーの種類を明確に分類
   基底クラス: LotDomainError
   具体的なエラー:
   - LotNotFoundError: ロットが存在しない
   - InsufficientLotStockError: 在庫不足
   - ExpiredLotError: 期限切れ
   - LotValidationError: 汎用バリデーションエラー
   - LotProductNotFoundError: 製品マスタが存在しない
   - LotSupplierNotFoundError: 仕入先マスタが存在しない
   - LotWarehouseNotFoundError: 倉庫マスタが存在しない
   - LotDatabaseError: データベースエラー
   メリット:
   - 呼び出し側でエラーの種類を特定可能
   - エラーハンドリングが明確

8. なぜ静的メソッドなのか（L110, L173, L188）
   理由: 状態を持たないユーティリティクラス
   設計:
   - FefoPolicy, StockValidator はインスタンス変数を持たない
   → 静的メソッドで十分
   使用例:
   ```python
   sorted_lots = FefoPolicy.sort_lots_by_fefo(candidates)
   StockValidator.validate_sufficient_stock(lot_id, 100, 50)
   ```
   メリット:
   - シンプルな呼び出し
   - メモリ効率（インスタンス生成不要）

9. __all__ によるエクスポート管理（L208-224）
   理由: モジュールの公開APIを明確化
   効果:
   - from app.domain.lot import * で何がインポートされるか明確
   - IDE補完で不要な内部実装が表示されない
   カテゴリ:
   - Exceptions: 例外クラス
   - FEFO: FEFOロジック
   - Validation: バリデーター

10. reference_date パラメータの設計（L99, L145, L190）
    理由: 過去・未来の時点での期限チェックに対応
    用途:
    - reference_date=None: 今日時点でチェック（デフォルト）
    - reference_date=出荷予定日: 将来時点での期限切れを予測
    業務シナリオ:
    - 今日: 2024-12-01
    - ロット期限: 2024-12-10
    - 出荷予定日: 2024-12-15
    → reference_date=2024-12-15 でチェック
    → "出荷時点で期限切れ" と判定される
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
    """FEFO（先入先出）ポリシー 有効期限が近いロットから優先的に割り当て."""

    @staticmethod
    def sort_lots_by_fefo(lots: list[LotCandidate]) -> list[LotCandidate]:
        """ロットをFEFO順にソート.

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
        """期限切れロットを除外.

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
        """十分な在庫があるかチェック.

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
        """期限切れでないかチェック.

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
