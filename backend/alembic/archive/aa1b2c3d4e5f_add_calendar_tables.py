"""add calendar tables

Revision ID: aa1b2c3d4e5f
Revises: z4a5b6c7d8e9
Create Date: 2026-01-20 10:00:00.000000

祝日・会社カレンダー・オリジナル配信日カレンダーを追加。
"""

import sqlalchemy as sa

from alembic import op


# revision identifiers, used by Alembic.
revision = "aa1b2c3d4e5f"
down_revision = "z4a5b6c7d8e9"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "holiday_calendars",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("holiday_date", sa.Date(), nullable=False),
        sa.Column("holiday_name", sa.String(length=100), nullable=True),
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
        sa.UniqueConstraint("holiday_date", name="uq_holiday_calendars_date"),
    )
    op.create_index("idx_holiday_calendars_date", "holiday_calendars", ["holiday_date"])

    op.create_table(
        "company_calendars",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("calendar_date", sa.Date(), nullable=False),
        sa.Column("is_workday", sa.Boolean(), nullable=False),
        sa.Column("description", sa.String(length=200), nullable=True),
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
        sa.UniqueConstraint("calendar_date", name="uq_company_calendars_date"),
    )
    op.create_index("idx_company_calendars_date", "company_calendars", ["calendar_date"])
    op.create_index("idx_company_calendars_is_workday", "company_calendars", ["is_workday"])

    op.create_table(
        "original_delivery_calendars",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("delivery_date", sa.Date(), nullable=False),
        sa.Column("description", sa.String(length=200), nullable=True),
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
        sa.UniqueConstraint("delivery_date", name="uq_original_delivery_calendars_date"),
    )
    op.create_index(
        "idx_original_delivery_calendars_date",
        "original_delivery_calendars",
        ["delivery_date"],
    )


def downgrade() -> None:
    op.drop_index("idx_original_delivery_calendars_date", table_name="original_delivery_calendars")
    op.drop_table("original_delivery_calendars")

    op.drop_index("idx_company_calendars_is_workday", table_name="company_calendars")
    op.drop_index("idx_company_calendars_date", table_name="company_calendars")
    op.drop_table("company_calendars")

    op.drop_index("idx_holiday_calendars_date", table_name="holiday_calendars")
    op.drop_table("holiday_calendars")
