# backend/app/services/orders/validation.py
"""Order validation service for inventory availability checks.

【設計意図】受注バリデーションサービスの設計判断:

1. Frozen Dataclass パターン（L17-28）
   理由: 値オブジェクト（Value Object）として設計
   → frozen=True で不変性を保証
   → slots=True でメモリ使用量を削減
   用途: OrderLineDemandは、受注明細の「需要」を表す値オブジェクト
   メリット:
   - イミュータブル → 予期しない変更を防ぐ
   - ハッシュ可能 → Dict のキーとして使用可能

2. __post_init__ によるバリデーション（L24-27）
   理由: dataclass 初期化後に実行されるバリデーション
   → quantity < 1 の場合、ValueError を raise
   → object.__setattr__ で frozen dataclass の値を変更（int型への変換）
   トレードオフ: frozen=True でも __post_init__ 内では変更可能

3. Facade パターン（validate classmethod, L46-85）
   理由: 外部から使いやすいシンプルなAPI
   → validate() は classmethod として公開
   → 内部で OrderValidationService インスタンスを生成
   メリット:
   - 呼び出し側は db セッションを渡すだけ（インスタンス化不要）
   - 内部実装（validate_lines）を隠蔽
   例: OrderValidationService.validate(db, demands)

4. InsufficientStockError のハンドリング（L72-85）
   理由: ドメインエラーを ValidationResult に変換
   → ドメイン層（domain/errors.py）からのエラーを、
      プレゼンテーション層（API）向けの形式に変換
   → error_data に詳細情報を格納（product_code, required, available）
   業務上の意味: API レスポンスで「どの製品が、何個不足しているか」を伝える

5. stock_repository の依存性注入（L42-44）
   理由: テスト時にモックを注入可能
   → デフォルトは StockRepository(db) を使用
   → テスト時は、モックリポジトリを注入してDBアクセスを回避
   メリット: 単体テストが高速化、外部依存を排除
"""

from __future__ import annotations

from collections.abc import Iterable
from dataclasses import dataclass
from datetime import date

from sqlalchemy.orm import Session

from app.domain.errors import InsufficientStockError
from app.infrastructure.persistence.repositories.stock_repository import StockRepository


@dataclass(frozen=True, slots=True)
class OrderLineDemand:
    """Value object expressing the demand of an order line."""

    product_code: str
    warehouse_code: str
    quantity: int

    def __post_init__(self) -> None:
        if self.quantity < 1:
            raise ValueError("quantity must be greater than or equal to 1")
        object.__setattr__(self, "quantity", int(self.quantity))


@dataclass(frozen=True)
class ValidationResult:
    """Result of order validation."""

    ok: bool
    message: str
    error_data: dict | None = None


class OrderValidationService:
    """Service coordinating stock validation for order requests."""

    def __init__(self, db: Session, stock_repository: StockRepository | None = None):
        self._db = db
        self._stock_repo = stock_repository or StockRepository(db)

    @classmethod
    def validate(
        cls,
        db: Session,
        demands: Iterable[OrderLineDemand],
        date: date | None = None,
    ) -> ValidationResult:
        """Validate order demands against available stock (facade method).

        Args:
            db: Database session.
            demands: Iterable of order line demands.
            date: Ship date for expiry filtering.

        Returns:
            ValidationResult with ok=True if all lines valid,
            ok=False with error details if insufficient stock.
        """
        service = cls(db)
        try:
            service.validate_lines(lines=demands, ship_date=date, lock=False)
            return ValidationResult(
                ok=True,
                message="すべての受注明細が在庫充足可能です。",
                error_data=None,
            )
        except InsufficientStockError as e:
            # Return domain error details as plain dict
            details_raw = e.details or {}

            return ValidationResult(
                ok=False,
                message=f"在庫不足: {e.product_code}",
                error_data={
                    "product_code": e.product_code,
                    "required": e.required,
                    "available": e.available,
                    "details": details_raw,
                },
            )

    def validate_lines(
        self,
        lines: Iterable[OrderLineDemand],
        ship_date: date | None = None,
        lock: bool = True,
    ) -> None:
        """Validate that all demanded lines can be fulfilled by inventory."""
        from sqlalchemy import select

        from app.infrastructure.persistence.models import Product, Warehouse

        for line in lines:
            # Resolve IDs from codes
            product_group_id = self._db.execute(
                select(Product.id).where(Product.maker_part_no == line.product_code)
            ).scalar_one_or_none()

            warehouse_id = self._db.execute(
                select(Warehouse.id).where(Warehouse.warehouse_code == line.warehouse_code)
            ).scalar_one_or_none()

            if not product_group_id or not warehouse_id:
                # If product or warehouse not found, treat as insufficient stock (or raise specific error)
                # For now, let's assume they exist or handle gracefully
                raise InsufficientStockError(
                    product_code=line.product_code,
                    required=line.quantity,
                    available=0,
                    details={"reason": "Product or Warehouse not found"},
                )

            lots = self._stock_repo.find_fifo_lots_for_allocation(
                product_group_id=product_group_id,
                warehouse_id=warehouse_id,
                ship_date=ship_date,
                for_update=lock,
            )

            remaining = line.quantity
            available_total = 0
            per_lot_details: list[dict[str, int]] = []

            for lot in lots:
                available_qty = self._stock_repo.calc_available_qty(lot)
                if available_qty <= 0:
                    continue

                available_total += available_qty
                per_lot_details.append({"lot_id": lot.id, "available": available_qty})

                remaining -= available_qty
                if remaining <= 0:
                    break

            if remaining > 0:
                raise InsufficientStockError(
                    product_code=line.product_code,
                    required=line.quantity,
                    available=available_total,
                    details={
                        "warehouse_code": line.warehouse_code,
                        "per_lot": per_lot_details,
                        "ship_date": ship_date.isoformat() if ship_date else None,
                    },
                )
