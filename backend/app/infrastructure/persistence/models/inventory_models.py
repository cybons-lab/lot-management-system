"""Inventory and stock management models (DDL v2.2).

All models strictly follow the DDL as the single source of truth. Legacy
models (ExpiryRule) have been removed.

【設計意図】在庫モデルの設計判断:

1. なぜ Lot モデルが中心なのか
   理由: ロットベースの在庫管理
   業務的背景:
   - 自動車部品商社: 同じ製品でも、ロットごとに有効期限が異なる
   → ロット単位で在庫を管理する必要がある
   設計:
   - Lot: 物理的な在庫の単位（lot_number で識別）
   - supplier_item_id: どの製品のロットか
   - warehouse_id: どの倉庫に保管されているか
   - expiry_date: 有効期限（FEFO管理の基準）
   メリット:
   - トレーサビリティ: 「このロットはいつ入庫したか」を追跡
   - 有効期限管理: 期限の近いロットから優先的に出荷

2. current_quantity の設計（L99-101）
   理由: ロットの現在在庫数
   型: Numeric(15, 3)
   - 15桁: 整数部（最大999,999,999,999個）
   - 3桁: 小数部（0.001単位まで記録可能）
   用途:
   - 入庫: current_quantity += 入庫数
   - 出庫: current_quantity -= 出庫数
   - 引当: current_quantity は変化しない（reserved_quantity が増える）
   制約:
   - current_quantity >= 0 (L144)
   → 負数は許容しない（物理的にあり得ない）

3. なぜ reserved_quantity カラムがないのか
   理由: v3.0 で LotReservation テーブルに移行
   背景:
   - v2.x: Lot.allocated_quantity カラムで引当数を管理
   - v3.0: LotReservation テーブルで個別の予約を管理
   メリット:
   - 予約の履歴を保持（誰が、いつ、何個予約したか）
   - 予約の状態管理（TEMPORARY, ACTIVE, CONFIRMED, RELEASED）
   計算:
   - reserved_quantity = SUM(LotReservation.reserved_qty WHERE status IN ('ACTIVE', 'CONFIRMED'))
   → stock_calculation.py で動的に計算

4. status フィールドの設計（L103, L147-149）
   理由: ロットの状態管理
   値:
   - active: 通常在庫（引当可能）
   - depleted: 在庫ゼロ（引当不可）
   - expired: 有効期限切れ（引当不可）
   - quarantine: 隔離中（品質問題等）
   - locked: ロック中（手動ロック）
   業務的意義:
   - active 以外のロットは、FEFO自動引当から除外
   → 引当可能なロットのみを候補として扱う

5. locked_quantity の設計（L105-107）
   理由: 手動ロックによる引当制限
   用途:
   - 品質検査中: locked_quantity = 全量
   → 検査完了まで引当不可
   - 特定顧客専用: locked_quantity = 一部
   → 残りは通常引当可能
   計算:
   - available_quantity = current_quantity - reserved_quantity - locked_quantity
   業務シナリオ:
   - 品質問題が疑われるロット
   → locked_quantity を設定し、引当を一時停止

6. origin_type の設計（L128-131）
   理由: ロットの起源を追跡
   値:
   - ORDER: 受注に基づく入庫
   - FORECAST: フォーキャストに基づく入庫
   - SAMPLE: サンプル品
   - SAFETY_STOCK: 安全在庫
   - ADHOC: 臨時入庫（デフォルト）
   用途:
   - 受注ロットと安全在庫を区別
   → 受注ロットは対応する受注に優先的に引当
   業務的意義:
   - 「このロットはどの受注のために入庫したか」を追跡
   → 顧客ごとの専用在庫として管理可能

7. temporary_lot_key の設計（L136-141）
   理由: 仮入庫時のロット番号未確定対応
   背景:
   - 入庫時点ではロット番号が未確定
   → 後日、正式なロット番号が判明
   設計:
   - temporary_lot_key: UUID（一意識別キー）
   → 仮入庫時に発行
   - lot_number: 正式ロット番号確定後に更新
   用途:
   - 仮入庫 → 正式入庫の紐付け
   → 「UUID xxx の仮ロットが、正式ロット番号 ABC-123 になった」
   業務シナリオ:
   - 入庫当日は仮ロット番号で処理
   → 翌日、サプライヤーから正式ロット番号を受領

8. inspection_status の設計（L110-114）
   理由: 品質検査の管理
   値:
   - not_required: 検査不要
   - pending: 検査待ち
   - passed: 検査合格
   - failed: 検査不合格
   関連フィールド:
   - inspection_date: 検査日
   - inspection_cert_number: 検査証明書番号
   業務フロー:
   - 入庫 → inspection_status=pending
   → 検査実施 → passed/failed に更新
   → passed の場合のみ、引当可能

9. version フィールドの設計（L116）
   理由: 楽観的ロック（Optimistic Locking）
   用途:
   - 同時更新の競合検出
   → ユーザーAとBが同じロットを同時に更新
   → 片方の更新時に version が変わっていれば、エラー
   実装:
   - UPDATE lots SET ... WHERE id = ? AND version = ?
   → version が変わっていれば、UPDATE 0件 = 競合検出
   業務シナリオ:
   - 在庫調整を複数ユーザーが同時に実行
   → データロスを防止

10. expiry_date: Nullable の理由（L98）
    理由: 一部の製品は有効期限がない
    背景:
    - 金属部品: 有効期限なし（NULL）
    - 樹脂部品: 有効期限あり（YYYY-MM-DD）
    設計:
    - expiry_date IS NULL の場合
    → FEFOソートで最後尾（期限なし = 無限）
    業務的意義:
    - 有効期限なしの製品は、FEFOで最後に選ばれる
    → 有効期限ありの製品を優先的に消費
"""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from enum import Enum as PyEnum
from typing import TYPE_CHECKING

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship, synonym

from .base_model import Base
from .lot_receipt_models import LotReceipt


if TYPE_CHECKING:  # pragma: no cover - for type checkers only
    from .forecast_models import ForecastCurrent
    from .masters_models import Customer, DeliveryPlace, SupplierItem


# Valid transaction types
class StockTransactionType(str, PyEnum):
    """Enumerates valid stock transaction types."""

    INBOUND = "inbound"
    ALLOCATION = "allocation"
    ALLOCATION_HOLD = "allocation_hold"
    ALLOCATION_RELEASE = "allocation_release"
    SHIPMENT = "shipment"
    ADJUSTMENT = "adjustment"
    RETURN = "return"
    WITHDRAWAL = "withdrawal"


# Valid lot origin types
class LotOriginType(str, PyEnum):
    """Enumerates valid lot origin types."""

    ORDER = "order"
    FORECAST = "forecast"
    SAMPLE = "sample"
    SAFETY_STOCK = "safety_stock"
    ADHOC = "adhoc"


# Lot model has been moved to lot_receipt_models.py (LotReceipt)
# This alias is maintained for backward compatibility during migration


class StockMovement(Base):
    """Append-only stock ledger entries (在庫台帳).

    DDL: stock_history
    Primary key: id (BIGSERIAL)
    Foreign key: lot_id -> lots(id)
    """

    __tablename__ = "stock_history"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    lot_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("lot_receipts.id", ondelete="CASCADE"),
        nullable=False,
    )
    transaction_type: Mapped[StockTransactionType] = mapped_column(
        String(20),
        nullable=False,
    )
    quantity_change: Mapped[Decimal] = mapped_column(Numeric(15, 3), nullable=False)
    quantity_after: Mapped[Decimal] = mapped_column(Numeric(15, 3), nullable=False)
    reference_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    reference_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    transaction_date: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.current_timestamp()
    )

    __table_args__ = (
        CheckConstraint(
            "transaction_type IN ('inbound','allocation','shipment','adjustment','return','allocation_hold','allocation_release','withdrawal')",
            name="chk_stock_history_type",
        ),
        Index("idx_stock_history_lot", "lot_id"),
        Index("idx_stock_history_date", "transaction_date"),
        Index("idx_stock_history_type", "transaction_type"),
    )

    # Relationships
    lot: Mapped[LotReceipt] = relationship("LotReceipt", back_populates="stock_history")


class AdjustmentType(str, PyEnum):
    """Enumerates allowed adjustment reasons."""

    PHYSICAL_COUNT = "physical_count"
    DAMAGE = "damage"
    LOSS = "loss"
    FOUND = "found"
    OTHER = "other"


class Adjustment(Base):
    """Inventory adjustments linked to a lot (在庫調整).

    DDL: adjustments
    Primary key: id (BIGSERIAL)
    Foreign keys: lot_id -> lots(id), adjusted_by -> users(id)
    """

    __tablename__ = "adjustments"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    lot_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("lot_receipts.id", ondelete="RESTRICT"),
        nullable=False,
    )
    adjustment_type: Mapped[AdjustmentType] = mapped_column(String(20), nullable=False)
    adjusted_quantity: Mapped[Decimal] = mapped_column(Numeric(15, 3), nullable=False)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    adjusted_by: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )
    adjusted_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.current_timestamp()
    )

    __table_args__ = (
        CheckConstraint(
            "adjustment_type IN ('physical_count','damage','loss','found','other')",
            name="chk_adjustments_type",
        ),
        Index("idx_adjustments_lot", "lot_id"),
        Index("idx_adjustments_date", "adjusted_at"),
    )

    # Relationships
    lot: Mapped[LotReceipt] = relationship("LotReceipt", back_populates="adjustments")


class AllocationSuggestion(Base):
    """引当推奨（システムが提案する引当案）.

    DDL: allocation_suggestions
    Primary key: id (BIGSERIAL)
    Foreign keys: customer_id, delivery_place_id, supplier_item_id, lot_id
    """

    __tablename__ = "allocation_suggestions"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)

    # 需要側キー
    order_line_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    forecast_period: Mapped[str] = mapped_column(
        String(20), nullable=False
    )  # "YYYY-MM" or "YYYY-MM-DD"
    forecast_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("forecast_current.id", ondelete="CASCADE"),
        nullable=True,
    )

    customer_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("customers.id", ondelete="CASCADE"),
        nullable=False,
    )
    delivery_place_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("delivery_places.id", ondelete="CASCADE"),
        nullable=False,
    )
    supplier_item_id: Mapped[int] = mapped_column(
        "supplier_item_id",
        BigInteger,
        ForeignKey("supplier_items.id", ondelete="CASCADE"),
        nullable=False,
    )
    product_group_id = synonym("supplier_item_id")  # Alias for backward compatibility

    # ロット側キー
    lot_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("lot_receipts.id", ondelete="CASCADE"), nullable=False
    )
    quantity: Mapped[Decimal] = mapped_column(Numeric(15, 3), nullable=False)
    priority: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("0"))

    # 種別 / 由来
    allocation_type: Mapped[str] = mapped_column(String(10), nullable=False)  # 'soft' or 'hard'
    source: Mapped[str] = mapped_column(String(32), nullable=False)  # 'forecast_import' etc

    coa_issue_date: Mapped[date | None] = mapped_column(Date, nullable=True, comment="成績書発行日")

    # Phase 9 fields
    comment: Mapped[str | None] = mapped_column(Text, nullable=True, comment="数量別コメント")
    manual_shipment_date: Mapped[date | None] = mapped_column(
        Date, nullable=True, comment="手動設定の出荷日"
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.current_timestamp()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.current_timestamp()
    )

    __table_args__ = (
        Index("idx_allocation_suggestions_period", "forecast_period"),
        Index("idx_allocation_suggestions_customer", "customer_id"),
        Index("idx_allocation_suggestions_supplier_item", "supplier_item_id"),
        Index("idx_allocation_suggestions_lot", "lot_id"),
        Index("idx_allocation_suggestions_forecast", "forecast_id"),
    )
    # Relationships
    customer: Mapped[Customer] = relationship("Customer")
    delivery_place: Mapped[DeliveryPlace] = relationship("DeliveryPlace")
    supplier_item: Mapped[SupplierItem] = relationship("SupplierItem")
    product_group = synonym("supplier_item")  # Alias
    lot: Mapped[LotReceipt] = relationship("LotReceipt")
    forecast: Mapped[ForecastCurrent | None] = relationship("ForecastCurrent")


class AllocationTrace(Base):
    """引当処理のトレースログ（推論過程の記録）.

    DDL: allocation_traces
    Primary key: id (BIGSERIAL)
    Foreign keys: order_line_id -> order_lines(id), lot_id -> lots(id)
    """

    __tablename__ = "allocation_traces"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    order_line_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("order_lines.id", ondelete="CASCADE"),
        nullable=False,
    )
    lot_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("lot_receipts.id", ondelete="CASCADE"),
        nullable=True,  # ロットが特定されない場合もある（例: 全ロット期限切れ）
    )
    score: Mapped[Decimal | None] = mapped_column(
        Numeric(15, 6), nullable=True
    )  # 優先度スコア（FEFOベースなど）
    decision: Mapped[str] = mapped_column(
        String(20), nullable=False
    )  # 'adopted', 'rejected', 'partial'
    reason: Mapped[str] = mapped_column(
        String(255), nullable=False
    )  # '期限切れ', 'ロック中', 'FEFO採用', '在庫不足' 等
    allocated_qty: Mapped[Decimal | None] = mapped_column(
        Numeric(15, 3), nullable=True
    )  # 実際に引き当てた数量（adoptedまたはpartialの場合）
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.current_timestamp()
    )

    __table_args__ = (
        CheckConstraint(
            "decision IN ('adopted', 'rejected', 'partial')",
            name="chk_allocation_traces_decision",
        ),
        Index("idx_allocation_traces_order_line", "order_line_id"),
        Index("idx_allocation_traces_lot", "lot_id"),
        Index("idx_allocation_traces_created_at", "created_at"),
    )


# Backward compatibility alias (read model naming)
StockHistory = StockMovement
StockMovementReason = StockTransactionType

# LotCurrentStock alias for backward compatibility if needed, though InventoryItem is preferred.
# LotCurrentStock = InventoryItem
