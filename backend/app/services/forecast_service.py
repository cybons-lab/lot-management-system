# backend/app/services/forecast.py
"""
フォーキャストマッチングサービス
受注明細とフォーキャストデータを照合・紐付けするロジック.
"""

from datetime import date

from sqlalchemy import Select, select
from sqlalchemy.orm import Session

from app.models import Customer, Forecast, OrderLine, Product


class ForecastMatcher:
    """フォーキャストと受注明細のマッチングロジック."""

    def __init__(self, db: Session):
        self.db = db

    def match_order_line(
        self,
        order_line: OrderLine,
        product_code: str,
        customer_code: str,
        order_date: date,
    ) -> dict | None:
        """
        受注明細に対応するフォーキャストを検索し、マッチング結果を返す.

        Args:
            order_line: 受注明細オブジェクト
            product_code: 製品コード
            customer_code: 得意先コード
            order_date: 受注日

        Returns:
            マッチング結果の辞書、またはNone
            {
                "forecast_id": int,
                "granularity": "daily" | "dekad" | "monthly",
                "match_status": "EXACT" | "PERIOD" | "DIFF" | "NONE",
                "forecast_qty": float,
                "version_no": int
            }
        """
        # 1. 日次マッチング (EXACT)
        daily_forecast = self._find_daily_forecast(product_code, customer_code, order_date)
        if daily_forecast:
            return {
                "forecast_id": daily_forecast.id,
                "granularity": "daily",
                "match_status": "EXACT",
                "forecast_qty": float(daily_forecast.qty_forecast),
                "version_no": daily_forecast.version_no,
            }

        # 2. 旬次マッチング (PERIOD)
        dekad_forecast = self._find_dekad_forecast(product_code, customer_code, order_date)
        if dekad_forecast:
            return {
                "forecast_id": dekad_forecast.id,
                "granularity": "dekad",
                "match_status": "PERIOD",
                "forecast_qty": None,  # 旬次は合計値なのでNone
                "version_no": dekad_forecast.version_no,
            }

        # 3. 月次マッチング (PERIOD)
        monthly_forecast = self._find_monthly_forecast(product_code, customer_code, order_date)
        if monthly_forecast:
            order_date.strftime("%Y-%m")
            return {
                "forecast_id": monthly_forecast.id,
                "granularity": "monthly",
                "match_status": "PERIOD",
                "forecast_qty": None,  # 月次は合計値なのでNone
                "version_no": monthly_forecast.version_no,
            }

        # 4. マッチなし
        return None

    def _find_daily_forecast(
        self, product_code: str, customer_code: str, target_date: date
    ) -> Forecast | None:
        """日次フォーキャストを検索."""
        stmt: Select[Forecast] = (
            select(Forecast)
            .join(Product)
            .join(Customer)
            .where(
                Product.product_code == product_code,
                Customer.customer_code == customer_code,
                Forecast.granularity == "daily",
                Forecast.date_day == target_date,
                Forecast.is_active.is_(True),
            )
            .order_by(Forecast.version_no.desc())
        )
        return self.db.execute(stmt).scalars().first()

    def _find_dekad_forecast(
        self, product_code: str, customer_code: str, target_date: date
    ) -> Forecast | None:
        """旬次フォーキャストを検索 (1日～10日、11日～20日、21日～月末)."""
        day = target_date.day
        if day <= 10:
            dekad_start = date(target_date.year, target_date.month, 1)
        elif day <= 20:
            dekad_start = date(target_date.year, target_date.month, 11)
        else:
            dekad_start = date(target_date.year, target_date.month, 21)

        stmt: Select[Forecast] = (
            select(Forecast)
            .join(Product)
            .join(Customer)
            .where(
                Product.product_code == product_code,
                Customer.customer_code == customer_code,
                Forecast.granularity == "dekad",
                Forecast.date_dekad_start == dekad_start,
                Forecast.is_active.is_(True),
            )
            .order_by(Forecast.version_no.desc())
        )
        return self.db.execute(stmt).scalars().first()

    def _find_monthly_forecast(
        self, product_code: str, customer_code: str, target_date: date
    ) -> Forecast | None:
        """月次フォーキャストを検索."""
        year_month = target_date.strftime("%Y-%m")

        stmt: Select[Forecast] = (
            select(Forecast)
            .join(Product)
            .join(Customer)
            .where(
                Product.product_code == product_code,
                Customer.customer_code == customer_code,
                Forecast.granularity == "monthly",
                Forecast.year_month == year_month,
                Forecast.is_active.is_(True),
            )
            .order_by(Forecast.version_no.desc())
        )
        return self.db.execute(stmt).scalars().first()

    def apply_forecast_to_order_line(
        self,
        order_line: OrderLine,
        product_code: str,
        customer_code: str,
        order_date: date,
    ) -> bool:
        """
        受注明細にフォーキャスト情報を適用.

        Args:
            order_line: 受注明細オブジェクト
            product_code: 製品コード
            customer_code: 得意先コード
            order_date: 受注日

        Returns:
            マッチングが成功したかどうか
        """
        match_result = self.match_order_line(order_line, product_code, customer_code, order_date)

        if match_result:
            order_line.forecast_id = match_result["forecast_id"]
            order_line.forecast_granularity = match_result["granularity"]
            order_line.forecast_match_status = match_result["match_status"]
            order_line.forecast_qty = match_result["forecast_qty"]
            order_line.forecast_version_no = match_result["version_no"]
            return True

        # マッチしない場合は明示的にNONEを設定
        order_line.forecast_match_status = "NONE"
        return False


def assign_auto_forecast_identifier(forecast: Forecast) -> None:
    """ID採番後に forecast_id を自動設定するユーティリティ."""
    if forecast.forecast_id is None:
        forecast.forecast_id = forecast.id
