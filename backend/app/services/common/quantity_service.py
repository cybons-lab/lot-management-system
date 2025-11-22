"""Quantity conversion utilities.

高精度な外部単位→内部単位変換ロジックを提供するサービス層。
"""

from __future__ import annotations

from decimal import ROUND_HALF_UP, Decimal, getcontext
from typing import TYPE_CHECKING

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Product, ProductUomConversion

getcontext().prec = 28

if TYPE_CHECKING:  # pragma: no cover - 型チェック専用
    pass

NumberLike = Decimal | float | int | str


class QuantityConversionError(ValueError):
    """数量変換時のバリデーションエラー。."""


DEFAULT_QUANTIZE = Decimal("0.01")
DEFAULT_ROUNDING = ROUND_HALF_UP


def _to_decimal(value: NumberLike) -> Decimal:
    """安全にDecimalへ変換する。."""
    if isinstance(value, Decimal):
        return value
    try:
        return Decimal(str(value))
    except Exception as exc:  # pragma: no cover - エッジケース
        raise QuantityConversionError(f"数値変換に失敗しました: {value}") from exc


async def to_internal_qty(
    db: AsyncSession, product: Product, qty_external: NumberLike, external_unit: str
) -> Decimal:
    """指定した製品の外部単位数量を内部単位数量へ変換する。."""
    external_unit_value = str(external_unit).strip()
    internal_unit_value = str(getattr(product, "internal_unit", "")).strip()

    # 1. 単位が一致する場合はそのまま返す
    if external_unit_value == internal_unit_value:
        return _to_decimal(qty_external)

    # 2. 換算テーブルを検索
    stmt = select(ProductUomConversion).where(
        ProductUomConversion.product_id == product.id,
        ProductUomConversion.external_unit == external_unit_value,
    )
    result = await db.execute(stmt)
    conversion = result.scalar_one_or_none()

    if not conversion:
        raise QuantityConversionError(
            f"単位換算定義が見つかりません: 製品={product.product_name}, 単位={external_unit_value}"
        )

    # 3. 換算実行 (internal = external * factor)
    external_qty = _to_decimal(qty_external)
    if external_qty < 0:
        raise QuantityConversionError("数量は0以上である必要があります")

    # Convert factor to Decimal to ensure type compatibility
    factor = _to_decimal(conversion.factor)
    internal_qty = external_qty * factor

    # 4. 丸め処理 (デフォルト設定を使用)
    return internal_qty.quantize(DEFAULT_QUANTIZE, rounding=DEFAULT_ROUNDING)
