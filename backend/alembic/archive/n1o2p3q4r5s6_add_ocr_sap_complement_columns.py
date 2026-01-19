"""Add OCR-SAP complement master columns

Revision ID: n1o2p3q4r5s6
Revises: m1n2o3p4q5r6
Create Date: 2025-12-22

This migration adds columns to customer_items and rpa_run_items tables
for OCR -> SAP conversion complement master functionality.
"""

import sqlalchemy as sa

from alembic import op


# revision identifiers, used by Alembic.
revision = "n1o2p3q4r5s6"
down_revision = "m1n2o3p4q5r6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # === customer_items: OCR→SAP変換用カラム追加 ===
    op.add_column(
        "customer_items",
        sa.Column("maker_part_no", sa.String(100), nullable=True, comment="メーカー品番"),
    )
    op.add_column(
        "customer_items",
        sa.Column(
            "order_category", sa.String(50), nullable=True, comment="発注区分（指示/かんばん等）"
        ),
    )
    op.add_column(
        "customer_items",
        sa.Column(
            "is_procurement_required",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
            comment="発注の有無",
        ),
    )
    op.add_column(
        "customer_items",
        sa.Column("shipping_slip_text", sa.Text(), nullable=True, comment="出荷票テキスト"),
    )
    op.add_column(
        "customer_items",
        sa.Column("ocr_conversion_notes", sa.Text(), nullable=True, comment="OCR変換用備考"),
    )

    # === customer_items: SAP正（キャッシュ項目）追加 ===
    op.add_column(
        "customer_items",
        sa.Column(
            "sap_supplier_code",
            sa.String(50),
            nullable=True,
            comment="SAP仕入先コード（キャッシュ）",
        ),
    )
    op.add_column(
        "customer_items",
        sa.Column(
            "sap_warehouse_code",
            sa.String(50),
            nullable=True,
            comment="SAP倉庫コード（キャッシュ）",
        ),
    )
    op.add_column(
        "customer_items",
        sa.Column(
            "sap_shipping_warehouse",
            sa.String(50),
            nullable=True,
            comment="SAP出荷倉庫（キャッシュ）",
        ),
    )
    op.add_column(
        "customer_items",
        sa.Column("sap_uom", sa.String(20), nullable=True, comment="SAP単位（キャッシュ）"),
    )

    # インデックス追加
    op.create_index(
        "idx_customer_items_order_category",
        "customer_items",
        ["order_category"],
    )

    # === rpa_run_items: マスタ参照ログカラム追加 ===
    op.add_column(
        "rpa_run_items",
        sa.Column(
            "complement_customer_id",
            sa.BigInteger(),
            nullable=True,
            comment="参照したマスタのcustomer_id",
        ),
    )
    op.add_column(
        "rpa_run_items",
        sa.Column(
            "complement_external_product_code",
            sa.String(100),
            nullable=True,
            comment="参照したマスタのexternal_product_code",
        ),
    )
    op.add_column(
        "rpa_run_items",
        sa.Column(
            "complement_match_type",
            sa.String(10),
            nullable=True,
            comment="検索種別（exact: 完全一致, prefix: 前方一致）",
        ),
    )

    # インデックス追加
    op.create_index(
        "idx_rri_complement_master",
        "rpa_run_items",
        ["complement_customer_id", "complement_external_product_code"],
    )


def downgrade() -> None:
    # rpa_run_items
    op.drop_index("idx_rri_complement_master", table_name="rpa_run_items")
    op.drop_column("rpa_run_items", "complement_match_type")
    op.drop_column("rpa_run_items", "complement_external_product_code")
    op.drop_column("rpa_run_items", "complement_customer_id")

    # customer_items
    op.drop_index("idx_customer_items_order_category", table_name="customer_items")
    op.drop_column("customer_items", "sap_uom")
    op.drop_column("customer_items", "sap_shipping_warehouse")
    op.drop_column("customer_items", "sap_warehouse_code")
    op.drop_column("customer_items", "sap_supplier_code")
    op.drop_column("customer_items", "ocr_conversion_notes")
    op.drop_column("customer_items", "shipping_slip_text")
    op.drop_column("customer_items", "is_procurement_required")
    op.drop_column("customer_items", "order_category")
    op.drop_column("customer_items", "maker_part_no")
