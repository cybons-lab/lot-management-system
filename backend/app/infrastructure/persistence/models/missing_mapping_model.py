"""MissingMappingEvent model for recording auto-set failures.

B-Plan: Records cases where customer/delivery_place mappings could not be
automatically resolved, allowing UI to show warnings and admins to fix gaps.

Design rationale:
1. なぜ missing_mapping_events が必要か
   - 得意先・納入先の自動セットが失敗した場合の記録
   - UIで警告を表示しつつ、管理者がマッピング追加を促進

2. event_type の種類
   - delivery_place_not_found: 納入先が見つからない
   - jiku_mapping_not_found: 次区マッピングが見つからない
   - supplier_mapping_not_found: 仕入先マッピングが見つからない

3. resolved_at / resolved_by
   - マッピング追加後に解決済みとしてマーク
   - 未解決イベントの一覧表示に使用
"""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import BigInteger, DateTime, ForeignKey, Index, String, Text, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.infrastructure.persistence.models.base_model import Base


if TYPE_CHECKING:
    from app.infrastructure.persistence.models.auth_models import User
    from app.infrastructure.persistence.models.masters_models import (
        Customer,
        ProductGroup,
        Supplier,
    )


class MissingMappingEvent(Base):
    """Record of missing mapping events for auto-set failures.

    Used to track cases where customer/product/delivery_place mappings
    could not be automatically resolved, prompting admin action.
    """

    __tablename__ = "missing_mapping_events"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)

    # Context: what was being looked up
    customer_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("customers.id", ondelete="SET NULL"),
        nullable=True,
    )
    product_group_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("product_groups.id", ondelete="SET NULL"),
        nullable=True,
    )
    supplier_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("suppliers.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Event details
    event_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        comment="イベント種別: delivery_place_not_found, jiku_mapping_not_found 等",
    )
    occurred_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=text("CURRENT_TIMESTAMP"),
        nullable=False,
    )
    context_json: Mapped[dict[str, Any] | None] = mapped_column(
        JSONB,
        nullable=True,
        comment="エラー発生時のコンテキスト（リクエスト内容等）",
    )

    # Who triggered the event
    created_by: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Resolution tracking
    resolved_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True,
        comment="解決日時（NULL = 未解決）",
    )
    resolved_by: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    resolution_note: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    # Standard timestamp
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=text("CURRENT_TIMESTAMP"),
        nullable=False,
    )

    # Relationships
    customer: Mapped[Customer | None] = relationship("Customer", foreign_keys=[customer_id])
    product_group: Mapped[ProductGroup | None] = relationship(
        "ProductGroup", foreign_keys=[product_group_id]
    )
    supplier: Mapped[Supplier | None] = relationship("Supplier", foreign_keys=[supplier_id])
    created_by_user: Mapped[User | None] = relationship("User", foreign_keys=[created_by])
    resolved_by_user: Mapped[User | None] = relationship("User", foreign_keys=[resolved_by])

    __table_args__ = (
        Index("idx_missing_mapping_events_customer", "customer_id"),
        Index("idx_missing_mapping_events_product_group", "product_group_id"),
        Index("idx_missing_mapping_events_occurred", "occurred_at"),
        Index(
            "idx_missing_mapping_events_unresolved",
            "event_type",
            "occurred_at",
            postgresql_where=text("resolved_at IS NULL"),
        ),
        {"comment": "未設定イベント - 自動セット失敗時の警告記録"},
    )

    def __repr__(self) -> str:
        return (
            f"<MissingMappingEvent(id={self.id}, event_type={self.event_type}, "
            f"customer_id={self.customer_id}, resolved={self.resolved_at is not None})>"
        )

    @property
    def is_resolved(self) -> bool:
        """Check if the event has been resolved."""
        return self.resolved_at is not None

    def resolve(self, user_id: int, note: str | None = None) -> None:
        """Mark the event as resolved."""
        from app.core.time_utils import utcnow

        self.resolved_at = utcnow()
        self.resolved_by = user_id
        self.resolution_note = note
