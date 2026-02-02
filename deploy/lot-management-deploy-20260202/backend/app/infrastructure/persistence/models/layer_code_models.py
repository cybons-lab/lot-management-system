"""Layer Code Mapping models."""

from datetime import datetime

from sqlalchemy import DateTime, Index, String, text
from sqlalchemy.orm import Mapped, mapped_column

from app.infrastructure.persistence.models.base_model import Base


class LayerCodeMapping(Base):
    """層別コード → メーカー名 マッピングマスタ.

    層別コードからメーカー名を取得するためのルックアップテーブル。
    """

    __tablename__ = "layer_code_mappings"

    layer_code: Mapped[str] = mapped_column(String(50), primary_key=True)
    maker_name: Mapped[str] = mapped_column(String(100), nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=text("CURRENT_TIMESTAMP"), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=text("CURRENT_TIMESTAMP"), nullable=False
    )

    __table_args__ = (Index("idx_layer_code_mappings_maker", "maker_name"),)
