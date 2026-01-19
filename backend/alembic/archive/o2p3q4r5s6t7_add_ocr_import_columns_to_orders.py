"""Add OCR import columns to orders

Revision ID: o2p3q4r5s6t7
Revises: n1o2p3q4r5s6
Create Date: 2025-12-22

This migration adds columns to orders and order_lines tables
for OCR data import functionality.
"""

import sqlalchemy as sa

from alembic import op


# revision identifiers, used by Alembic.
revision = "o2p3q4r5s6t7"
down_revision = "n1o2p3q4r5s6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # === orders: OCR取込情報追加 ===
    op.add_column(
        "orders",
        sa.Column(
            "ocr_source_filename",
            sa.String(255),
            nullable=True,
            comment="OCR取込元ファイル名",
        ),
    )

    # === order_lines: OCR元データ追加 ===
    op.add_column(
        "order_lines",
        sa.Column(
            "external_product_code",
            sa.String(100),
            nullable=True,
            comment="OCR元の先方品番（変換前の生データ）",
        ),
    )

    # === order_lines: product_id を Nullable に変更 ===
    # 既存データがあるため、ALTER COLUMN で nullable=True に変更
    op.alter_column(
        "order_lines",
        "product_id",
        existing_type=sa.BigInteger(),
        nullable=True,
        comment="製品ID（OCR取込時はNULL可、変換後に設定）",
    )

    # インデックス追加
    op.create_index(
        "idx_orders_ocr_source",
        "orders",
        ["ocr_source_filename"],
        postgresql_where=sa.text("ocr_source_filename IS NOT NULL"),
    )
    op.create_index(
        "idx_order_lines_external_product_code",
        "order_lines",
        ["external_product_code"],
        postgresql_where=sa.text("external_product_code IS NOT NULL"),
    )


def downgrade() -> None:
    # インデックス削除
    op.drop_index("idx_order_lines_external_product_code", table_name="order_lines")
    op.drop_index("idx_orders_ocr_source", table_name="orders")

    # product_id を NOT NULL に戻す（既存データがNULLの場合は失敗する可能性あり）
    op.alter_column(
        "order_lines",
        "product_id",
        existing_type=sa.BigInteger(),
        nullable=False,
    )

    # カラム削除
    op.drop_column("order_lines", "external_product_code")
    op.drop_column("orders", "ocr_source_filename")
