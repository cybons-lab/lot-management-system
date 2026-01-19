"""Add customer_id to rpa_runs and rename rpa_run_items columns.

Revision ID: i4j5k6l7m8n9
Revises: h3i4j5k6l7m8
Create Date: 2025-12-21

Changes:
    - rpa_runs: Add customer_id column (FK to customers.id)
    - rpa_run_items: Rename destination -> jiku_code
    - rpa_run_items: Rename material_code -> external_product_code
"""

import sqlalchemy as sa

from alembic import op


# revision identifiers, used by Alembic.
revision = "i4j5k6l7m8n9"
down_revision = "h3i4j5k6l7m8"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add customer_id to rpa_runs
    with op.batch_alter_table("rpa_runs") as batch_op:
        batch_op.add_column(sa.Column("customer_id", sa.BigInteger(), nullable=True))
        batch_op.create_foreign_key(
            "fk_rpa_runs_customer_id",
            "customers",
            ["customer_id"],
            ["id"],
            ondelete="SET NULL",
        )
        batch_op.create_index("idx_rpa_runs_customer_id", ["customer_id"])

    # Rename columns in rpa_run_items
    with op.batch_alter_table("rpa_run_items") as batch_op:
        batch_op.alter_column("destination", new_column_name="jiku_code")
        batch_op.alter_column("material_code", new_column_name="external_product_code")


def downgrade() -> None:
    # Revert column renames in rpa_run_items
    with op.batch_alter_table("rpa_run_items") as batch_op:
        batch_op.alter_column("jiku_code", new_column_name="destination")
        batch_op.alter_column("external_product_code", new_column_name="material_code")

    # Remove customer_id from rpa_runs
    with op.batch_alter_table("rpa_runs") as batch_op:
        batch_op.drop_index("idx_rpa_runs_customer_id")
        batch_op.drop_constraint("fk_rpa_runs_customer_id", type_="foreignkey")
        batch_op.drop_column("customer_id")
