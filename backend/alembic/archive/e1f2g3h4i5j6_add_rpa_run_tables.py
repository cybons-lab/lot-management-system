"""add rpa_runs and rpa_run_items tables

Revision ID: e1f2g3h4i5j6
Revises: d4e5f6g7h8i9
Create Date: 2025-12-17 20:20:00.000000

"""

import sqlalchemy as sa

from alembic import op


# revision identifiers, used by Alembic.
revision = "e1f2g3h4i5j6"
down_revision = "d4e5f6g7h8i9"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create rpa_runs table
    op.create_table(
        "rpa_runs",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column(
            "rpa_type",
            sa.String(length=50),
            server_default="material_delivery_note",
            nullable=False,
        ),
        sa.Column(
            "status",
            sa.String(length=30),
            server_default="draft",
            nullable=False,
        ),
        sa.Column("started_at", sa.DateTime(), nullable=True),
        sa.Column("started_by_user_id", sa.BigInteger(), nullable=True),
        sa.Column("step2_executed_at", sa.DateTime(), nullable=True),
        sa.Column("step2_executed_by_user_id", sa.BigInteger(), nullable=True),
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
            ["started_by_user_id"],
            ["users.id"],
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["step2_executed_by_user_id"],
            ["users.id"],
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.CheckConstraint(
            "status IN ('draft', 'ready_for_step2', 'step2_running', 'done', 'cancelled')",
            name="chk_rpa_runs_status",
        ),
    )
    with op.batch_alter_table("rpa_runs", schema=None) as batch_op:
        batch_op.create_index("idx_rpa_runs_type", ["rpa_type"], unique=False)
        batch_op.create_index("idx_rpa_runs_status", ["status"], unique=False)
        batch_op.create_index("idx_rpa_runs_created_at", ["created_at"], unique=False)

    # Create rpa_run_items table
    op.create_table(
        "rpa_run_items",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("run_id", sa.BigInteger(), nullable=False),
        sa.Column("row_no", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=50), nullable=True),  # ステータス
        sa.Column("destination", sa.String(length=50), nullable=True),  # 出荷先
        sa.Column("layer_code", sa.String(length=50), nullable=True),  # 層別
        sa.Column("material_code", sa.String(length=50), nullable=True),  # 材質コード
        sa.Column("delivery_date", sa.Date(), nullable=True),  # 納期
        sa.Column("delivery_quantity", sa.Integer(), nullable=True),  # 納入量
        sa.Column("shipping_vehicle", sa.String(length=50), nullable=True),  # 出荷便
        sa.Column(
            "issue_flag", sa.Boolean(), server_default=sa.text("true"), nullable=False
        ),  # 発行
        sa.Column(
            "complete_flag", sa.Boolean(), server_default=sa.text("false"), nullable=False
        ),  # 完了
        sa.Column("match_result", sa.Boolean(), nullable=True),  # 突合結果
        sa.Column("sap_registered", sa.Boolean(), nullable=True),  # SAP登録
        sa.Column("order_no", sa.String(length=100), nullable=True),  # 受発注No
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
            ["run_id"],
            ["rpa_runs.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    with op.batch_alter_table("rpa_run_items", schema=None) as batch_op:
        batch_op.create_index("idx_rpa_run_items_run_id", ["run_id"], unique=False)
        batch_op.create_index("idx_rpa_run_items_run_row", ["run_id", "row_no"], unique=True)


def downgrade() -> None:
    op.drop_table("rpa_run_items")
    op.drop_table("rpa_runs")
