"""Migrate allocations from lot_reference to lot_id FK

Revision ID: b2c3d4e5f6g7
Revises: a1b2c3d4e5f6
Create Date: 2025-12-13 12:00:00.000000

P1修正: allocations テーブルを lot_reference (VARCHAR) から lot_id (FK) に移行。
- lot_id カラム追加
- 既存データを lot_number で照合して lot_id に変換
- lot_reference カラム削除
- lot_id に FK 制約とインデックス追加
"""

import sqlalchemy as sa

from alembic import op


# revision identifiers, used by Alembic.
revision = "b2c3d4e5f6g7"
down_revision = "a1b2c3d4e5f6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Migrate from lot_reference to lot_id."""
    # Step 1: Add lot_id column (nullable initially)
    op.add_column(
        "allocations",
        sa.Column("lot_id", sa.BigInteger(), nullable=True),
    )

    # Step 2: Migrate existing data (lot_reference -> lot_id via lots.lot_number)
    # This updates allocations.lot_id based on matching lot_number
    op.execute(
        """
        UPDATE allocations a
        SET lot_id = l.id
        FROM lots l
        WHERE a.lot_reference = l.lot_number
          AND a.lot_reference IS NOT NULL
        """
    )

    # Step 3: Drop the old lot_reference column and its index
    op.drop_index("idx_allocations_lot_reference", table_name="allocations")
    op.drop_column("allocations", "lot_reference")

    # Step 4: Add FK constraint and index for lot_id
    # Note: lot_id remains nullable for allocations that may not have a lot yet
    op.create_foreign_key(
        "fk_allocations_lot_id",
        "allocations",
        "lots",
        ["lot_id"],
        ["id"],
        ondelete="RESTRICT",
    )
    op.create_index("idx_allocations_lot_id", "allocations", ["lot_id"])


def downgrade() -> None:
    """Revert from lot_id to lot_reference."""
    # Step 1: Add lot_reference column back
    op.add_column(
        "allocations",
        sa.Column(
            "lot_reference",
            sa.String(100),
            nullable=True,
            comment="Lot number (business key reference)",
        ),
    )

    # Step 2: Migrate data back (lot_id -> lot_reference via lots.lot_number)
    op.execute(
        """
        UPDATE allocations a
        SET lot_reference = l.lot_number
        FROM lots l
        WHERE a.lot_id = l.id
          AND a.lot_id IS NOT NULL
        """
    )

    # Step 3: Drop lot_id FK constraint and index
    op.drop_index("idx_allocations_lot_id", table_name="allocations")
    op.drop_constraint("fk_allocations_lot_id", "allocations", type_="foreignkey")

    # Step 4: Drop lot_id column and recreate lot_reference index
    op.drop_column("allocations", "lot_id")
    op.create_index("idx_allocations_lot_reference", "allocations", ["lot_reference"])
