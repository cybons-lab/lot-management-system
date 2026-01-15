"""Phase 3: B-Plan - Rename lots to lot_receipts and add new columns.

Schema changes:
- Rename lots table to lot_receipts
- Rename current_quantity to received_quantity
- Add lot_master_id FK
- Add receipt_key (UUID, NOT NULL, UNIQUE)
- Create withdrawal_lines table
- Drop old unique constraint, add new partial unique indexes
- Add FIFO allocation index

Revision ID: b3_lot_receipts_rename
Revises: b2_lot_master_tables
Create Date: 2026-01-15
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = "b3_lot_receipts_rename"
down_revision = "b2_lot_master_tables"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ============================================================
    # 1. Rename lots table to lot_receipts
    # ============================================================
    op.rename_table("lots", "lot_receipts")

    # Rename sequence
    op.execute("ALTER SEQUENCE lots_id_seq RENAME TO lot_receipts_id_seq")

    # ============================================================
    # 2. Rename current_quantity to received_quantity
    # ============================================================
    op.alter_column(
        "lot_receipts",
        "current_quantity",
        new_column_name="received_quantity",
        comment="入荷数量（初期入荷時の数量）",
    )

    # ============================================================
    # 3. Add new columns to lot_receipts
    # ============================================================
    # lot_master_id FK (nullable initially for data migration)
    op.add_column(
        "lot_receipts",
        sa.Column(
            "lot_master_id",
            sa.BigInteger(),
            nullable=True,
            comment="lot_masterへのFK",
        ),
    )

    # receipt_key (UUID, NOT NULL, UNIQUE)
    op.add_column(
        "lot_receipts",
        sa.Column(
            "receipt_key",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
            comment="入荷識別UUID（重複防止、NOT NULL）",
        ),
    )

    # Add FK constraint for lot_master_id
    op.create_foreign_key(
        "fk_lot_receipts_lot_master_id",
        "lot_receipts",
        "lot_master",
        ["lot_master_id"],
        ["id"],
        ondelete="RESTRICT",
    )

    # Add unique constraint for receipt_key
    op.create_unique_constraint(
        "uq_lot_receipts_receipt_key", "lot_receipts", ["receipt_key"]
    )

    # ============================================================
    # 4. Drop old unique constraint (allow multiple receipts per lot_number)
    # ============================================================
    op.drop_constraint("uq_lots_number_product_warehouse", "lot_receipts", type_="unique")

    # ============================================================
    # 5. Add new indexes
    # ============================================================
    # Partial unique index for expected_lot_id
    op.create_index(
        "uq_lot_receipts_expected_lot",
        "lot_receipts",
        ["expected_lot_id"],
        unique=True,
        postgresql_where=sa.text("expected_lot_id IS NOT NULL"),
    )

    # FIFO allocation index
    op.create_index(
        "idx_lot_receipts_fifo_allocation",
        "lot_receipts",
        ["product_id", "warehouse_id", "status", "received_date", "id"],
        postgresql_where=sa.text(
            "status = 'active' AND inspection_status IN ('not_required', 'passed')"
        ),
    )

    # lot_master × warehouse lookup
    op.create_index(
        "idx_lot_receipts_lot_master_warehouse",
        "lot_receipts",
        ["lot_master_id", "warehouse_id"],
    )

    # ============================================================
    # 6. Create withdrawal_lines table
    # ============================================================
    op.create_table(
        "withdrawal_lines",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("withdrawal_id", sa.BigInteger(), nullable=False),
        sa.Column("lot_receipt_id", sa.BigInteger(), nullable=False),
        sa.Column("quantity", sa.Numeric(15, 3), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["withdrawal_id"],
            ["withdrawals.id"],
            name="fk_withdrawal_lines_withdrawal_id",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["lot_receipt_id"],
            ["lot_receipts.id"],
            name="fk_withdrawal_lines_lot_receipt_id",
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.CheckConstraint("quantity > 0", name="chk_withdrawal_lines_quantity"),
        comment="出庫明細 - どのreceiptから何個出庫したか",
    )

    op.create_index(
        "idx_withdrawal_lines_withdrawal", "withdrawal_lines", ["withdrawal_id"]
    )
    op.create_index(
        "idx_withdrawal_lines_lot_receipt", "withdrawal_lines", ["lot_receipt_id"]
    )
    op.create_index(
        "idx_withdrawal_lines_receipt_date",
        "withdrawal_lines",
        ["lot_receipt_id", "created_at"],
    )

    # ============================================================
    # 7. Make withdrawals.lot_id and quantity nullable (for new workflow)
    # ============================================================
    op.alter_column("withdrawals", "lot_id", nullable=True)
    op.alter_column("withdrawals", "quantity", nullable=True)


def downgrade() -> None:
    # Make withdrawals.lot_id and quantity required again
    op.alter_column("withdrawals", "quantity", nullable=False)
    op.alter_column("withdrawals", "lot_id", nullable=False)

    # Drop withdrawal_lines
    op.drop_index("idx_withdrawal_lines_receipt_date", table_name="withdrawal_lines")
    op.drop_index("idx_withdrawal_lines_lot_receipt", table_name="withdrawal_lines")
    op.drop_index("idx_withdrawal_lines_withdrawal", table_name="withdrawal_lines")
    op.drop_table("withdrawal_lines")

    # Drop new indexes
    op.drop_index("idx_lot_receipts_lot_master_warehouse", table_name="lot_receipts")
    op.drop_index(
        "idx_lot_receipts_fifo_allocation",
        table_name="lot_receipts",
        postgresql_where=sa.text(
            "status = 'active' AND inspection_status IN ('not_required', 'passed')"
        ),
    )
    op.drop_index(
        "uq_lot_receipts_expected_lot",
        table_name="lot_receipts",
        postgresql_where=sa.text("expected_lot_id IS NOT NULL"),
    )

    # Restore old unique constraint
    op.create_unique_constraint(
        "uq_lots_number_product_warehouse",
        "lot_receipts",
        ["lot_number", "product_id", "warehouse_id"],
    )

    # Drop new columns
    op.drop_constraint("uq_lot_receipts_receipt_key", "lot_receipts", type_="unique")
    op.drop_constraint("fk_lot_receipts_lot_master_id", "lot_receipts", type_="foreignkey")
    op.drop_column("lot_receipts", "receipt_key")
    op.drop_column("lot_receipts", "lot_master_id")

    # Rename received_quantity back to current_quantity
    op.alter_column(
        "lot_receipts",
        "received_quantity",
        new_column_name="current_quantity",
    )

    # Rename sequence back
    op.execute("ALTER SEQUENCE lot_receipts_id_seq RENAME TO lots_id_seq")

    # Rename table back
    op.rename_table("lot_receipts", "lots")
