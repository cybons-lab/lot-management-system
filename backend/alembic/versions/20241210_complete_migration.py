"""Complete reservation migration - Drop allocated_quantity and FK references.

Revision ID: 20241210_complete_migration
Revises: 20241210_lot_reservations
Create Date: 2025-12-10

This migration completes the decoupling by:
1. Truncating all affected tables (clean start)
2. Dropping lots.allocated_quantity
3. Replacing allocations.lot_id with lot_reference
4. Replacing order_lines.forecast_id with forecast_reference
"""

import sqlalchemy as sa

from alembic import op


# revision identifiers, used by Alembic.
revision = "20241210_complete_migration"
down_revision = "20241210_lot_reservations"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Complete the reservation migration with breaking changes."""

    # 1. Truncate all affected tables (order matters due to FKs)
    op.execute("TRUNCATE allocations CASCADE")
    op.execute("TRUNCATE lot_reservations CASCADE")
    op.execute("TRUNCATE stock_history CASCADE")
    op.execute("TRUNCATE adjustments CASCADE")
    op.execute("TRUNCATE order_lines CASCADE")
    op.execute("TRUNCATE orders CASCADE")
    op.execute("TRUNCATE lots CASCADE")

    # 2. Drop views that depend on allocated_quantity
    op.execute("DROP VIEW IF EXISTS v_candidate_lots_by_order_line CASCADE")
    op.execute("DROP VIEW IF EXISTS v_lot_available_qty CASCADE")
    op.execute("DROP VIEW IF EXISTS v_inventory_summary CASCADE")
    op.execute("DROP VIEW IF EXISTS v_lot_details CASCADE")

    # 3. Drop lots.allocated_quantity column and related constraints
    # Use raw SQL for conditional dropping
    op.execute("""
        DO $$
        BEGIN
            IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_lots_allocation_limit') THEN
                ALTER TABLE lots DROP CONSTRAINT chk_lots_allocation_limit;
            END IF;
            IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_lots_allocated_quantity') THEN
                ALTER TABLE lots DROP CONSTRAINT chk_lots_allocated_quantity;
            END IF;
        END $$;
    """)
    op.execute("ALTER TABLE lots DROP COLUMN IF EXISTS allocated_quantity")

    # 4. Replace allocations.lot_id with lot_reference
    # Drop index and FK, then column using raw SQL for safety
    op.execute("DROP INDEX IF EXISTS idx_allocations_lot")
    op.execute("""
        DO $$
        DECLARE
            fk_name TEXT;
        BEGIN
            SELECT conname INTO fk_name
            FROM pg_constraint
            WHERE conrelid = 'allocations'::regclass
              AND contype = 'f'
              AND confrelid = 'lots'::regclass;
            IF fk_name IS NOT NULL THEN
                EXECUTE 'ALTER TABLE allocations DROP CONSTRAINT ' || fk_name;
            END IF;
        END $$;
    """)
    op.execute("ALTER TABLE allocations DROP COLUMN IF EXISTS lot_id")
    op.add_column(
        "allocations",
        sa.Column(
            "lot_reference",
            sa.String(100),
            nullable=True,
            comment="Lot number (business key reference)",
        ),
    )
    op.create_index("idx_allocations_lot_reference", "allocations", ["lot_reference"])

    # 5. Replace order_lines.forecast_id with forecast_reference
    op.execute("DROP INDEX IF EXISTS idx_order_lines_forecast_id")
    op.execute("""
        DO $$
        DECLARE
            fk_name TEXT;
        BEGIN
            SELECT conname INTO fk_name
            FROM pg_constraint
            WHERE conrelid = 'order_lines'::regclass
              AND contype = 'f'
              AND confrelid = 'forecast_current'::regclass;
            IF fk_name IS NOT NULL THEN
                EXECUTE 'ALTER TABLE order_lines DROP CONSTRAINT ' || fk_name;
            END IF;
        END $$;
    """)
    op.execute("ALTER TABLE order_lines DROP COLUMN IF EXISTS forecast_id")
    op.add_column(
        "order_lines",
        sa.Column(
            "forecast_reference",
            sa.String(100),
            nullable=True,
            comment="Forecast business key reference",
        ),
    )
    op.create_index(
        "idx_order_lines_forecast_reference",
        "order_lines",
        ["forecast_reference"],
        postgresql_where=sa.text("forecast_reference IS NOT NULL"),
    )


def downgrade() -> None:
    """Revert the migration (restore FK columns)."""

    # Restore order_lines.forecast_id
    op.execute("DROP INDEX IF EXISTS idx_order_lines_forecast_reference")
    op.execute("ALTER TABLE order_lines DROP COLUMN IF EXISTS forecast_reference")
    op.add_column(
        "order_lines",
        sa.Column("forecast_id", sa.BigInteger(), nullable=True),
    )
    op.create_foreign_key(
        "order_lines_forecast_id_fkey",
        "order_lines",
        "forecast_current",
        ["forecast_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("idx_order_lines_forecast_id", "order_lines", ["forecast_id"])

    # Restore allocations.lot_id
    op.execute("DROP INDEX IF EXISTS idx_allocations_lot_reference")
    op.execute("ALTER TABLE allocations DROP COLUMN IF EXISTS lot_reference")
    op.add_column(
        "allocations",
        sa.Column("lot_id", sa.BigInteger(), nullable=True),
    )
    op.create_foreign_key(
        "allocations_lot_id_fkey",
        "allocations",
        "lots",
        ["lot_id"],
        ["id"],
        ondelete="RESTRICT",
    )
    op.create_index("idx_allocations_lot", "allocations", ["lot_id"])

    # Restore lots.allocated_quantity
    op.add_column(
        "lots",
        sa.Column(
            "allocated_quantity",
            sa.Numeric(15, 3),
            nullable=False,
            server_default=sa.text("0"),
        ),
    )
    op.execute("""
        ALTER TABLE lots ADD CONSTRAINT chk_lots_allocated_quantity
            CHECK (allocated_quantity >= 0)
    """)
    op.execute("""
        ALTER TABLE lots ADD CONSTRAINT chk_lots_allocation_limit
            CHECK (allocated_quantity + locked_quantity <= current_quantity)
    """)
