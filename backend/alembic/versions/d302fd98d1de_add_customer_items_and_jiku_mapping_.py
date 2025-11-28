"""add_customer_items_and_jiku_mapping_extensions

Revision ID: d302fd98d1de
Revises: c86376ecd658
Create Date: 2025-11-28 21:01:55.432388

"""

import sqlalchemy as sa

from alembic import op


# revision identifiers, used by Alembic.
revision = "d302fd98d1de"
down_revision = "c86376ecd658"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. customer_items テーブル拡張
    op.add_column(
        "customer_items", sa.Column("shipping_document_template", sa.Text(), nullable=True)
    )
    op.add_column("customer_items", sa.Column("sap_notes", sa.Text(), nullable=True))

    # 2. customer_item_jiku_mappings テーブル作成
    op.create_table(
        "customer_item_jiku_mappings",
        sa.Column("id", sa.BigInteger(), nullable=False),
        sa.Column("customer_id", sa.BigInteger(), nullable=False),
        sa.Column("external_product_code", sa.String(length=100), nullable=False),
        sa.Column("jiku_code", sa.String(length=50), nullable=False),
        sa.Column("delivery_place_id", sa.BigInteger(), nullable=False),
        sa.Column("is_default", sa.Boolean(), server_default=sa.text("FALSE"), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=True
        ),
        sa.ForeignKeyConstraint(
            ["customer_id", "external_product_code"],
            ["customer_items.customer_id", "customer_items.external_product_code"],
            name="fk_customer_item_jiku_customer_item",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["delivery_place_id"],
            ["delivery_places.id"],
            name="fk_customer_item_jiku_delivery_place",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "customer_id", "external_product_code", "jiku_code", name="uq_customer_item_jiku"
        ),
        comment="顧客商品-次区マッピング（1商品に複数の次区コード対応）",
    )

    # 3. order_lines テーブル拡張
    op.add_column("order_lines", sa.Column("shipping_document_text", sa.Text(), nullable=True))


def downgrade() -> None:
    # 逆順で元に戻す
    op.drop_column("order_lines", "shipping_document_text")
    op.drop_table("customer_item_jiku_mappings")
    op.drop_column("customer_items", "sap_notes")
    op.drop_column("customer_items", "shipping_document_template")
