"""SmartRead OCR models for PDF import configuration."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import BigInteger, DateTime, String, Text, text
from sqlalchemy.orm import Mapped, mapped_column

from app.infrastructure.persistence.models.base_model import Base


class SmartReadConfig(Base):
    """SmartRead OCRの設定を保存.

    API接続情報やテンプレート設定を管理する。
    """

    __tablename__ = "smartread_configs"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)

    # API接続設定
    endpoint: Mapped[str] = mapped_column(Text, nullable=False)
    api_key: Mapped[str] = mapped_column(Text, nullable=False)

    # リクエスト設定
    request_type: Mapped[str] = mapped_column(
        String(50), nullable=False, default="sync"
    )  # sync or async
    template_ids: Mapped[str | None] = mapped_column(
        Text, nullable=True
    )  # カンマ区切りでテンプレートID

    # エクスポート設定
    export_type: Mapped[str] = mapped_column(
        String(20), nullable=False, default="json"
    )  # json or csv
    aggregation_type: Mapped[str | None] = mapped_column(String(50), nullable=True)  # 集約タイプ

    # ディレクトリ設定（オプション：ファイル監視用）
    watch_dir: Mapped[str | None] = mapped_column(Text, nullable=True)
    export_dir: Mapped[str | None] = mapped_column(Text, nullable=True)
    input_exts: Mapped[str | None] = mapped_column(
        String(100), nullable=True, default="pdf,png,jpg,jpeg"
    )  # 対応拡張子

    # メタ情報
    name: Mapped[str] = mapped_column(String(100), nullable=False, default="default")  # 設定名
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(default=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=text("CURRENT_TIMESTAMP"), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=text("CURRENT_TIMESTAMP"), nullable=False
    )
