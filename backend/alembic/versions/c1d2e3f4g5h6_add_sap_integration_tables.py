"""Add SAP integration tables (sap_connections, sap_material_cache)

Revision ID: c1d2e3f4g5h6
Revises: d1922e5e679c
Create Date: 2026-01-22

Phase 1: SAP突合ロジック基盤
- sap_connections: SAP接続情報（本番/テスト切り替え）
- sap_material_cache: SAPから取得したマテリアルデータのキャッシュ
"""

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

from alembic import op


# revision identifiers, used by Alembic.
revision = "c1d2e3f4g5h6"
down_revision = "d1922e5e679c"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create SAP integration tables."""
    # SAP接続情報テーブル
    op.create_table(
        "sap_connections",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False, comment="接続名（本番/テスト等）"),
        sa.Column(
            "environment",
            sa.String(length=20),
            nullable=False,
            comment="環境識別子（production/test）",
        ),
        sa.Column("description", sa.Text(), nullable=True, comment="説明"),
        # SAP接続パラメータ
        sa.Column("ashost", sa.String(length=255), nullable=False, comment="SAPホスト"),
        sa.Column("sysnr", sa.String(length=10), nullable=False, comment="システム番号"),
        sa.Column("client", sa.String(length=10), nullable=False, comment="クライアント番号"),
        sa.Column("user_name", sa.String(length=100), nullable=False, comment="ユーザー名"),
        sa.Column(
            "passwd_encrypted", sa.Text(), nullable=False, comment="暗号化パスワード"
        ),
        sa.Column(
            "lang", sa.String(length=10), server_default=sa.text("'JA'"), nullable=False
        ),
        # デフォルト呼び出しパラメータ
        sa.Column(
            "default_bukrs",
            sa.String(length=10),
            server_default=sa.text("'10'"),
            nullable=False,
            comment="デフォルト会社コード",
        ),
        sa.Column(
            "default_kunnr",
            sa.String(length=20),
            nullable=True,
            comment="デフォルト得意先コード",
        ),
        # ステータス
        sa.Column(
            "is_active",
            sa.Boolean(),
            server_default=sa.text("true"),
            nullable=False,
        ),
        sa.Column(
            "is_default",
            sa.Boolean(),
            server_default=sa.text("false"),
            nullable=False,
            comment="デフォルト接続",
        ),
        # タイムスタンプ
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_sap_connections_environment", "sap_connections", ["environment"]
    )
    op.create_index(
        "ix_sap_connections_is_active", "sap_connections", ["is_active"]
    )

    # SAPマテリアルキャッシュテーブル
    op.create_table(
        "sap_material_cache",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column(
            "connection_id",
            sa.BigInteger(),
            sa.ForeignKey("sap_connections.id", ondelete="CASCADE"),
            nullable=False,
        ),
        # キー列（確定）
        sa.Column(
            "zkdmat_b",
            sa.String(length=100),
            nullable=False,
            comment="先方品番（SAPのZKDMAT_B）",
        ),
        # 得意先コード（呼び出し条件）
        sa.Column(
            "kunnr",
            sa.String(length=20),
            nullable=False,
            comment="得意先コード",
        ),
        # 追加列はJSONBで柔軟に保持（明日確定後に個別列化も可能）
        sa.Column(
            "raw_data",
            JSONB,
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
            comment="ET_DATAの生データ（ZKDMAT_B以外の列）",
        ),
        # フェッチ情報
        sa.Column(
            "fetched_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
            comment="取得日時",
        ),
        sa.Column(
            "fetch_batch_id",
            sa.String(length=50),
            nullable=True,
            comment="取得バッチID（同一取得を識別）",
        ),
        # タイムスタンプ
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "connection_id", "zkdmat_b", "kunnr", name="uq_sap_material_cache_key"
        ),
    )
    op.create_index(
        "ix_sap_material_cache_zkdmat_b", "sap_material_cache", ["zkdmat_b"]
    )
    op.create_index(
        "ix_sap_material_cache_kunnr", "sap_material_cache", ["kunnr"]
    )
    op.create_index(
        "ix_sap_material_cache_fetched_at", "sap_material_cache", ["fetched_at"]
    )

    # SAP取得ログテーブル（デバッグ・監査用）
    op.create_table(
        "sap_fetch_logs",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column(
            "connection_id",
            sa.BigInteger(),
            sa.ForeignKey("sap_connections.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "fetch_batch_id",
            sa.String(length=50),
            nullable=False,
            comment="取得バッチID",
        ),
        sa.Column(
            "rfc_name",
            sa.String(length=100),
            nullable=False,
            comment="RFC名",
        ),
        sa.Column(
            "params",
            JSONB,
            nullable=False,
            comment="呼び出しパラメータ",
        ),
        sa.Column(
            "status",
            sa.String(length=20),
            nullable=False,
            comment="SUCCESS/ERROR",
        ),
        sa.Column(
            "record_count",
            sa.Integer(),
            nullable=True,
            comment="取得件数",
        ),
        sa.Column(
            "error_message",
            sa.Text(),
            nullable=True,
            comment="エラーメッセージ",
        ),
        sa.Column(
            "duration_ms",
            sa.Integer(),
            nullable=True,
            comment="処理時間（ミリ秒）",
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_sap_fetch_logs_fetch_batch_id", "sap_fetch_logs", ["fetch_batch_id"]
    )
    op.create_index(
        "ix_sap_fetch_logs_created_at", "sap_fetch_logs", ["created_at"]
    )


def downgrade() -> None:
    """Drop SAP integration tables."""
    op.drop_table("sap_fetch_logs")
    op.drop_table("sap_material_cache")
    op.drop_table("sap_connections")
