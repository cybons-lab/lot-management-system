"""Inbound planning related SQLAlchemy models.

【設計意図】入荷計画モデルの設計判断:

1. なぜ InboundPlan（ヘッダ）と InboundPlanLine（明細）に分けるのか
   理由: 正規化された設計で、データの重複を避ける
   業務的背景:
   - 1つの入荷計画に複数の製品が含まれる
   - 例: 仕入先Aから、製品P-001（100個）+ 製品P-002（200個）を一括入荷
   → ヘッダ（入荷日、仕入先）と明細（製品、数量）を分離
   実装:
   - InboundPlan: 入荷計画全体の情報（plan_number, supplier_id, arrival_date）
   - InboundPlanLine: 製品ごとの情報（product_group_id, quantity）
   → 1対多の関係

2. なぜ sap_po_number をユニークにするのか（L50-55, L77-78）
   理由: SAP購買発注番号は業務上のユニークキー
   業務的背景:
   - 自動車部品商社: SAP ERPで購買発注を管理
   - 例: SAP購買発注番号 "PO-2024-00123"
   → この番号で入荷計画を一意に特定
   実装:
   - sap_po_number: UNIQUE制約（L52-53）
   → 同じSAP発注番号で複数の入荷計画を作成できない
   業務影響:
   - SAP連携時のデータ整合性を保証

3. なぜステータスが4種類あるのか（L34-40）
   理由: 入荷計画のライフサイクルを追跡
   ステータス遷移:
   - PLANNED: 計画済み（まだ入荷していない）
   - PARTIALLY_RECEIVED: 一部入荷済み（残りは未入荷）
   - RECEIVED: 全量入荷済み
   - CANCELLED: キャンセル（発注取り消し）
   業務フロー:
   1. 計画作成: PLANNED
   2. 一部入荷: PARTIALLY_RECEIVED
   3. 全量入荷: RECEIVED
   業務影響:
   - 未入荷の計画を一覧表示（PLANNED のみ）
   - 入荷進捗の可視化

4. なぜ CASCADE="all, delete-orphan" を使うのか（L92-96）
   理由: 親削除時に子も自動削除
   背景:
   - InboundPlan 削除時に、InboundPlanLine も削除すべき
   → 明細だけが残ると、データ不整合
   実装:
   - cascade="all, delete-orphan"
   → InboundPlan を削除すると、関連する InboundPlanLine も自動削除
   業務影響:
   - 入荷計画のキャンセル時に、明細も一括削除

5. なぜ ExpectedLot テーブルがあるのか（L140-175）
   理由: 入荷予定ロットの事前登録
   業務的背景:
   - 仕入先から「ロット番号 L-001 で100個入荷予定」という情報を事前受領
   → 入荷前に、どのロットが来るかを把握したい
   実装:
   - ExpectedLot: 入荷予定ロット情報
   → expected_lot_number, expected_quantity, expected_expiry_date
   用途:
   - 入荷前に引当計画を立てる（Provisional Reservation）
   → 「ロット L-001 が来たら、受注Xに引当」

6. なぜ expected_lot_number が Nullable なのか（L154）
   理由: 入荷時にロット番号が確定するケースがある
   業務フロー:
   - パターンA: 仕入先が事前にロット番号を通知（expected_lot_number 設定）
   - パターンB: 入荷時に現場でロット番号を確認（expected_lot_number = NULL）
   → 柔軟性を持たせるため Nullable
   業務影響:
   - パターンBの場合、入荷時に temporary_lot_key で管理

7. なぜ InboundPlanLine.ondelete="CASCADE" なのか（L107）
   理由: 親削除時に子も削除
   背景:
   - InboundPlan 削除時に、InboundPlanLine も削除すべき
   実装:
   - ondelete="CASCADE": データベースレベルで削除伝播
   → SQLAlchemy の cascade とDBレベルのCASCADEの両方を設定
   メリット:
   - データベース側でも整合性を保証（アプリケーション以外からの削除にも対応）

8. なぜ planned_arrival_date にインデックスがあるのか（L84-87）
   理由: 入荷予定日での検索が頻繁
   業務クエリ:
   - 「今週入荷予定の計画を一覧表示」
   - 「入荷遅延している計画を検出」
   → planned_arrival_date での検索が多い
   実装:
   - Index("idx_inbound_plans_date", "planned_arrival_date")
   → 日付範囲検索が高速化

9. なぜ P3 で Provisional Reservation を削除したのか（L137）
   理由: v3.0 で LotReservation に統一
   背景:
   - v2.x: ProvisionalReservation（仮引当）テーブルが存在
   → 入荷予定ロットへの事前引当
   - 問題: ProvisionalReservation + LotReservation の2テーブルで管理（複雑）
   - v3.0: LotReservation のみに統一
   → source_type で区別（ORDER, FORECAST, etc.）
   実装:
   - コメント: "P3: Provisional reservations moved to LotReservation (removed)"
   → 既存コードへの注意喚起

10. なぜ ExpectedLot.lot に uselist=False があるのか（L175）
    理由: 1対1の関連を明示
    背景:
    - ExpectedLot → Lot: 1対1の関連（1つの予定ロットは1つの実ロットに対応）
    → uselist=False で単一オブジェクトとして扱う
    実装:
    - lot: Mapped[Lot | None]（リストではなく、単一オブジェクト）
    メリット:
    - expected_lot.lot（単一オブジェクト）として扱える
    → expected_lot.lot.lot_number のようにアクセス
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
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base_model import Base


if TYPE_CHECKING:  # pragma: no cover - for type checkers only
    from .lot_receipt_models import LotReceipt
    from .masters_models import Supplier, SupplierItem


class InboundPlanStatus(str, PyEnum):
    """Valid status values for inbound plans."""

    PLANNED = "planned"
    PARTIALLY_RECEIVED = "partially_received"
    RECEIVED = "received"
    CANCELLED = "cancelled"


class InboundPlan(Base):
    """Inbound plan header details."""

    __tablename__ = "inbound_plans"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    plan_number: Mapped[str] = mapped_column(String(50), nullable=False)
    sap_po_number: Mapped[str | None] = mapped_column(
        String(20),
        nullable=True,
        unique=True,
        comment="SAP購買発注番号（業務キー）",
    )
    supplier_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("suppliers.id", ondelete="RESTRICT"),
        nullable=False,
    )
    planned_arrival_date: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[InboundPlanStatus] = mapped_column(
        String(20), nullable=False, server_default=text("'planned'")
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
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
        UniqueConstraint("plan_number", name="uq_inbound_plans_plan_number"),
        UniqueConstraint("sap_po_number", name="uq_inbound_plans_sap_po_number"),
        CheckConstraint(
            "status IN ('planned','partially_received','received','cancelled')",
            name="chk_inbound_plans_status",
        ),
        Index("idx_inbound_plans_supplier", "supplier_id"),
        Index(
            "idx_inbound_plans_date",
            "planned_arrival_date",
        ),
        Index("idx_inbound_plans_status", "status"),
    )

    supplier: Mapped[Supplier] = relationship("Supplier", back_populates="inbound_plans")
    lines: Mapped[list[InboundPlanLine]] = relationship(
        "InboundPlanLine",
        back_populates="inbound_plan",
        cascade="all, delete-orphan",
    )


class InboundPlanLine(Base):
    """Inbound plan line items."""

    __tablename__ = "inbound_plan_lines"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    inbound_plan_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("inbound_plans.id", ondelete="CASCADE"),
        nullable=False,
    )
    product_group_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("supplier_items.id", ondelete="RESTRICT"),
        nullable=False,
    )
    planned_quantity: Mapped[Decimal] = mapped_column(Numeric(15, 3), nullable=False)
    unit: Mapped[str] = mapped_column(String(20), nullable=False)
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
        Index("idx_inbound_plan_lines_plan", "inbound_plan_id"),
        Index("idx_inbound_plan_lines_product_group", "product_group_id"),
    )

    inbound_plan: Mapped[InboundPlan] = relationship("InboundPlan", back_populates="lines")
    product_group: Mapped[SupplierItem] = relationship(
        "SupplierItem", back_populates="inbound_plan_lines"
    )
    expected_lots: Mapped[list[ExpectedLot]] = relationship(
        "ExpectedLot", back_populates="inbound_plan_line", cascade="all, delete-orphan"
    )
    # P3: Provisional reservations moved to LotReservation (removed)


class ExpectedLot(Base):
    """Expected lots associated with inbound plan lines."""

    __tablename__ = "expected_lots"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    inbound_plan_line_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey(
            "inbound_plan_lines.id",
            ondelete="CASCADE",
        ),
        nullable=False,
    )
    expected_lot_number: Mapped[str | None] = mapped_column(String(100), nullable=True)
    expected_quantity: Mapped[Decimal] = mapped_column(Numeric(15, 3), nullable=False)
    expected_expiry_date: Mapped[date | None] = mapped_column(Date, nullable=True)
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
        Index("idx_expected_lots_line", "inbound_plan_line_id"),
        Index("idx_expected_lots_number", "expected_lot_number"),
    )

    inbound_plan_line: Mapped[InboundPlanLine] = relationship(
        "InboundPlanLine", back_populates="expected_lots"
    )
    lot_receipt: Mapped[LotReceipt | None] = relationship(
        "LotReceipt", back_populates="expected_lot", uselist=False
    )
