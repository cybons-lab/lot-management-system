"""
Forecast Domain Layer
フォーキャストマッチングロジック、需要予測ルール.

【設計意図】フォーキャストドメインの設計判断:

1. なぜフォーキャストドメイン層が必要なのか
   理由: 需要予測と受注のマッチングロジックを明確化
   業務背景:
   - 自動車部品商社では、得意先から事前に需要予測（フォーキャスト）を受領
   - 実際の受注と予測を照合し、計画との乖離を分析
   → ビジネスロジックをドメイン層に集約

2. ForecastDomainError 階層の設計（L12-33）
   理由: フォーキャスト固有のエラーを明確に分類
   階層:
   - DomainError（基底）
   → ForecastDomainError（フォーキャストドメイン全体）
     → ForecastNotFoundError（フォーキャスト不在）
     → InvalidForecastError（不正なフォーキャスト）
   メリット:
   - 呼び出し側でエラーの種類を特定可能
   - HTTPステータスコードへのマッピングが明確

3. ForecastNotFoundError の設計（L21-26）
   理由: 製品・月でフォーキャストが見つからない場合のエラー
   パラメータ:
   - product_code: 製品コード（例: "P-001"）
   - month: 月（例: "2024-11"）
   使用例:
   ```python
   forecast = get_forecast("P-001", "2024-11")
   if not forecast:
       raise ForecastNotFoundError("P-001", "2024-11")
   ```
   エラーコード: "FORECAST_NOT_FOUND"
   HTTPマッピング: 404 Not Found

4. InvalidForecastError の設計（L29-33）
   理由: フォーキャストのビジネスルール違反を表現
   用途:
   - 負の予測数量（L106-107）
   - 不正な日付範囲
   - 必須フィールドの欠如
   エラーコード: "INVALID_FORECAST"
   HTTPマッピング: 400 Bad Request

5. ForecastMatch dataclass の設計（L36-49）
   理由: マッチング結果を構造化
   フィールド:
   - forecast_id: フォーキャストID
   - customer_id: 得意先ID
   - delivery_place_id: 納入場所ID
   - supplier_item_id: 製品ID
   - forecast_date: フォーキャスト日付（v2.4で追加）
   - forecast_quantity: 予測数量
   - match_confidence: マッチング信頼度（0.0-1.0）
   v2.4での変更:
   - granularity（粒度）廃止 → forecast_date で直接日付マッチング
   → シンプルで明確な設計

6. ForecastDomainService の設計（L52-91）
   理由: フォーキャストマッチングロジックの集約
   静的メソッド:
   - calculate_date_key(): 日付キー生成
   - calculate_match_confidence(): マッチング信頼度計算
   設計パターン: Domain Service パターン
   → ビジネスロジックを明示的に表現

7. calculate_date_key() の設計（L56-65）
   理由: 日付を統一フォーマットのキーに変換
   フォーマット: "YYYY-MM-DD"（例: "2024-11-19"）
   業務的意義:
   - データベース検索のキー
   - キャッシュのキー
   - ログ記録の統一フォーマット

8. calculate_match_confidence() の設計（L68-90）
   理由: 受注日と予測日のマッチング度を定量化
   信頼度計算ロジック:
   - 完全一致（同日）: 1.0
   - 3日以内: 0.9
   - 1週間以内: 0.7
   - 1ヶ月以内: 0.5
   - それ以上: 0.2
   業務的意義:
   - 予測精度の評価指標
   - 高信頼度マッチングのフィルタリング
   - 計画との乖離分析
   使用例:
   ```python
   confidence = ForecastDomainService.calculate_match_confidence(
       order_date=date(2024, 11, 19), forecast_date=date(2024, 11, 20)
   )
   # → 0.9（3日以内）
   ```

9. ForecastValidator の設計（L93-108）
   理由: フォーキャストのバリデーションルールを集約
   静的メソッド:
   - validate_forecast_quantity(): 数量検証
   設計パターン: Validator パターン
   → 入力検証を明示的に表現

10. validate_forecast_quantity() の設計（L97-107）
    理由: 負の予測数量を防止
    ビジネスルール:
    - 需要予測は0以上の数量
    - 負数は業務的に意味がない（需要マイナスは存在しない）
    例外:
    - ゼロは許容（需要ゼロの予測も有効）
    使用例:
    ```python
    ForecastValidator.validate_forecast_quantity(100.0)  # OK
    ForecastValidator.validate_forecast_quantity(-10.0)  # NG → InvalidForecastError
    ForecastValidator.validate_forecast_quantity(0.0)  # OK
    ```
"""

from dataclasses import dataclass
from datetime import date

from app.domain.errors import DomainError


class ForecastDomainError(DomainError):
    """フォーキャストドメイン層の基底例外."""

    default_code = "FORECAST_ERROR"

    def __init__(self, message: str, code: str | None = None):
        super().__init__(message, code=code or self.default_code)


class ForecastNotFoundError(ForecastDomainError):
    """フォーキャスト不在エラー."""

    def __init__(self, product_code: str, month: str):
        message = f"Forecast not found: {product_code} for {month}"
        super().__init__(message, code="FORECAST_NOT_FOUND")


class InvalidForecastError(ForecastDomainError):
    """不正なフォーキャストエラー."""

    def __init__(self, message: str):
        super().__init__(message, code="INVALID_FORECAST")


@dataclass
class ForecastMatch:
    """フォーキャストマッチング結果 (v2.4 schema).

    v2.4では粒度(granularity)は廃止され、forecast_dateで直接日付マッチングを行う。
    """

    forecast_id: int
    customer_id: int
    delivery_place_id: int
    supplier_item_id: int
    forecast_date: date
    forecast_quantity: float
    match_confidence: float  # 0.0 ~ 1.0


class ForecastDomainService:
    """フォーキャストマッチングロジック (v2.4 schema)."""

    @staticmethod
    def calculate_date_key(target_date: date) -> str:
        """日付からキーを生成.

        Args:
            target_date: 対象日付

        Returns:
            日付キー（例: "2024-11-19"）
        """
        return target_date.strftime("%Y-%m-%d")

    @staticmethod
    def calculate_match_confidence(order_date: date, forecast_date: date) -> float:
        """マッチングの信頼度を計算.

        Args:
            order_date: 受注日
            forecast_date: フォーキャスト日

        Returns:
            信頼度（0.0 ~ 1.0）
        """
        if order_date == forecast_date:
            return 1.0  # 完全一致

        # 日数差に基づく信頼度計算
        diff_days = abs((order_date - forecast_date).days)
        if diff_days <= 3:
            return 0.9  # 3日以内
        if diff_days <= 7:
            return 0.7  # 1週間以内
        if diff_days <= 30:
            return 0.5  # 1ヶ月以内
        return 0.2  # それ以上


class ForecastValidator:
    """フォーキャストバリデーター."""

    @staticmethod
    def validate_forecast_quantity(quantity: float) -> None:
        """フォーキャスト数量のバリデーション.

        Args:
            quantity: 数量

        Raises:
            InvalidForecastError: 負の数量の場合
        """
        if quantity < 0:
            raise InvalidForecastError(f"Forecast quantity cannot be negative: {quantity}")


__all__ = [
    "ForecastDomainError",
    "ForecastDomainService",
    "ForecastMatch",
    "ForecastNotFoundError",
    "ForecastValidator",
    "InvalidForecastError",
]
