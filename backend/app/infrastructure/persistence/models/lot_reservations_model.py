"""Lot reservation model for decoupled reservation management.

This model represents lot reservations as defined in the decoupling
migration plan. All lot reservations (forecast, order, manual) are
managed through this table.

See: docs/architecture/system_invariants.md
"""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from enum import Enum as PyEnum
from typing import TYPE_CHECKING

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Numeric,
    String,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base_model import Base


if TYPE_CHECKING:  # pragma: no cover
    from .inventory_models import Lot


class ReservationSourceType(str, PyEnum):
    """Source type for lot reservations.

    Defines the origin of the reservation:
    - FORECAST: Reserved for forecast demand
    - ORDER: Reserved for confirmed orders
    - MANUAL: Manually reserved (e.g., for samples, special cases)
    """

    FORECAST = "forecast"
    ORDER = "order"
    MANUAL = "manual"


class ReservationStatus(str, PyEnum):
    """ロット予約のステータス.

    【設計意図】
    なぜ3段階（TEMPORARY → ACTIVE → CONFIRMED）の状態遷移が必要なのか:

    1. TEMPORARY（一時予約）
       目的: 引当シミュレーション・プレビュー用
       理由: ユーザーが引当結果を確認してから確定したい
       → 「このロットで本当に良いか？」を検討する猶予を与える
       例: 引当画面で「プレビュー」ボタンを押した時点

    2. ACTIVE（仮予約・本予約）
       目的: 社内で引当を確定したが、SAP未登録の状態
       理由: SAP登録は外部システム連携のため即座に完了しない
       → 営業が受注を確定した時点で在庫を押さえる必要がある
       → SAP登録は後続のバッチ処理や手動操作で実施
       例: 引当画面で「確定」ボタンを押した後、SAP登録前

    3. CONFIRMED（確定予約）
       目的: SAP登録が完了し、外部システムと同期済み
       理由: SAP登録により、受注が正式に確定（請求・出荷指示が可能に）
       → この時点で在庫は確実に引き当て済みとなる
       → 在庫数量の計算では、CONFIRMEDのみを確定引当として扱う
       例: SAP連携バッチ実行後、またはSAP登録ボタン押下後

    4. RELEASED（解放済み）
       目的: 予約の解放・キャンセル（終端状態）
       理由: 一度解放したら元に戻せない設計
       → 履歴の改ざん防止、監査要件への対応
       → 再予約が必要な場合は新規レコード作成

    【なぜRELEASEDは終端状態なのか】
    - 一度解放した予約を復活させると、在庫履歴の整合性が取れなくなる
    - 監査証跡として「いつ解放したか」を記録する必要がある
    - 再予約が必要なら、新しい予約レコードとして明示的に作成すべき

    State machine transitions:
    - TEMPORARY → ACTIVE (一時予約の確定)
    - TEMPORARY → RELEASED (一時予約の失効)
    - ACTIVE → CONFIRMED (SAP登録による確定)
    - ACTIVE → RELEASED (予約の解放)
    - CONFIRMED → RELEASED (確定後の解放 - SAP連携必須)
    - RELEASED → (終端状態: 遷移不可)
    """

    TEMPORARY = "temporary"
    ACTIVE = "active"
    CONFIRMED = "confirmed"
    RELEASED = "released"


class ReservationStateMachine:
    """予約状態遷移マシン.

    C-03 Fix: AllocationStateMachine を廃止し、ReservationStatus ベースに統一。
    lot_reservations テーブルの状態遷移を管理する唯一のステートマシン。

    状態遷移ルール:
    - temporary → active (仮予約の本確定)
    - temporary → released (仮予約の失効/キャンセル)
    - active → confirmed (SAP登録による確定)
    - active → released (予約解放)
    - confirmed → released (確定解除 - 要SAP連携)
    - released → (遷移不可: 終端状態)
    """

    TRANSITIONS: dict[ReservationStatus, set[ReservationStatus]] = {
        ReservationStatus.TEMPORARY: {
            ReservationStatus.ACTIVE,
            ReservationStatus.RELEASED,
        },
        ReservationStatus.ACTIVE: {
            ReservationStatus.CONFIRMED,
            ReservationStatus.RELEASED,
        },
        ReservationStatus.CONFIRMED: {
            ReservationStatus.RELEASED,  # Note: SAP連携必須
        },
        ReservationStatus.RELEASED: set(),  # 終端状態
    }

    @classmethod
    def can_transition(
        cls, from_status: str | ReservationStatus, to_status: str | ReservationStatus
    ) -> bool:
        """指定された状態遷移が可能かチェック.

        Args:
            from_status: 遷移元ステータス
            to_status: 遷移先ステータス

        Returns:
            遷移可能なら True
        """
        if isinstance(from_status, str):
            try:
                from_status = ReservationStatus(from_status)
            except ValueError:
                return False

        if isinstance(to_status, str):
            try:
                to_status = ReservationStatus(to_status)
            except ValueError:
                return False

        return to_status in cls.TRANSITIONS.get(from_status, set())

    @classmethod
    def validate_transition(
        cls,
        from_status: str | ReservationStatus,
        to_status: str | ReservationStatus,
        operation: str = "transition",
    ) -> None:
        """状態遷移をバリデーション（不正な場合は例外）.

        Args:
            from_status: 遷移元ステータス
            to_status: 遷移先ステータス
            operation: 操作名（エラーメッセージ用）

        Raises:
            ValueError: 不正な遷移の場合
        """
        from_str = from_status.value if isinstance(from_status, ReservationStatus) else from_status
        to_str = to_status.value if isinstance(to_status, ReservationStatus) else to_status

        if not cls.can_transition(from_status, to_status):
            raise ValueError(
                f"Invalid reservation status transition: {from_str} → {to_str} ({operation})"
            )

    @classmethod
    def can_confirm(cls, status: str | ReservationStatus) -> bool:
        """確定可能かチェック（ACTIVE → CONFIRMED）."""
        return cls.can_transition(status, ReservationStatus.CONFIRMED)

    @classmethod
    def can_release(cls, status: str | ReservationStatus) -> bool:
        """解放可能かチェック."""
        return cls.can_transition(status, ReservationStatus.RELEASED)

    @classmethod
    def is_terminal(cls, status: str | ReservationStatus) -> bool:
        """終端状態（遷移不可）かチェック."""
        if isinstance(status, str):
            try:
                status = ReservationStatus(status)
            except ValueError:
                return False
        return len(cls.TRANSITIONS.get(status, set())) == 0


class LotReservation(Base):
    """Represents a reservation against a lot.

    All lot reservations (forecast, order, manual) are managed through
    this table. This replaces direct updates to Lot.allocated_quantity.

    Invariants (from system_invariants.md):
    - reserved_qty must be positive
    - Only 'active' and 'confirmed' reservations affect available qty
    - source_type + source_id identify the reservation origin
    """

    __tablename__ = "lot_reservations"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)

    lot_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("lots.id", ondelete="RESTRICT"),
        nullable=False,
    )

    source_type: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        comment="Reservation source: 'forecast' | 'order' | 'manual'",
    )

    source_id: Mapped[int | None] = mapped_column(
        BigInteger,
        nullable=True,
        comment="ID of the source entity (order_line_id, forecast_group_id, etc.)",
    )

    reserved_qty: Mapped[Decimal] = mapped_column(
        Numeric(15, 3),
        nullable=False,
        comment="Reserved quantity (must be positive)",
    )

    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        server_default=text("'active'"),
        comment="Reservation status: 'temporary' | 'active' | 'confirmed' | 'released'",
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        server_default=func.current_timestamp(),
    )

    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True,
        onupdate=func.current_timestamp(),
        comment="Timestamp of last update",
    )

    expires_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True,
        comment="Expiration time for temporary reservations",
    )

    confirmed_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True,
        comment="Timestamp when reservation was confirmed",
    )

    confirmed_by: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
        comment="User who confirmed the reservation",
    )

    released_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True,
        comment="Timestamp when reservation was released",
    )

    # SAP Registration markers (P3: explicit CONFIRMED signal)
    sap_document_no: Mapped[str | None] = mapped_column(
        String(20),
        nullable=True,
        comment="SAP document number (set on successful SAP registration)",
    )

    sap_registered_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True,
        comment="Timestamp when reservation was registered in SAP",
    )

    __table_args__ = (
        # Check constraints
        CheckConstraint(
            "reserved_qty > 0",
            name="chk_lot_reservations_qty_positive",
        ),
        CheckConstraint(
            "source_type IN ('forecast', 'order', 'manual')",
            name="chk_lot_reservations_source_type",
        ),
        CheckConstraint(
            "status IN ('temporary', 'active', 'confirmed', 'released')",
            name="chk_lot_reservations_status",
        ),
        # Indexes
        Index("idx_lot_reservations_lot_status", "lot_id", "status"),
        Index("idx_lot_reservations_source", "source_type", "source_id"),
        Index("idx_lot_reservations_status", "status"),
        Index(
            "idx_lot_reservations_expires_at",
            "expires_at",
            postgresql_where=text("expires_at IS NOT NULL"),
        ),
    )

    # Relationships
    lot: Mapped[Lot] = relationship("Lot", back_populates="reservations")

    def __repr__(self) -> str:
        return (
            f"<LotReservation(id={self.id}, lot_id={self.lot_id}, "
            f"source_type={self.source_type}, qty={self.reserved_qty}, "
            f"status={self.status})>"
        )

    @property
    def is_active(self) -> bool:
        """Check if reservation affects available quantity."""
        return self.status in (ReservationStatus.ACTIVE, ReservationStatus.CONFIRMED)
