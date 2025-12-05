"""add_order_type_and_forecast_id_to_order_lines

Revision ID: a9c8d5e6f7b8
Revises: f2b4ae178242
Create Date: 2025-12-05 00:00:00.000000

"""

import sqlalchemy as sa

from alembic import op


# revision identifiers, used by Alembic.
revision = "a9c8d5e6f7b8"
down_revision = "f2b4ae178242"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add order_type and forecast_id to order_lines for Forecast/Order integration."""
    # 1. Add order_type column (VARCHAR(20) NOT NULL DEFAULT 'ORDER')
    op.add_column(
        "order_lines",
        sa.Column(
            "order_type",
            sa.String(20),
            nullable=False,
            server_default="ORDER",
            comment="需要種別: FORECAST_LINKED / KANBAN / SPOT / ORDER",
        ),
    )

    # 2. Add forecast_id column (BIGINT REFERENCES forecast_current(id) ON DELETE SET NULL)
    op.add_column(
        "order_lines",
        sa.Column(
            "forecast_id",
            sa.BigInteger(),
            nullable=True,
            comment="紐づく予測ID（FORECAST_LINKEDの場合）",
        ),
    )

    # 3. Add foreign key constraint for forecast_id
    op.create_foreign_key(
        "fk_order_lines_forecast",
        "order_lines",
        "forecast_current",
        ["forecast_id"],
        ["id"],
        ondelete="SET NULL",
    )

    # 4. Create index on order_type
    op.create_index(
        "idx_order_lines_order_type",
        "order_lines",
        ["order_type"],
    )

    # 5. Create index on forecast_id
    op.create_index(
        "idx_order_lines_forecast_id",
        "order_lines",
        ["forecast_id"],
    )

    # 6. Create check constraint for order_type
    op.create_check_constraint(
        "chk_order_lines_order_type",
        "order_lines",
        "order_type IN ('FORECAST_LINKED', 'KANBAN', 'SPOT', 'ORDER')",
    )


def downgrade() -> None:
    """Revert order_type and forecast_id changes."""
    # 1. Drop check constraint
    op.drop_constraint("chk_order_lines_order_type", "order_lines", type_="check")

    # 2. Drop indexes
    op.drop_index("idx_order_lines_forecast_id", table_name="order_lines")
    op.drop_index("idx_order_lines_order_type", table_name="order_lines")

    # 3. Drop foreign key constraint
    op.drop_constraint("fk_order_lines_forecast", "order_lines", type_="foreignkey")

    # 4. Drop columns
    op.drop_column("order_lines", "forecast_id")
    op.drop_column("order_lines", "order_type")
