# backend/app/domain/allocation/rounding.py
"""数量丸めポリシー 既存の丸めロジックを再現し、挙動を変更しない.

【設計意図】数量丸めポリシーの設計判断:

1. なぜ丸め処理が必要なのか
   理由: 数量計算の精度制御と表示の一貫性
   業務背景:
   - 自動車部品の取引: 小数単位での取引あり
   - 例: 0.5kg, 1.234個（端数が出る部品）
   - 計算誤差: 単位換算や引当計算で小数点以下の桁が増える
   → 0.123456789... のような値を適切に丸める必要
   表示要件:
   - UI: 小数点以下2桁表示（例: 10.25kg）
   → データベースも小数点以下2桁に統一

2. なぜ Decimal を使うのか（L36）
   理由: 浮動小数点数（float）の精度問題を回避
   問題:
   - float: 0.1 + 0.2 = 0.30000000000000004
   → 丸め処理も不正確になる
   解決:
   - Decimal(str(value)): 文字列経由でDecimal化
   → 元の値を正確に保持
   例:
   ```python
   # 悪い例
   Decimal(0.1)  # Decimal('0.1000000000000000055511151231257827021181583404541015625')
   # 良い例
   Decimal(str(0.1))  # Decimal('0.1')
   ```

3. RoundingMode Enum の設計（L8-14）
   理由: 丸めルールの明示的な選択
   3つのモード:
   - CEIL: 切り上げ（例: 10.01 → 10.1）
   - FLOOR: 切り捨て（例: 10.99 → 10.9）
   - ROUND_HALF_UP: 四捨五入（例: 10.05 → 10.1, 10.04 → 10.0）
   業務用途:
   - 引当数量: ROUND_HALF_UP（一般的な丸め）
   - 在庫数量: ROUND_HALF_UP（在庫表示の標準）
   - 将来: 特定の得意先で CEIL（切り上げ）を要求される可能性
   → Enum で拡張性を確保

4. precision パラメータ（L21, L28）
   理由: 小数点以下の桁数を柔軟に制御
   デフォルト: precision=2（小数点以下2桁）
   業務要件:
   - 重量単位: kg（小数点以下2桁で十分）
   - 個数単位: 個（小数点以下2桁で端数表現）
   将来の拡張:
   - 精密部品: precision=4（より細かい単位）
   - precision パラメータで対応可能

5. quantize() メソッドの使用（L39-43）
   理由: Decimal の標準的な丸め方法
   動作:
   - Decimal(10) ** -precision: 丸め単位を計算
   → precision=2 なら 0.01
   - quantize(0.01, rounding=ROUND_HALF_UP): 0.01単位で四捨五入
   例:
   ```python
   Decimal("10.456").quantize(Decimal("0.01"), ROUND_HALF_UP)
   # → Decimal("10.46")
   ```

6. 専用メソッドの提供（L47-55）
   理由: 業務文脈を明確にする
   round_allocation_qty() (L48-50):
   - 用途: 引当数量の丸め
   - 現在: 四捨五入、小数点以下2桁
   round_stock_qty() (L53-55):
   - 用途: 在庫数量の丸め
   - 現在: 四捨五入、小数点以下2桁
   メリット:
   - 呼び出し側が意図を明示: round_allocation_qty(qty)
   → "引当数量を丸めている" ことが明確
   - 将来的に引当と在庫で丸めルールを変更可能
   → メソッド内の実装だけ変更すれば良い

7. None 値のハンドリング（L33-34）
   理由: 防御的プログラミング
   動作:
   - value が None なら 0.0 を返す
   → NoneError を防止
   業務的意義:
   - データベースで NULL になる可能性がある
   → UI で "0.00" と表示（空白よりユーザーフレンドリー）

8. float で返す理由（L45）
   理由: 既存システムとの互換性
   背景:
   - 既存コードは float を期待
   → Decimal で返すと型エラー
   設計:
   - 内部計算は Decimal（精度保証）
   - 返り値は float（互換性）
   将来的な改善:
   - 全体を Decimal に統一（理想）
   → 現時点では既存挙動を維持（"挙動を変更しない"）

9. 静的メソッド（@staticmethod, @classmethod）の使用（L19, L47）
   理由: インスタンス化不要なユーティリティクラス
   設計:
   - RoundingPolicy はインスタンス変数を持たない
   → 静的メソッドで十分
   使用例:
   ```python
   qty = RoundingPolicy.round_allocation_qty(10.456)
   # → 10.46
   ```
   メリット:
   - シンプルな呼び出し
   - メモリ効率（インスタンス生成不要）

10. "既存の丸めロジックを再現し、挙動を変更しない" の意図（L2）
    理由: リファクタリング時の安全性確保
    背景:
    - 旧コードから丸めロジックを抽出してこのクラスに集約
    - 既存の業務フローに影響を与えないことが最優先
    検証:
    - 旧コードと新コードで同じ入力→同じ出力
    → 回帰テストで検証済み
    メリット:
    - リファクタリングのリスク最小化
    - 段階的な改善が可能
"""

from decimal import ROUND_CEILING, ROUND_FLOOR, ROUND_HALF_UP, Decimal
from enum import Enum


class RoundingMode(Enum):
    """丸めモード."""

    CEIL = "CEIL"  # 切り上げ
    FLOOR = "FLOOR"  # 切り捨て
    ROUND_HALF_UP = "HALF_UP"  # 四捨五入


class RoundingPolicy:
    """数量丸めポリシー."""

    @staticmethod
    def round_quantity(
        value: float, mode: RoundingMode = RoundingMode.ROUND_HALF_UP, precision: int = 2
    ) -> float:
        """数量を指定されたモードで丸める.

        Args:
            value: 丸める値
            mode: 丸めモード
            precision: 小数点以下の桁数

        Returns:
            丸められた値
        """
        if value is None:
            return 0.0

        decimal_value = Decimal(str(value))

        if mode == RoundingMode.CEIL:
            rounded = decimal_value.quantize(Decimal(10) ** -precision, rounding=ROUND_CEILING)
        elif mode == RoundingMode.FLOOR:
            rounded = decimal_value.quantize(Decimal(10) ** -precision, rounding=ROUND_FLOOR)
        else:  # ROUND_HALF_UP
            rounded = decimal_value.quantize(Decimal(10) ** -precision, rounding=ROUND_HALF_UP)

        return float(rounded)

    @classmethod
    def round_allocation_qty(cls, qty: float) -> float:
        """引当数量の丸め（既存挙動を再現） デフォルト: 四捨五入、小数点以下2桁."""
        return cls.round_quantity(qty, RoundingMode.ROUND_HALF_UP, precision=2)

    @classmethod
    def round_stock_qty(cls, qty: float) -> float:
        """在庫数量の丸め（既存挙動を再現） デフォルト: 四捨五入、小数点以下2桁."""
        return cls.round_quantity(qty, RoundingMode.ROUND_HALF_UP, precision=2)
