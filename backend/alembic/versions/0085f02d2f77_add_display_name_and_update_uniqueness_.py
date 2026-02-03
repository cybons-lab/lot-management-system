"""add_display_name_and_update_uniqueness_for_sync

Revision ID: 0085f02d2f77
Revises: 3a0f933dd9bc
Create Date: 2026-02-03 22:22:15.616215

"""

import sqlalchemy as sa

from alembic import op


# revision identifiers, used by Alembic.
revision = "0085f02d2f77"
down_revision = "3a0f933dd9bc"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Add display_name to master tables
    op.add_column("customers", sa.Column("display_name", sa.String(length=200), nullable=True))
    op.add_column("suppliers", sa.Column("display_name", sa.String(length=200), nullable=True))
    op.add_column("warehouses", sa.Column("display_name", sa.String(length=200), nullable=True))

    sa.orm.Session(bind=op.get_bind())
    # Initial data sync: name -> display_name
    op.execute("UPDATE customers SET display_name = customer_name WHERE display_name IS NULL")
    op.execute("UPDATE suppliers SET display_name = supplier_name WHERE display_name IS NULL")
    op.execute("UPDATE warehouses SET display_name = warehouse_name WHERE display_name IS NULL")

    # 2. Modify warehouses.warehouse_type constraint
    # First drop the existing constraint
    op.drop_constraint("chk_warehouse_type", "warehouses", type_="check")
    # Change column to nullable
    op.alter_column(
        "warehouses", "warehouse_type", existing_type=sa.String(length=20), nullable=True
    )
    # Re-add constraint with NULL allowed
    op.create_check_constraint(
        "chk_warehouse_type",
        "warehouses",
        "warehouse_type IS NULL OR warehouse_type IN ('internal', 'external', 'supplier')",
    )

    # 3. Update delivery_places uniqueness constraint
    # Drop old global unique constraint
    op.drop_constraint("uq_delivery_places_code", "delivery_places", type_="unique")
    # Add new composite unique constraint (jiku_code, delivery_place_code)
    op.create_unique_constraint(
        "uq_delivery_places_jiku_code", "delivery_places", ["jiku_code", "delivery_place_code"]
    )


def downgrade() -> None:
    # 3. Revert delivery_places uniqueness constraint
    op.drop_constraint("uq_delivery_places_jiku_code", "delivery_places", type_="unique")
    op.create_unique_constraint(
        "uq_delivery_places_code", "delivery_places", ["delivery_place_code"]
    )

    # 2. Revert warehouses.warehouse_type constraint
    op.drop_constraint("chk_warehouse_type", "warehouses", type_="check")
    # Since we can't easily revert NULLs if they were added, we might need a default or just keep it nullable in downgrade
    # but the original was NOT NULL. For safety, we keep it as it is or set a default.
    op.execute("UPDATE warehouses SET warehouse_type = 'internal' WHERE warehouse_type IS NULL")
    op.alter_column(
        "warehouses", "warehouse_type", existing_type=sa.String(length=20), nullable=False
    )
    op.create_check_constraint(
        "chk_warehouse_type", "warehouses", "warehouse_type IN ('internal', 'external', 'supplier')"
    )

    # 1. Remove display_name
    op.drop_column("warehouses", "display_name")
    op.drop_column("suppliers", "display_name")
    op.drop_column("customers", "display_name")
