"""add customer_item_delivery_settings table

Revision ID: 20241209_cids
Revises: 20241209_add_withdrawals
Create Date: 2025-12-09 20:55:00.000000

"""

import sqlalchemy as sa

from alembic import op


# revision identifiers, used by Alembic.
revision = "20241209_cids"
down_revision = "20241209_add_withdrawals"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create customer_item_delivery_settings table."""
    op.create_table(
        "customer_item_delivery_settings",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("customer_id", sa.BigInteger(), nullable=False),
        sa.Column("external_product_code", sa.String(length=100), nullable=False),
        sa.Column(
            "delivery_place_id",
            sa.BigInteger(),
            nullable=True,
            comment="納入先（NULLの場合はデフォルト設定）",
        ),
        sa.Column(
            "jiku_code",
            sa.String(length=50),
            nullable=True,
            comment="次区コード（NULLの場合は全次区共通）",
        ),
        sa.Column(
            "shipment_text",
            sa.Text(),
            nullable=True,
            comment="出荷表テキスト（SAP連携用）",
        ),
        sa.Column(
            "packing_note",
            sa.Text(),
            nullable=True,
            comment="梱包・注意書き",
        ),
        sa.Column(
            "lead_time_days",
            sa.Integer(),
            nullable=True,
            comment="リードタイム（日）",
        ),
        sa.Column(
            "is_default",
            sa.Boolean(),
            server_default="FALSE",
            nullable=False,
            comment="デフォルト設定フラグ",
        ),
        sa.Column(
            "valid_from",
            sa.Date(),
            nullable=True,
            comment="有効開始日",
        ),
        sa.Column(
            "valid_to",
            sa.Date(),
            nullable=True,
            comment="有効終了日",
        ),
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
            ["customer_id", "external_product_code"],
            ["customer_items.customer_id", "customer_items.external_product_code"],
            name="fk_cids_customer_item",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["delivery_place_id"],
            ["delivery_places.id"],
            name="fk_cids_delivery_place",
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "customer_id",
            "external_product_code",
            "delivery_place_id",
            "jiku_code",
            name="uq_customer_item_delivery_settings",
        ),
    )

    with op.batch_alter_table("customer_item_delivery_settings", schema=None) as batch_op:
        batch_op.create_index(
            "idx_cids_customer_item", ["customer_id", "external_product_code"], unique=False
        )
        batch_op.create_index("idx_cids_delivery_place", ["delivery_place_id"], unique=False)
        batch_op.create_index("idx_cids_jiku_code", ["jiku_code"], unique=False)


def downgrade() -> None:
    """Drop customer_item_delivery_settings table."""
    with op.batch_alter_table("customer_item_delivery_settings", schema=None) as batch_op:
        batch_op.drop_index("idx_cids_jiku_code")
        batch_op.drop_index("idx_cids_delivery_place")
        batch_op.drop_index("idx_cids_customer_item")

    op.drop_table("customer_item_delivery_settings")
