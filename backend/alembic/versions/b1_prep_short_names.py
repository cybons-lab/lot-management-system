"""Phase 1: B-Plan preparation - Add short_name and withdrawal extensions.

Non-destructive schema changes:
- Add short_name to suppliers, customers, warehouses
- Add due_date (required) and planned_ship_date (optional) to withdrawals
- Populate initial values for due_date from ship_date

Revision ID: b1_prep_short_names
Revises: fe8a7a830d22
Create Date: 2026-01-15
"""

import sqlalchemy as sa

from alembic import op


# revision identifiers, used by Alembic.
revision = "b1_prep_short_names"
down_revision = "29360a34fdee"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ============================================================
    # 1. Add short_name to master tables
    # ============================================================
    op.add_column(
        "suppliers",
        sa.Column(
            "short_name",
            sa.String(50),
            nullable=True,
            comment="短縮表示名（UI省スペース用）",
        ),
    )
    op.add_column(
        "customers",
        sa.Column(
            "short_name",
            sa.String(50),
            nullable=True,
            comment="短縮表示名（UI省スペース用）",
        ),
    )
    op.add_column(
        "warehouses",
        sa.Column(
            "short_name",
            sa.String(50),
            nullable=True,
            comment="短縮表示名（UI省スペース用）",
        ),
    )

    # Populate initial short_name values (first 10 characters)
    op.execute("UPDATE suppliers SET short_name = LEFT(supplier_name, 10) WHERE short_name IS NULL")
    op.execute("UPDATE customers SET short_name = LEFT(customer_name, 10) WHERE short_name IS NULL")
    op.execute(
        "UPDATE warehouses SET short_name = LEFT(warehouse_name, 10) WHERE short_name IS NULL"
    )

    # ============================================================
    # 2. Add due_date and planned_ship_date to withdrawals
    # ============================================================
    op.add_column(
        "withdrawals",
        sa.Column(
            "due_date",
            sa.Date(),
            nullable=True,  # Initially nullable for data migration
            comment="納期（必須）",
        ),
    )
    op.add_column(
        "withdrawals",
        sa.Column(
            "planned_ship_date",
            sa.Date(),
            nullable=True,
            comment="予定出荷日（任意、LT計算用）",
        ),
    )

    # Populate due_date from ship_date for existing data
    op.execute("UPDATE withdrawals SET due_date = ship_date WHERE due_date IS NULL")

    # Make due_date NOT NULL after data migration
    op.alter_column("withdrawals", "due_date", nullable=False)

    # Create index for due_date (calendar queries)
    op.create_index("idx_withdrawals_due_date", "withdrawals", ["due_date"])


def downgrade() -> None:
    # Remove indexes
    op.drop_index("idx_withdrawals_due_date", table_name="withdrawals")

    # Remove columns from withdrawals
    op.drop_column("withdrawals", "planned_ship_date")
    op.drop_column("withdrawals", "due_date")

    # Remove short_name from master tables
    op.drop_column("warehouses", "short_name")
    op.drop_column("customers", "short_name")
    op.drop_column("suppliers", "short_name")
