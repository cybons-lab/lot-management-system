"""Add temporary_lot_key to lots table

Revision ID: a1b2c3d4e5f6
Revises: e68cf68f7f45
Create Date: 2025-12-13 11:40:00.000000

仮入庫対応: lot_number が未確定のまま入庫登録する際に使用する UUID キー。
- temporary_lot_key: UUID 型、nullable、UNIQUE 制約
- 仮入庫時のみ値が入り、正式ロット番号確定後も識別子として残す
"""

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op


# revision identifiers, used by Alembic.
revision = "a1b2c3d4e5f6"
down_revision = "20241211_soft_delete_views"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add temporary_lot_key column to lots table."""
    # Add temporary_lot_key column (UUID, nullable, unique)
    op.add_column(
        "lots",
        sa.Column(
            "temporary_lot_key",
            postgresql.UUID(as_uuid=True),
            nullable=True,
            comment="仮入庫時の一意識別キー（UUID）。正式ロット番号確定後も監査用に残す",
        ),
    )

    # Add unique constraint
    op.create_unique_constraint(
        "uq_lots_temporary_lot_key",
        "lots",
        ["temporary_lot_key"],
    )

    # Add index for faster lookup
    op.create_index(
        "idx_lots_temporary_lot_key",
        "lots",
        ["temporary_lot_key"],
        postgresql_where=sa.text("temporary_lot_key IS NOT NULL"),
    )


def downgrade() -> None:
    """Remove temporary_lot_key column from lots table."""
    op.drop_index("idx_lots_temporary_lot_key", table_name="lots")
    op.drop_constraint("uq_lots_temporary_lot_key", "lots", type_="unique")
    op.drop_column("lots", "temporary_lot_key")
