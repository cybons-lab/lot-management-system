"""Add rpa run control tables and columns.

Revision ID: f6b7c8d9e0f1
Revises: add_v_ocr_results_view, e4c1a2b3c4d5
Create Date: 2026-02-10 00:00:00.000000
"""

import sqlalchemy as sa

from alembic import op


# revision identifiers, used by Alembic.
revision = "f6b7c8d9e0f1"
down_revision = ("add_v_ocr_results_view", "e4c1a2b3c4d5")
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "rpa_run_groups",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column(
            "rpa_type",
            sa.String(length=50),
            server_default="material_delivery_note",
            nullable=False,
        ),
        sa.Column("grouping_method", sa.String(length=50), nullable=False),
        sa.Column("max_items_per_run", sa.Integer(), nullable=True),
        sa.Column("planned_run_count", sa.Integer(), nullable=True),
        sa.Column("created_by_user_id", sa.BigInteger(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"], ondelete="SET NULL"),
    )

    op.create_table(
        "rpa_run_events",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("run_id", sa.BigInteger(), nullable=False),
        sa.Column("event_type", sa.String(length=50), nullable=False),
        sa.Column("message", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.Column("created_by_user_id", sa.BigInteger(), nullable=True),
        sa.ForeignKeyConstraint(["run_id"], ["rpa_runs.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"], ondelete="SET NULL"),
    )
    op.create_index("idx_rpa_run_events_run_id", "rpa_run_events", ["run_id"])

    op.create_table(
        "rpa_run_item_attempts",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("run_item_id", sa.BigInteger(), nullable=False),
        sa.Column("attempt_no", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("error_code", sa.String(length=100), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["run_item_id"], ["rpa_run_items.id"], ondelete="CASCADE"),
    )
    op.create_index(
        "idx_rpa_run_item_attempts_run_item_id",
        "rpa_run_item_attempts",
        ["run_item_id"],
    )

    op.add_column("rpa_runs", sa.Column("run_group_id", sa.BigInteger(), nullable=True))
    op.add_column("rpa_runs", sa.Column("progress_percent", sa.Float(), nullable=True))
    op.add_column("rpa_runs", sa.Column("estimated_minutes", sa.Integer(), nullable=True))
    op.add_column("rpa_runs", sa.Column("paused_at", sa.DateTime(), nullable=True))
    op.add_column("rpa_runs", sa.Column("cancelled_at", sa.DateTime(), nullable=True))
    op.create_foreign_key(
        "fk_rpa_runs_run_group_id",
        "rpa_runs",
        "rpa_run_groups",
        ["run_group_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("idx_rpa_runs_group_id", "rpa_runs", ["run_group_id"])


def downgrade() -> None:
    op.drop_index("idx_rpa_runs_group_id", table_name="rpa_runs")
    op.drop_constraint("fk_rpa_runs_run_group_id", "rpa_runs", type_="foreignkey")
    op.drop_column("rpa_runs", "cancelled_at")
    op.drop_column("rpa_runs", "paused_at")
    op.drop_column("rpa_runs", "estimated_minutes")
    op.drop_column("rpa_runs", "progress_percent")
    op.drop_column("rpa_runs", "run_group_id")

    op.drop_index("idx_rpa_run_item_attempts_run_item_id", table_name="rpa_run_item_attempts")
    op.drop_table("rpa_run_item_attempts")

    op.drop_index("idx_rpa_run_events_run_id", table_name="rpa_run_events")
    op.drop_table("rpa_run_events")

    op.drop_table("rpa_run_groups")
