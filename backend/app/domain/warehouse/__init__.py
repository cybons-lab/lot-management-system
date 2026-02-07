"""Warehouse Domain Layer 倉庫配分ロジック、倉庫間移動ルール.

【設計意図】倉庫ドメインの設計判断:

1. なぜ倉庫ドメイン層を独立させるのか
   理由: 倉庫配分ロジックをビジネスルールとして明示化
   業務背景:
   - 自動車部品商社は複数の倉庫を運営（関東倉庫、中部倉庫等）
   - 受注に対して、どの倉庫から出荷するかを決定する必要がある
   → ロジックをドメイン層に集約し、サービス層から独立

2. WarehouseDomainError 階層の設計（L8-30）
   理由: 倉庫固有のエラーを明確に分類
   階層:
   - DomainError（基底）
   → WarehouseDomainError（倉庫ドメイン全体）
     → WarehouseNotFoundError（倉庫不在）
     → InvalidAllocationError（不正な配分）
   メリット:
   - 呼び出し側でエラーの種類を特定可能
   - HTTPステータスコードへのマッピングが明確

3. WarehouseNotFoundError の設計（L17-22）
   理由: 倉庫コードで倉庫を検索できなかった場合のエラー
   使用例:
   ```python
   warehouse = get_warehouse("TKY-01")
   if not warehouse:
       raise WarehouseNotFoundError("TKY-01")
   ```
   エラーコード: "WAREHOUSE_NOT_FOUND"
   HTTPマッピング: 404 Not Found

4. InvalidAllocationError の設計（L25-29）
   理由: 倉庫配分のビジネスルール違反を表現
   用途:
   - 配分合計が受注数量と一致しない
   - 負の配分数量が指定された
   - 存在しない倉庫への配分
   エラーコード: "INVALID_ALLOCATION"
   HTTPマッピング: 400 Bad Request

5. WarehouseAllocation dataclass の設計（L32-39）
   理由: 倉庫配分結果を構造化
   フィールド:
   - warehouse_code: 倉庫コード（例: "TKY-01"）
   - warehouse_name: 倉庫名（例: "東京倉庫"）
   - quantity: 配分数量
   - lot_id: ロットID（オプショナル、特定ロットからの出荷時）
   業務的意義:
   - 受注100個 → 東京倉庫60個、大阪倉庫40個
   → [WarehouseAllocation("TKY-01", "東京倉庫", 60), ...]

6. AllocationPolicy クラスの設計（L42-78）
   理由: 配分のバリデーションルールを集約
   静的メソッド:
   - validate_total_quantity(): 合計数量チェック
   - validate_positive_quantities(): 正数チェック
   設計パターン: Policy パターン
   → ビジネスルールを明示的に表現

7. validate_total_quantity() の設計（L46-62）
   理由: 配分合計と要求数量の一致を検証
   ビジネスルール:
   - 受注100個に対して、配分合計も100個である必要がある
   - 誤差許容: ±0.01（浮動小数点誤差を考慮）
   使用例:
   ```python
   allocations = [
       WarehouseAllocation("TKY-01", "東京", 60),
       WarehouseAllocation("OSK-01", "大阪", 40),
   ]
   AllocationPolicy.validate_total_quantity(allocations, 100.0)
   # 合計100.0 → OK
   ```

8. validate_positive_quantities() の設計（L65-78）
   理由: 負数や0の配分を防止
   ビジネスルール:
   - 倉庫への配分数量は必ず正の数
   - ゼロ配分は無意味（配分しないなら除外すべき）
   使用例:
   ```python
   allocations = [
       WarehouseAllocation("TKY-01", "東京", -10),  # NG
   ]
   AllocationPolicy.validate_positive_quantities(allocations)
   # → InvalidAllocationError
   ```

9. なぜ @staticmethod を使うのか
   理由: 状態を持たないユーティリティメソッド
   メリット:
   - インスタンス化不要で呼び出し可能
   ```python
   AllocationPolicy.validate_total_quantity(...)
   # インスタンス化不要
   ```
   - テストが容易（副作用なし）
   - 関数的プログラミングの原則に準拠

10. 浮動小数点誤差の考慮（L59）
    理由: float 型の計算誤差を許容
    問題:
    - 60.0 + 40.0 = 100.00000000001（誤差）
    → 厳密な == 比較では失敗
    解決:
    - abs(total - required_quantity) > 0.01
    → 0.01以下の誤差は許容
    業務影響:
    - 数量は通常、小数点2桁まで（例: 100.50個）
    → 0.01の許容範囲で十分
"""

from dataclasses import dataclass

from app.domain.errors import DomainError


class WarehouseDomainError(DomainError):
    """倉庫ドメイン層の基底例外."""

    default_code = "WAREHOUSE_ERROR"

    def __init__(self, message: str, code: str | None = None):
        super().__init__(message, code=code or self.default_code)


class WarehouseNotFoundError(WarehouseDomainError):
    """倉庫不在エラー."""

    def __init__(self, warehouse_code: str):
        message = f"Warehouse not found: {warehouse_code}"
        super().__init__(message, code="WAREHOUSE_NOT_FOUND")


class InvalidAllocationError(WarehouseDomainError):
    """不正な配分エラー."""

    def __init__(self, message: str):
        super().__init__(message, code="INVALID_ALLOCATION")


@dataclass
class WarehouseAllocation:
    """倉庫配分."""

    warehouse_code: str
    warehouse_name: str
    quantity: float
    lot_id: int | None = None


class AllocationPolicy:
    """倉庫配分ポリシー."""

    @staticmethod
    def validate_total_quantity(
        allocations: list[WarehouseAllocation], required_quantity: float
    ) -> None:
        """配分合計が要求数量と一致するかチェック.

        Args:
            allocations: 倉庫配分のリスト
            required_quantity: 要求数量

        Raises:
            InvalidAllocationError: 合計が一致しない場合
        """
        total = sum(alloc.quantity for alloc in allocations)
        if abs(total - required_quantity) > 0.01:  # 浮動小数点誤差を考慮
            raise InvalidAllocationError(
                f"Allocation total {total} does not match required {required_quantity}"
            )

    @staticmethod
    def validate_positive_quantities(allocations: list[WarehouseAllocation]) -> None:
        """すべての配分数量が正であるかチェック.

        Args:
            allocations: 倉庫配分のリスト

        Raises:
            InvalidAllocationError: 負または0の数量がある場合
        """
        for alloc in allocations:
            if alloc.quantity <= 0:
                raise InvalidAllocationError(
                    f"Allocation quantity must be positive: {alloc.warehouse_code}={alloc.quantity}"
                )


__all__ = [
    "AllocationPolicy",
    "InvalidAllocationError",
    "WarehouseAllocation",
    "WarehouseDomainError",
    "WarehouseNotFoundError",
]
