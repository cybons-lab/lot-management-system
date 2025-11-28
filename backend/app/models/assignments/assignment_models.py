"""User-Supplier assignment models."""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    BigInteger,
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base_model import Base


if TYPE_CHECKING:
    from app.models.auth_models import User
    from app.models.masters_models import Supplier


class UserSupplierAssignment(Base):
    """ユーザー-仕入先担当割り当て (User-Supplier assignments).

    ビジネスルール:
    - 1ユーザーは複数の仕入先を担当可能
    - 1仕入先には複数の担当者を割り当て可能
    - is_primary=True の担当者は仕入先ごとに1人まで（主担当）

    用途:
    - 画面での優先表示（自分の担当仕入先を上位に）
    - フィルタリング（自分の担当のみ表示）
    - 業務の責任範囲の明確化
    """

    __tablename__ = "user_supplier_assignments"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    supplier_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("suppliers.id", ondelete="CASCADE"),
        nullable=False,
    )
    is_primary: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default=text("FALSE"),
    )
    assigned_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.current_timestamp()
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.current_timestamp()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.current_timestamp()
    )

    __table_args__ = (
        UniqueConstraint(
            "user_id", "supplier_id", name="uq_user_supplier_assignments_user_supplier"
        ),
        Index("idx_user_supplier_assignments_user", "user_id"),
        Index("idx_user_supplier_assignments_supplier", "supplier_id"),
        Index(
            "idx_user_supplier_assignments_primary",
            "is_primary",
            postgresql_where=text("is_primary = TRUE"),
        ),
        # 仕入先ごとに主担当は1人まで
        Index(
            "uq_user_supplier_primary_per_supplier",
            "supplier_id",
            unique=True,
            postgresql_where=text("is_primary = TRUE"),
        ),
    )

    # Relationships
    user: Mapped[User] = relationship("User", back_populates="supplier_assignments")
    supplier: Mapped[Supplier] = relationship("Supplier", back_populates="user_assignments")
