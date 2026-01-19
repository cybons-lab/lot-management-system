"""Phase 2: B-Plan - Create lot_master and missing_mapping_events tables.

New tables:
- lot_master: Lot number consolidation master
- missing_mapping_events: Record of missing mapping warnings

Revision ID: b2_lot_master_tables
Revises: b1_prep_short_names
Create Date: 2026-01-15
"""

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op


# revision identifiers, used by Alembic.
revision = "b2_lot_master_tables"
down_revision = "b1_prep_short_names"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ============================================================
    # 1. Create lot_master table
    # ============================================================
    op.create_table(
        "lot_master",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("lot_number", sa.String(100), nullable=False),
        sa.Column("product_id", sa.BigInteger(), nullable=False),
        sa.Column("supplier_id", sa.BigInteger(), nullable=True),
        sa.Column("first_receipt_date", sa.Date(), nullable=True),
        sa.Column("latest_expiry_date", sa.Date(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["product_id"],
            ["products.id"],
            name="fk_lot_master_product_id",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["supplier_id"],
            ["suppliers.id"],
            name="fk_lot_master_supplier_id",
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("lot_number", "product_id", name="uq_lot_master_number_product"),
        comment="ロット番号名寄せマスタ - 同一ロット番号の複数入荷を許可",
    )

    op.create_index("idx_lot_master_product", "lot_master", ["product_id"])
    op.create_index("idx_lot_master_lot_number", "lot_master", ["lot_number"])
    op.create_index("idx_lot_master_supplier", "lot_master", ["supplier_id"])

    # ============================================================
    # 2. Create missing_mapping_events table
    # ============================================================
    op.create_table(
        "missing_mapping_events",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("customer_id", sa.BigInteger(), nullable=True),
        sa.Column("product_id", sa.BigInteger(), nullable=True),
        sa.Column("supplier_id", sa.BigInteger(), nullable=True),
        sa.Column(
            "event_type",
            sa.String(50),
            nullable=False,
            comment="イベント種別: delivery_place_not_found, jiku_mapping_not_found 等",
        ),
        sa.Column(
            "occurred_at",
            sa.DateTime(),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.Column(
            "context_json",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
            comment="エラー発生時のコンテキスト（リクエスト内容等）",
        ),
        sa.Column("created_by", sa.BigInteger(), nullable=True),
        sa.Column("resolved_at", sa.DateTime(), nullable=True, comment="解決日時（NULL = 未解決）"),
        sa.Column("resolved_by", sa.BigInteger(), nullable=True),
        sa.Column("resolution_note", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["customer_id"],
            ["customers.id"],
            name="fk_missing_mapping_events_customer_id",
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["product_id"],
            ["products.id"],
            name="fk_missing_mapping_events_product_id",
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["supplier_id"],
            ["suppliers.id"],
            name="fk_missing_mapping_events_supplier_id",
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["created_by"],
            ["users.id"],
            name="fk_missing_mapping_events_created_by",
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["resolved_by"],
            ["users.id"],
            name="fk_missing_mapping_events_resolved_by",
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id"),
        comment="未設定イベント - 自動セット失敗時の警告記録",
    )

    op.create_index(
        "idx_missing_mapping_events_customer", "missing_mapping_events", ["customer_id"]
    )
    op.create_index("idx_missing_mapping_events_product", "missing_mapping_events", ["product_id"])
    op.create_index(
        "idx_missing_mapping_events_occurred", "missing_mapping_events", ["occurred_at"]
    )
    op.create_index(
        "idx_missing_mapping_events_unresolved",
        "missing_mapping_events",
        ["event_type", "occurred_at"],
        postgresql_where=sa.text("resolved_at IS NULL"),
    )


def downgrade() -> None:
    # Drop indexes
    op.drop_index(
        "idx_missing_mapping_events_unresolved",
        table_name="missing_mapping_events",
        postgresql_where=sa.text("resolved_at IS NULL"),
    )
    op.drop_index("idx_missing_mapping_events_occurred", table_name="missing_mapping_events")
    op.drop_index("idx_missing_mapping_events_product", table_name="missing_mapping_events")
    op.drop_index("idx_missing_mapping_events_customer", table_name="missing_mapping_events")

    op.drop_index("idx_lot_master_supplier", table_name="lot_master")
    op.drop_index("idx_lot_master_lot_number", table_name="lot_master")
    op.drop_index("idx_lot_master_product", table_name="lot_master")

    # Drop tables
    op.drop_table("missing_mapping_events")
    op.drop_table("lot_master")
