# backend/app/models/forecast.py
"""
フォーキャストモデル

顧客からの生産予測（フォーキャスト）を管理。
日次・旬次・月次の複数粒度に対応し、バージョン管理を実現。

Note:
    製品コードはマスタ未登録の値も許容するため、外部キー制約を持たない。
"""

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    Date,
    DateTime,
    Index,
    Integer,
    String,
)
from sqlalchemy.orm import Mapped, relationship

from .base_model import AuditMixin, Base


class Forecast(AuditMixin, Base):
    """
    フォーキャストマスタ
    
    顧客からの生産予測を記録。日次・旬次・月次の粒度に対応。
    バージョン管理により予測の変化を追跡可能。
    
    Attributes:
        id: 内部ID（主キー）
        forecast_id: フォーキャストID（ユニーク、任意）
        product_id: 製品ID（外部キー制約なし）
        customer_id: 顧客ID
        supplier_id: 仕入先ID（任意）
        granularity: 粒度（daily/dekad/monthly）
        date_day: 日次の場合の日付
        date_dekad_start: 旬次の場合の旬開始日
        year_month: 月次の場合の年月（YYYY-MM形式）
        qty_forecast: 予測数量
        version_no: バージョン番号
        version_issued_at: バージョン発行日時
        source_system: 送信元システム
        is_active: 有効フラグ
    
    Note:
        granularityに応じて、date_day/date_dekad_start/year_monthのいずれか1つのみがNULL以外となる。
    """

    __tablename__ = "forecasts"

    id = Column(Integer, primary_key=True)  # 内部ID

    forecast_id = Column(Integer, nullable=True, unique=True)  # フォーキャストID

    product_id = Column(String(64), nullable=False)  # 製品ID（FKなし）
    
    customer_id = Column(String(64), nullable=False)  # 顧客ID
    supplier_id = Column(String(64), nullable=True)  # 仕入先ID

    granularity = Column(String(16), nullable=False)  # 粒度（daily/dekad/monthly）
    date_day = Column(Date)  # 日次の場合の日付
    date_dekad_start = Column(Date)  # 旬次の場合の旬開始日
    year_month = Column(String(7))  # 月次の場合の年月（YYYY-MM）

    qty_forecast = Column(Integer, nullable=False)  # 予測数量

    version_no = Column(Integer, nullable=False, default=1)  # バージョン番号
    version_issued_at = Column(DateTime(timezone=True), nullable=False)  # バージョン発行日時
    source_system = Column(String(32), nullable=False, default="external")  # 送信元システム
    is_active = Column(Boolean, nullable=False, default=True)  # 有効フラグ

    # リレーション
    order_lines: Mapped[list["OrderLine"]] = relationship(
        "OrderLine",
        back_populates="forecast",
        lazy="noload",  # 受注明細は必要時のみ明示的に取得
    )

    __table_args__ = (
        # 粒度に応じて適切な日付フィールドが設定されていることを保証
        CheckConstraint(
            "("
            " (granularity='daily'   AND date_day IS NOT NULL     AND date_dekad_start IS NULL AND year_month IS NULL)"
            " OR "
            " (granularity='dekad'   AND date_dekad_start IS NOT NULL AND date_day IS NULL     AND year_month IS NULL)"
            " OR "
            " (granularity='monthly' AND year_month IS NOT NULL   AND date_day IS NULL         AND date_dekad_start IS NULL)"
            ")",
            name="ck_forecast_period_key_exclusivity",
        ),
        # 粒度の値を制限
        CheckConstraint(
            "granularity in ('daily','dekad','monthly')",
            name="ck_forecast_granularity",
        ),
        # 予測数量は非負
        CheckConstraint("qty_forecast >= 0", name="ck_forecast_qty_nonneg"),
        # 顧客・製品の複合インデックス
        Index("idx_customer_product", "customer_id", "product_id"),
    )
