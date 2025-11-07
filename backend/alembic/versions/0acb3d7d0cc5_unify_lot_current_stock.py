"""Unify LotCurrentStock quantities"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "0acb3d7d0cc5"
down_revision = "3c7057758764"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_columns = {col["name"] for col in inspector.get_columns("lot_current_stock")}

    has_available = "available_quantity" in existing_columns
    has_physical = "physical_quantity" in existing_columns

    if "current_quantity" not in existing_columns:
        op.add_column(
            "lot_current_stock",
            sa.Column("current_quantity", sa.Float(), nullable=False, server_default="0"),
        )

    if "last_updated" not in existing_columns:
        op.add_column(
            "lot_current_stock",
            sa.Column(
                "last_updated",
                sa.DateTime(),
                nullable=True,
                server_default=sa.text("now()"),
            ),
        )

    if has_available and has_physical:
        op.execute(
            sa.text(
                """
                UPDATE lot_current_stock
                SET current_quantity = COALESCE(available_quantity, physical_quantity, 0),
                    last_updated = CURRENT_TIMESTAMP
                """
            )
        )
    elif has_available:
        op.execute(
            sa.text(
                """
                UPDATE lot_current_stock
                SET current_quantity = COALESCE(available_quantity, 0),
                    last_updated = CURRENT_TIMESTAMP
                """
            )
        )
    elif has_physical:
        op.execute(
            sa.text(
                """
                UPDATE lot_current_stock
                SET current_quantity = COALESCE(physical_quantity, 0),
                    last_updated = CURRENT_TIMESTAMP
                """
            )
        )
    else:
        op.execute(
            sa.text(
                """
                UPDATE lot_current_stock
                SET last_updated = CURRENT_TIMESTAMP
                WHERE last_updated IS NULL
                """
            )
        )

    op.alter_column(
        "lot_current_stock",
        "current_quantity",
        server_default=None,
        existing_type=sa.Float(),
    )

    for legacy_column in (
        "available_quantity",
        "allocated_quantity",
        "physical_quantity",
        "last_movement_id",
    ):
        if legacy_column in existing_columns:
            op.drop_column("lot_current_stock", legacy_column)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_columns = {col["name"] for col in inspector.get_columns("lot_current_stock")}

    if "available_quantity" not in existing_columns:
        op.add_column(
            "lot_current_stock",
            sa.Column("available_quantity", sa.Float(), nullable=False, server_default="0"),
        )
    if "allocated_quantity" not in existing_columns:
        op.add_column(
            "lot_current_stock",
            sa.Column("allocated_quantity", sa.Float(), nullable=False, server_default="0"),
        )
    if "physical_quantity" not in existing_columns:
        op.add_column(
            "lot_current_stock",
            sa.Column("physical_quantity", sa.Float(), nullable=False, server_default="0"),
        )
    if "last_movement_id" not in existing_columns:
        op.add_column(
            "lot_current_stock",
            sa.Column("last_movement_id", sa.Integer(), nullable=True),
        )

    op.execute(
        sa.text(
            """
            UPDATE lot_current_stock
            SET available_quantity = current_quantity,
                physical_quantity = current_quantity,
                allocated_quantity = COALESCE(allocated_quantity, 0)
            """
        )
    )

    refreshed_columns = {col["name"] for col in sa.inspect(bind).get_columns("lot_current_stock")}

    if "last_updated" in refreshed_columns:
        op.drop_column("lot_current_stock", "last_updated")
    if "current_quantity" in refreshed_columns:
        op.drop_column("lot_current_stock", "current_quantity")
