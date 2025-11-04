# backend/app/models/forecast.py
"""
フォーキャストモデル（修正版）
Product との外部キー制約を追加
"""

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
)
from sqlalchemy.orm import relationship

from .base_model import AuditMixin, Base


class Forecast(AuditMixin, Base):
    """フォーキャストマスタ"""

    __tablename__ = "forecasts"

    id = Column(Integer, primary_key=True)

    forecast_id = Column(String(36), nullable=False, unique=True)
    
    # 🔧 修正: ForeignKey制約を追加
    product_id = Column(
        String(64), 
        ForeignKey("products.product_code"), 
        nullable=False
    )
    
    customer_id = Column(String(64), nullable=False)
    supplier_id = Column(String(64), nullable=False)

    granularity = Column(String(16), nullable=False)  # 'daily'|'dekad'|'monthly'
    date_day = Column(Date)
    date_dekad_start = Column(Date)
    year_month = Column(String(7))  # 'YYYY-MM'

    qty_forecast = Column(Integer, nullable=False)

    version_no = Column(Integer, nullable=False, default=1)
    version_issued_at = Column(DateTime(timezone=True), nullable=False)
    source_system = Column(String(32), nullable=False, default="external")
    is_active = Column(Boolean, nullable=False, default=True)

    # 🔧 修正: Productへのリレーションシップを追加
    product = relationship("Product", back_populates="forecasts")
    
    # 🔧 修正: OrderLineへのリレーションシップを追加
    order_lines = relationship("OrderLine", back_populates="forecast")

    __table_args__ = (
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
        CheckConstraint(
            "granularity in ('daily','dekad','monthly')",
            name="ck_forecast_granularity",
        ),
        CheckConstraint("qty_forecast >= 0", name="ck_forecast_qty_nonneg"),
        Index("idx_customer_product", "customer_id", "product_id"),
    )
