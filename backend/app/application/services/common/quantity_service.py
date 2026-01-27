"""Quantity conversion utilities.

高精度な外部単位→内部単位変換ロジックを提供するサービス層。

【設計意図】単位換算サービスの設計判断:

1. なぜ Decimal型 を使うのか
   理由: 浮動小数点数（float）の精度問題を回避
   問題:
   - float は二進数で表現されるため、十進数の 0.1 を正確に表現できない
   - 例: 0.1 + 0.2 = 0.30000000000000004（期待: 0.3）
   - 在庫数や金額計算で誤差が蓄積すると、数円〜数十円のズレが発生
   解決:
   - Decimal: 十進数を正確に表現（任意精度演算）
   - 金融・会計システムの標準手法
   業務影響:
   - 自動車部品の単価: 数百円〜数万円
   - 数量: 小数点以下3桁（例: 1.234kg）
   → 精度が重要（顧客請求額に影響）

2. getcontext().prec = 28 の意味（L17）
   理由: 十分な精度を確保しつつ、パフォーマンスも考慮
   精度28桁の根拠:
   - Python Decimal のデフォルト精度: 28桁
   - 業務要件: 最大15桁（数量: 12桁 + 小数点: 3桁）程度
   → 28桁で十分すぎるほどカバー
   代替案:
   - prec = 10: 精度不足のリスク（大量計算で誤差蓄積）
   - prec = 100: 過剰な精度（計算速度低下）
   → 28 がバランス良い

3. _to_decimal() のエラーハンドリング（L33-40）
   理由: 不正な値を安全に検出して変換
   変換プロセス:
   - Decimal → そのまま返す（変換不要）
   - int, float, str → str() 経由で Decimal に変換
   str() を経由する理由:
   - Decimal(0.1) → 誤差を含む（0.1000000000000000055...）
   - Decimal("0.1") → 正確（0.1）
   → 必ず str() を経由することで精度を保証
   エラー処理:
   - 変換失敗時に QuantityConversionError を送出
   → "abc" など、数値でない文字列を明示的に拒否

4. to_internal_qty() の4ステップ処理（L43-77）
   理由: 段階的な変換で安全性と可読性を確保
   ステップ1（L51-52）: 単位一致チェック
   - 外部単位 = 内部単位 → 変換不要、そのまま返す
   - 例: 内部単位=KG, 外部単位=KG → 変換なし
   ステップ2（L55-65）: 換算テーブル検索
   - ProductUomConversion テーブルから換算係数を取得
   - 例: 製品P-001, 外部単位=CAN → factor=5.0 が登録
   ステップ3（L68-74）: 換算計算
   - internal_qty = external_qty * factor
   - 例: 10 CAN * 5.0 = 50 KG
   ステップ4（L77）: 丸め処理
   - quantize(DEFAULT_QUANTIZE, rounding=DEFAULT_ROUNDING)
   → 小数点以下2桁に丸める（0.01単位）

5. 換算テーブルが見つからない場合のエラー（L62-65）
   理由: 不正な変換を即座に検出
   業務シナリオ:
   - 新製品追加時に換算テーブル登録を忘れた
   - OCR で誤った単位が読み取られた
   → 早期にエラーを出して、データ不整合を防ぐ
   エラーメッセージ:
   - 製品名と単位を含めることで、どのデータを登録すべきか明確

6. 負数チェック（L69-70）
   理由: 業務的に無効な数量を拒否
   在庫管理の原則:
   - 数量は必ず 0 以上（負数は意味がない）
   - 出庫: 在庫から引く処理（正数を引く）
   - 返品: 別のトランザクションで管理
   → 換算時点で負数を検出してエラー

7. DEFAULT_QUANTIZE = Decimal("0.01") の意味（L29）
   理由: 小数点以下2桁に丸める
   業務要件:
   - 金額: 円単位（小数点不要）だが、換算後は小数点が出る
   - 数量: 通常3桁だが、換算後は不規則な桁数になる
   → 0.01 単位に丸めることで、表示を統一
   丸めルール:
   - ROUND_HALF_UP: 四捨五入（0.5 → 1）
   → 日本の商習慣に準拠

8. async/await の使用理由（L43）
   理由: データベースアクセスの非同期化
   動作:
   - ProductUomConversion テーブルのクエリが非同期
   → 他のリクエストをブロックしない
   メリット:
   - 高並行性（同時アクセス数が多い環境で有利）
   - アプリケーション全体が非同期（FastAPI）に統一

9. TYPE_CHECKING の使用（L19-20）
   理由: 型チェック専用のインポートを分離
   動作:
   - 実行時: TYPE_CHECKING = False → インポートされない
   - 型チェック時: TYPE_CHECKING = True → mypy が解析
   メリット:
   - 循環インポートの回避
   - 実行時のインポートコスト削減
"""

from __future__ import annotations

from decimal import ROUND_HALF_UP, Decimal, getcontext
from typing import TYPE_CHECKING

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.persistence.models import Product, ProductUomConversion


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
        ProductUomConversion.product_group_id == product.id,
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
