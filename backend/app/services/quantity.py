"""Quantity conversion utilities.

高精度な外部単位→内部単位変換ロジックを提供するサービス層。"""

from __future__ import annotations

from decimal import Decimal, ROUND_HALF_UP, ROUND_UP, getcontext
from typing import TYPE_CHECKING, Union

getcontext().prec = 28

if TYPE_CHECKING:  # pragma: no cover - 型チェック専用
    from app.models import Product

NumberLike = Union[Decimal, float, int, str]


class QuantityConversionError(ValueError):
    """数量変換時のバリデーションエラー。"""


# 将来的には製品ごとの換算テーブルを参照する想定。
# その場合は下記のROUNDING_RULESやデフォルト設定を差し替えるフックを用意する。
ROUNDING_RULES: dict[str, tuple[Decimal, str]] = {
    "箱": (Decimal("1"), ROUND_UP),
    "缶": (Decimal("1"), ROUND_UP),
    "EA": (Decimal("0.01"), ROUND_HALF_UP),
}
DEFAULT_QUANTIZE = Decimal("0.01")
DEFAULT_ROUNDING = ROUND_HALF_UP


def _to_decimal(value: NumberLike) -> Decimal:
    """安全にDecimalへ変換する。"""

    if isinstance(value, Decimal):
        return value
    try:
        return Decimal(str(value))
    except Exception as exc:  # pragma: no cover - エッジケース
        raise QuantityConversionError(f"数値変換に失敗しました: {value}") from exc


def to_internal_qty(product: "Product", qty_external: NumberLike, external_unit: str) -> Decimal:
    """指定した製品の外部単位数量を内部単位数量へ変換する。"""

    if not getattr(product, "packaging_unit", None):
        raise QuantityConversionError("製品に包装単位が設定されていません")

    if not getattr(product, "packaging_qty", None):
        raise QuantityConversionError("製品に包装数量が設定されていません")

    product_packaging_unit = str(product.packaging_unit).strip()
    external_unit_value = str(external_unit).strip()

    if product_packaging_unit != external_unit_value:
        raise QuantityConversionError(
            f"外部単位が一致しません: 期待値 {product_packaging_unit}, 入力値 {external_unit_value}"
        )

    packaging_qty = _to_decimal(product.packaging_qty)
    if packaging_qty <= 0:
        raise QuantityConversionError("包装数量は正の値である必要があります")

    external_qty = _to_decimal(qty_external)
    if external_qty < 0:
        raise QuantityConversionError("数量は0以上である必要があります")
    internal_qty = external_qty / packaging_qty

    rounding_rule = ROUNDING_RULES.get(external_unit_value) or ROUNDING_RULES.get(
        external_unit_value.upper()
    )
    if not rounding_rule:
        internal_unit_value = str(getattr(product, "internal_unit", "")).strip()
        rounding_rule = ROUNDING_RULES.get(internal_unit_value) or ROUNDING_RULES.get(
            internal_unit_value.upper()
        )

    quantize_target, rounding_mode = (
        rounding_rule if rounding_rule else (DEFAULT_QUANTIZE, DEFAULT_ROUNDING)
    )

    # Decimal.quantizeにより丸めを適用。量子化単位は設定で調整可能。
    return internal_qty.quantize(quantize_target, rounding=rounding_mode)
