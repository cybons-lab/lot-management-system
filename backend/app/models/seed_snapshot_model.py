# backend/app/models/seed_snapshot_model.py
"""Seed snapshot model for saving/restoring test data configurations."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import Column, DateTime, Integer, String, Text, JSON
from sqlalchemy.dialects.postgresql import JSONB

from app.models.base_model import Base


class SeedSnapshot(Base):
    """
    スナップショット: テストデータ生成のパラメータとプロファイルを保存.

    スナップショットを保存することで、同じパラメータで完全に再現可能な
    テストデータ生成を実現する。
    """

    __tablename__ = "seed_snapshots"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False, comment="スナップショット名")
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=datetime.utcnow,
        comment="作成日時",
    )
    params_json = Column(
        JSON().with_variant(JSONB, "postgresql"),
        nullable=False,
        comment="展開後の最終パラメータ（profile解決後）",
    )
    profile_json = Column(
        JSON().with_variant(JSONB, "postgresql"),
        nullable=True,
        comment="使用したプロファイル設定",
    )
    csv_dir = Column(
        Text,
        nullable=True,
        comment="CSVエクスポートディレクトリ（オプション）",
    )
    summary_json = Column(
        JSON().with_variant(JSONB, "postgresql"),
        nullable=True,
        comment="生成結果のサマリ（件数、検証結果など）",
    )
