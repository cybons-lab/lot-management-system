"""SAP統合モデル.

Phase 1: SAP突合ロジック基盤
- SapConnection: SAP接続情報（本番/テスト切り替え）
- SapMaterialCache: SAPから取得したマテリアルデータのキャッシュ
- SapFetchLog: SAP取得ログ（デバッグ・監査用）
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy import (
    BigInteger,
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.infrastructure.persistence.models.base_model import Base


class SapConnection(Base):
    """SAP接続情報.

    本番/テスト環境の切り替えをサポート。
    パスワードは暗号化して保存。
    """

    __tablename__ = "sap_connections"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(
        String(100), nullable=False, comment="接続名（本番/テスト等）"
    )
    environment: Mapped[str] = mapped_column(
        String(20), nullable=False, comment="環境識別子（production/test）"
    )
    description: Mapped[str | None] = mapped_column(Text, nullable=True, comment="説明")

    # SAP接続パラメータ
    ashost: Mapped[str] = mapped_column(String(255), nullable=False, comment="SAPホスト")
    sysnr: Mapped[str] = mapped_column(String(10), nullable=False, comment="システム番号")
    client: Mapped[str] = mapped_column(String(10), nullable=False, comment="クライアント番号")
    user_name: Mapped[str] = mapped_column(String(100), nullable=False, comment="ユーザー名")
    passwd_encrypted: Mapped[str] = mapped_column(Text, nullable=False, comment="暗号化パスワード")
    lang: Mapped[str] = mapped_column(String(10), server_default=text("'JA'"), nullable=False)

    # デフォルト呼び出しパラメータ
    default_bukrs: Mapped[str] = mapped_column(
        String(10),
        server_default=text("'10'"),
        nullable=False,
        comment="デフォルト会社コード",
    )
    default_kunnr: Mapped[str | None] = mapped_column(
        String(20), nullable=True, comment="デフォルト得意先コード"
    )

    # ステータス
    is_active: Mapped[bool] = mapped_column(Boolean, server_default=text("true"), nullable=False)
    is_default: Mapped[bool] = mapped_column(
        Boolean, server_default=text("false"), nullable=False, comment="デフォルト接続"
    )

    # タイムスタンプ
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=text("CURRENT_TIMESTAMP"),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=text("CURRENT_TIMESTAMP"),
        nullable=False,
    )

    # リレーション
    material_cache: Mapped[list[SapMaterialCache]] = relationship(
        "SapMaterialCache", back_populates="connection", cascade="all, delete-orphan"
    )
    fetch_logs: Mapped[list[SapFetchLog]] = relationship(
        "SapFetchLog", back_populates="connection", cascade="all, delete-orphan"
    )

    def to_conn_info(self, decrypted_passwd: str) -> dict[str, str]:
        """pyrfc.Connection用の接続情報dictを生成.

        Args:
            decrypted_passwd: 復号化されたパスワード

        Returns:
            pyrfc.Connection用のdict
        """
        return {
            "ashost": self.ashost,
            "sysnr": self.sysnr,
            "client": self.client,
            "user": self.user_name,
            "passwd": decrypted_passwd,
            "lang": self.lang,
        }


class SapMaterialCache(Base):
    """SAPマテリアルキャッシュ.

    SAPのZ_SCM1_RFC_MATERIAL_DOWNLOADから取得したET_DATAをキャッシュ。
    キー: (connection_id, zkdmat_b, kunnr)
    """

    __tablename__ = "sap_material_cache"
    __table_args__ = (
        UniqueConstraint("connection_id", "zkdmat_b", "kunnr", name="uq_sap_material_cache_key"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    connection_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("sap_connections.id", ondelete="CASCADE"),
        nullable=False,
    )

    # キー列（確定）
    zkdmat_b: Mapped[str] = mapped_column(
        String(100), nullable=False, comment="先方品番（SAPのZKDMAT_B）", index=True
    )
    kunnr: Mapped[str] = mapped_column(
        String(20), nullable=False, comment="得意先コード", index=True
    )

    # 追加列はJSONBで柔軟に保持
    raw_data: Mapped[dict[str, Any]] = mapped_column(
        JSONB,
        nullable=False,
        server_default=text("'{}'::jsonb"),
        comment="ET_DATAの生データ（ZKDMAT_B以外の列）",
    )

    # フェッチ情報
    fetched_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=text("CURRENT_TIMESTAMP"),
        nullable=False,
        comment="取得日時",
        index=True,
    )
    fetch_batch_id: Mapped[str | None] = mapped_column(
        String(50), nullable=True, comment="取得バッチID（同一取得を識別）"
    )

    # タイムスタンプ
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=text("CURRENT_TIMESTAMP"),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=text("CURRENT_TIMESTAMP"),
        nullable=False,
    )

    # リレーション
    connection: Mapped[SapConnection] = relationship(
        "SapConnection", back_populates="material_cache"
    )


class SapFetchLog(Base):
    """SAP取得ログ.

    デバッグ・監査用のログテーブル。
    RFC呼び出しの成功/失敗、処理時間などを記録。
    """

    __tablename__ = "sap_fetch_logs"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    connection_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("sap_connections.id", ondelete="CASCADE"),
        nullable=False,
    )

    fetch_batch_id: Mapped[str] = mapped_column(
        String(50), nullable=False, comment="取得バッチID", index=True
    )
    rfc_name: Mapped[str] = mapped_column(String(100), nullable=False, comment="RFC名")
    params: Mapped[dict[str, Any]] = mapped_column(
        JSONB, nullable=False, comment="呼び出しパラメータ"
    )

    # 結果
    status: Mapped[str] = mapped_column(String(20), nullable=False, comment="SUCCESS/ERROR")
    record_count: Mapped[int | None] = mapped_column(Integer, nullable=True, comment="取得件数")
    error_message: Mapped[str | None] = mapped_column(
        Text, nullable=True, comment="エラーメッセージ"
    )
    duration_ms: Mapped[int | None] = mapped_column(
        Integer, nullable=True, comment="処理時間（ミリ秒）"
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=text("CURRENT_TIMESTAMP"),
        nullable=False,
        index=True,
    )

    # リレーション
    connection: Mapped[SapConnection] = relationship("SapConnection", back_populates="fetch_logs")
