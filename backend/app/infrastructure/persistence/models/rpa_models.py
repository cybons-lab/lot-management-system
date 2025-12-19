"""RPA Run models for Material Delivery Note workflow."""

from __future__ import annotations

from datetime import date, datetime
from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, Boolean, Date, DateTime, ForeignKey, Index, Integer, String, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.infrastructure.persistence.models.base_model import Base


if TYPE_CHECKING:
    from app.infrastructure.persistence.models.auth_models import User


class RpaRunStatus:
    """RPA Run status constants."""

    DOWNLOADED = "downloaded"  # ダウンロード完了（確認前）
    READY_FOR_STEP2 = "ready_for_step2"  # 確認完了
    STEP2_RUNNING = "step2_running"
    DONE = "done"
    CANCELLED = "cancelled"

    # Legacy alias for backward compatibility
    DRAFT = "downloaded"


class RpaRun(Base):
    """RPA実行記録（親テーブル）.

    素材納品書発行ワークフローの実行単位を管理。
    1回のCSV取込が1つのRunに対応。
    """

    __tablename__ = "rpa_runs"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    rpa_type: Mapped[str] = mapped_column(
        String(50), server_default="material_delivery_note", nullable=False
    )
    status: Mapped[str] = mapped_column(String(30), server_default="downloaded", nullable=False)

    # 取得データの期間
    data_start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    data_end_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    started_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    started_by_user_id: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    step2_executed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    step2_executed_by_user_id: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=text("CURRENT_TIMESTAMP"), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=text("CURRENT_TIMESTAMP"), nullable=False
    )

    __table_args__ = (
        Index("idx_rpa_runs_type", "rpa_type"),
        Index("idx_rpa_runs_status", "status"),
        Index("idx_rpa_runs_created_at", "created_at"),
    )

    # Relationships
    items: Mapped[list[RpaRunItem]] = relationship(
        "RpaRunItem",
        back_populates="run",
        cascade="all, delete-orphan",
        order_by="RpaRunItem.row_no",
    )
    started_by_user: Mapped[User | None] = relationship("User", foreign_keys=[started_by_user_id])
    step2_executed_by_user: Mapped[User | None] = relationship(
        "User", foreign_keys=[step2_executed_by_user_id]
    )

    @property
    def all_items_complete(self) -> bool:
        """全itemsが完了しているかどうか."""
        if not self.items:
            return False
        return all(item.complete_flag for item in self.items)

    @property
    def item_count(self) -> int:
        """items数."""
        return len(self.items) if self.items else 0

    @property
    def complete_count(self) -> int:
        """完了済みitems数."""
        return sum(1 for item in self.items if item.complete_flag) if self.items else 0


class RpaRunItem(Base):
    """RPA実行明細（子テーブル）.

    CSVの各行に対応するデータを保持。
    """

    __tablename__ = "rpa_run_items"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    run_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("rpa_runs.id", ondelete="CASCADE"), nullable=False
    )
    row_no: Mapped[int] = mapped_column(Integer, nullable=False)

    # CSV columns
    status: Mapped[str | None] = mapped_column(String(50), nullable=True)  # ステータス
    destination: Mapped[str | None] = mapped_column(String(50), nullable=True)  # 出荷先
    layer_code: Mapped[str | None] = mapped_column(String(50), nullable=True)  # 層別
    material_code: Mapped[str | None] = mapped_column(String(50), nullable=True)  # 材質コード
    delivery_date: Mapped[date | None] = mapped_column(Date, nullable=True)  # 納期
    delivery_quantity: Mapped[int | None] = mapped_column(Integer, nullable=True)  # 納入量
    shipping_vehicle: Mapped[str | None] = mapped_column(String(50), nullable=True)  # 出荷便

    # Flags
    issue_flag: Mapped[bool] = mapped_column(
        Boolean, server_default=text("false"), nullable=False
    )  # 発行フラグ
    complete_flag: Mapped[bool] = mapped_column(
        Boolean, server_default=text("false"), nullable=False
    )  # 発行完了フラグ
    match_result: Mapped[bool | None] = mapped_column(Boolean, nullable=True)  # 突合結果
    sap_registered: Mapped[bool | None] = mapped_column(Boolean, nullable=True)  # SAP登録
    order_no: Mapped[str | None] = mapped_column(String(100), nullable=True)  # 受発注No

    # 結果ステータス (pending/success/failure/error)
    result_status: Mapped[str | None] = mapped_column(String(20), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=text("CURRENT_TIMESTAMP"), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=text("CURRENT_TIMESTAMP"), nullable=False
    )

    __table_args__ = (
        Index("idx_rpa_run_items_run_id", "run_id"),
        Index("idx_rpa_run_items_run_row", "run_id", "row_no", unique=True),
    )

    # Relationships
    run: Mapped[RpaRun] = relationship("RpaRun", back_populates="items")
