"""add_makers_master_and_material_order_forecasts

Revision ID: 8d90d504f80e
Revises: 62a340dbe783
Create Date: 2026-02-04 22:56:16.996896

"""

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op


# revision identifiers, used by Alembic.
revision = "8d90d504f80e"
down_revision = "62a340dbe783"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. makers テーブル作成
    op.create_table(
        "makers",
        sa.Column("id", sa.BigInteger(), nullable=False),
        sa.Column("maker_code", sa.String(length=50), nullable=False),
        sa.Column("maker_name", sa.String(length=200), nullable=False),
        sa.Column("display_name", sa.String(length=200), nullable=True),
        sa.Column("short_name", sa.String(length=50), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column(
            "valid_to",
            sa.Date(),
            server_default=sa.text("'9999-12-31'"),
            nullable=False,
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
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("maker_code", name="uq_makers_maker_code"),
    )
    op.create_index("idx_makers_valid_to", "makers", ["valid_to"])

    # 2. layer_code_mappings から makers へデータ移行
    op.execute(
        """
        INSERT INTO makers (maker_code, maker_name)
        SELECT layer_code, maker_name FROM layer_code_mappings
        ON CONFLICT (maker_code) DO NOTHING
        """
    )

    # 3. layer_code_mappings を互換ビューとして再作成
    op.execute("DROP TABLE IF EXISTS layer_code_mappings CASCADE")
    op.execute(
        """
        CREATE VIEW layer_code_mappings AS
        SELECT
            maker_code AS layer_code,
            maker_name,
            created_at,
            updated_at
        FROM makers
        WHERE valid_to >= CURRENT_DATE
        """
    )

    # 4. material_order_forecasts テーブル作成
    op.create_table(
        "material_order_forecasts",
        sa.Column("id", sa.BigInteger(), nullable=False),
        sa.Column("target_month", sa.String(length=7), nullable=False),
        # 既存マスタFK（LEFT JOIN用）
        sa.Column("customer_item_id", sa.BigInteger(), nullable=True),
        sa.Column("warehouse_id", sa.BigInteger(), nullable=True),
        sa.Column("maker_id", sa.BigInteger(), nullable=True),
        # CSV生データ（全列保存）
        sa.Column("material_code", sa.String(length=50), nullable=True),
        sa.Column("unit", sa.String(length=20), nullable=True),
        sa.Column("warehouse_code", sa.String(length=50), nullable=True),
        sa.Column("jiku_code", sa.String(length=50), nullable=False),
        sa.Column("delivery_place", sa.String(length=50), nullable=True),
        sa.Column("support_division", sa.String(length=50), nullable=True),
        sa.Column("procurement_type", sa.String(length=50), nullable=True),
        sa.Column("maker_code", sa.String(length=50), nullable=True),
        sa.Column("maker_name", sa.String(length=200), nullable=True),
        sa.Column("material_name", sa.String(length=500), nullable=True),
        # 数量データ（月次集計）
        sa.Column("delivery_lot", sa.Numeric(precision=15, scale=3), nullable=True),
        sa.Column("order_quantity", sa.Numeric(precision=15, scale=3), nullable=True),
        sa.Column("month_start_instruction", sa.Numeric(precision=15, scale=3), nullable=True),
        sa.Column("manager_name", sa.String(length=100), nullable=True),
        sa.Column(
            "monthly_instruction_quantity",
            sa.Numeric(precision=15, scale=3),
            nullable=True,
        ),
        sa.Column("next_month_notice", sa.Numeric(precision=15, scale=3), nullable=True),
        # 日別・期間別数量（JSON）
        sa.Column("daily_quantities", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("period_quantities", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        # スナップショット情報
        sa.Column(
            "snapshot_at",
            sa.DateTime(),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.Column("imported_by", sa.BigInteger(), nullable=True),
        sa.Column("source_file_name", sa.String(length=500), nullable=True),
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
            ["customer_item_id"],
            ["customer_items.id"],
            name="fk_mof_customer_item",
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["warehouse_id"],
            ["warehouses.id"],
            name="fk_mof_warehouse",
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["maker_id"],
            ["makers.id"],
            name="fk_mof_maker",
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["imported_by"],
            ["users.id"],
            name="fk_mof_imported_by",
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    # インデックス作成
    op.create_index("idx_mof_target_month", "material_order_forecasts", ["target_month"])
    op.create_index("idx_mof_material_code", "material_order_forecasts", ["material_code"])
    op.create_index("idx_mof_maker_code", "material_order_forecasts", ["maker_code"])
    op.create_index("idx_mof_jiku_code", "material_order_forecasts", ["jiku_code"])
    op.create_index("idx_mof_customer_item", "material_order_forecasts", ["customer_item_id"])
    op.create_index("idx_mof_maker", "material_order_forecasts", ["maker_id"])
    op.create_index("idx_mof_snapshot", "material_order_forecasts", ["snapshot_at"])

    # ユニーク制約
    op.create_index(
        "ux_mof_unique",
        "material_order_forecasts",
        ["target_month", "material_code", "jiku_code", "maker_code"],
        unique=True,
    )

    # 5. shipping_master_curated の jiku_code を必須化
    op.alter_column(
        "shipping_master_curated",
        "jiku_code",
        existing_type=sa.String(length=50),
        nullable=False,
    )


def downgrade() -> None:
    # Rollback: jiku_code を任意に戻す
    op.alter_column(
        "shipping_master_curated",
        "jiku_code",
        existing_type=sa.String(length=50),
        nullable=True,
    )

    # material_order_forecasts 削除
    op.drop_index("ux_mof_unique", table_name="material_order_forecasts")
    op.drop_index("idx_mof_snapshot", table_name="material_order_forecasts")
    op.drop_index("idx_mof_maker", table_name="material_order_forecasts")
    op.drop_index("idx_mof_customer_item", table_name="material_order_forecasts")
    op.drop_index("idx_mof_jiku_code", table_name="material_order_forecasts")
    op.drop_index("idx_mof_maker_code", table_name="material_order_forecasts")
    op.drop_index("idx_mof_material_code", table_name="material_order_forecasts")
    op.drop_index("idx_mof_target_month", table_name="material_order_forecasts")
    op.drop_table("material_order_forecasts")

    # layer_code_mappings ビュー削除 → テーブル復元
    op.execute("DROP VIEW IF EXISTS layer_code_mappings")
    op.create_table(
        "layer_code_mappings",
        sa.Column("layer_code", sa.String(length=50), primary_key=True),
        sa.Column("maker_name", sa.String(length=100), nullable=False),
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
    )
    op.create_index("idx_layer_code_mappings_maker", "layer_code_mappings", ["maker_name"])

    # makers から layer_code_mappings へデータ戻し
    op.execute(
        """
        INSERT INTO layer_code_mappings (layer_code, maker_name, created_at, updated_at)
        SELECT maker_code, maker_name, created_at, updated_at FROM makers
        ON CONFLICT (layer_code) DO NOTHING
        """
    )

    # makers テーブル削除
    op.drop_index("idx_makers_valid_to", table_name="makers")
    op.drop_table("makers")
