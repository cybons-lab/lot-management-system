"""Forecast models for v2.4 schema with forecast_current and forecast_history
tables.

【設計意図】予測データモデルの設計判断:

1. なぜ forecast_current と forecast_history の2テーブルに分けるのか
   理由: 最新の予測データと履歴データを効率的に管理
   業務的背景:
   - 自動車部品商社: 顧客から毎月、翌3ヶ月分の需要予測を受領
   - 例: 1月10日に「2月〜4月の予測」を受領
   - 問題: 過去の予測も保存したい（精度分析のため）
   解決:
   - forecast_current: 最新の予測のみ（高速なクエリ）
   - forecast_history: 過去の全予測（分析用、アクセス頻度低い）
   → テーブル分離でクエリパフォーマンス向上

2. なぜスナップショット方式を採用するのか（L51-52）
   理由: 予測データの時系列変化を追跡
   背景:
   - 顧客の需要予測は毎月変わる
   - 例: 1月10日の予測: 製品A 100個
   - 例: 2月10日の予測: 製品A 150個（需要増）
   → 「いつの時点で、どの予測を受領したか」を記録
   実装:
   - snapshot_at: 予測を受領した日時
   → 複数のスナップショットを比較して、需要トレンドを分析

3. なぜ複合ユニーク制約が2つあるのか（L64-79）
   理由: 検索性能とデータ整合性の両立
   インデックス1（L65-70）:
   - idx_forecast_current_unique: (customer_id, delivery_place_id, product_group_id)
   → 顧客×納品先×製品での検索を高速化（ユニーク制約なし）
   インデックス2（L71-78）:
   - ux_forecast_current_unique: + forecast_date, forecast_period
   → 同一日・同一期間の重複を防ぐ（ユニーク制約あり）
   業務ルール:
   - 同じ顧客・納品先・製品・日付・期間で、複数の予測は不可
   → データの一意性を保証

4. なぜ forecast_period を String(7) にするのか（L50, L105）
   理由: YYYY-MM 形式（年月）を格納
   例: "2024-01", "2024-02"
   用途:
   - 月次予測の集計: 「2024年1月の予測合計」
   - 期間指定検索: 「2024-01 から 2024-03 の予測」
   → 7文字で十分（YYYY-MM = 7文字）
   代替案:
   - Date型: 日付まで必要ない（月のみで十分）
   - Integer: 202401 形式も可能だが、可読性が低い

5. なぜ ForecastHistory は外部キー制約がないのか（L99-101）
   理由: 履歴データの独立性を保証
   背景:
   - forecast_current: 外部キー制約あり（L32-45）
   → 顧客・納品先・製品の削除時に RESTRICT
   - forecast_history: 外部キー制約なし
   → 顧客が削除されても、過去の予測履歴は保持
   業務影響:
   - 顧客との取引終了後も、予測精度の分析が可能
   - データの不整合（参照先が存在しない）は許容

6. なぜ archived_at を追加するのか（L107-109）
   理由: 履歴化のタイミングを記録
   処理フロー:
   1. 新しい予測をインポート
   2. 既存の forecast_current を forecast_history に移動
   3. archived_at に移動日時を記録
   用途:
   - 「いつ履歴化されたか」を追跡
   → 予測の更新頻度を分析

7. なぜ forecast_quantity を Numeric(15,3) にするのか（L48）
   理由: 大量数と小数点以下の精度を両立
   業務要件:
   - 最大値: 999,999,999,999.999（15桁 = 12桁 + 小数点3桁）
   → 自動車部品は大量生産（数十万個/月）
   - 小数点以下3桁: 重量単位（kg）での予測
   例: 製品A 1,234.567kg
   → 高精度な需要予測

8. なぜ relationship で back_populates を使うのか（L82-86）
   理由: 双方向の関連を明示
   実装:
   - ForecastCurrent.customer → Customer
   - Customer.forecast_current → List[ForecastCurrent]
   メリット:
   - 双方向でのアクセスが可能
   → forecast.customer.name（順方向）
   → customer.forecast_current（逆方向）
   - SQLAlchemy が自動的に同期
   → forecast.customer を設定すると、customer.forecast_current も更新

9. なぜ ForecastHistory にインデックスを1つだけにするのか（L113-120）
   理由: 書き込み性能を優先
   背景:
   - forecast_history: 書き込み頻度が高い（毎月の予測インポート）
   - 検索頻度: 低い（分析時のみ）
   → インデックスは最小限に抑える
   インデックス選定:
   - ix_forecast_history_key: (customer_id, delivery_place_id, product_group_id)
   → 分析時の主要な検索軸
   → date や period はインデックス不要（全件スキャンで十分）

10. なぜ Forecast = ForecastCurrent のエイリアスがあるのか（L123-124）
    理由: 後方互換性の維持
    背景:
    - v2.3以前: Forecast テーブルのみ
    - v2.4: ForecastCurrent + ForecastHistory に分割
    → 既存コードが Forecast を参照している
    解決:
    - Forecast = ForecastCurrent のエイリアス
    → 既存コードの修正不要（段階的な移行が可能）
"""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, Date, DateTime, ForeignKey, Index, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base_model import Base


if TYPE_CHECKING:  # pragma: no cover - for type checkers only
    from .masters_models import Customer, DeliveryPlace, SupplierItem


class ForecastCurrent(Base):
    """Current active forecast data.

    Each row represents a single forecast entry for customer ×
    delivery_place × product × date. When a new snapshot is imported,
    existing rows are moved to forecast_history.
    """

    __tablename__ = "forecast_current"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    customer_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("customers.id", ondelete="RESTRICT"),
        nullable=False,
    )
    delivery_place_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("delivery_places.id", ondelete="RESTRICT"),
        nullable=False,
    )
    product_group_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("supplier_items.id", ondelete="RESTRICT"),
        nullable=False,
    )
    forecast_date: Mapped[date] = mapped_column(Date, nullable=False)
    forecast_quantity: Mapped[Decimal] = mapped_column(Numeric(15, 3), nullable=False)
    unit: Mapped[str | None] = mapped_column(String, nullable=True)
    forecast_period: Mapped[str] = mapped_column(String(7), nullable=False)
    snapshot_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    __table_args__ = (
        Index(
            "idx_forecast_current_unique",
            "customer_id",
            "delivery_place_id",
            "product_group_id",
        ),
        Index(
            "ux_forecast_current_unique",
            "customer_id",
            "delivery_place_id",
            "product_group_id",
            "forecast_date",
            "forecast_period",
            unique=True,
        ),
    )

    customer: Mapped[Customer] = relationship("Customer", back_populates="forecast_current")
    delivery_place: Mapped[DeliveryPlace] = relationship(
        "DeliveryPlace", back_populates="forecast_current"
    )
    product_group: Mapped[SupplierItem] = relationship(
        "SupplierItem", back_populates="forecast_current"
    )


class ForecastHistory(Base):
    """Historical forecast data archived when new snapshots are imported.

    Structure mirrors forecast_current with additional archived_at
    timestamp.
    """

    __tablename__ = "forecast_history"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    customer_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    delivery_place_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    product_group_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    forecast_date: Mapped[date] = mapped_column(Date, nullable=False)
    forecast_quantity: Mapped[Decimal] = mapped_column(Numeric, nullable=False)
    unit: Mapped[str | None] = mapped_column(String, nullable=True)
    forecast_period: Mapped[str] = mapped_column(String(7), nullable=False)
    snapshot_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    archived_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)

    __table_args__ = (
        Index(
            "ix_forecast_history_key",
            "customer_id",
            "delivery_place_id",
            "product_group_id",
        ),
    )


# Backward compatibility alias
Forecast = ForecastCurrent
