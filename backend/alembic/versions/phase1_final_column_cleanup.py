"""Phase 1 final cleanup: unify column names to supplier_item_id.

Rename remaining product_id / product_group_id columns to supplier_item_id
for schema consistency across all tables.

Affected tables:
  - forecast_history: product_id → supplier_item_id
  - order_groups: product_group_id → supplier_item_id
  - product_mappings: product_group_id → supplier_item_id

Revision ID: phase1_final_cleanup
Revises: 3b2e9d3f0a1c
Create Date: 2026-02-06
"""

from alembic import op


revision = "phase1_final_cleanup"
down_revision = "3b2e9d3f0a1c"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Rename legacy columns to supplier_item_id."""
    # ── forecast_history ──
    # Column: product_id → supplier_item_id
    op.alter_column("forecast_history", "product_id", new_column_name="supplier_item_id")

    # Index: drop old, create new (composite index includes renamed column)
    op.drop_index("ix_forecast_history_key", table_name="forecast_history")
    op.create_index(
        "ix_forecast_history_key",
        "forecast_history",
        ["customer_id", "delivery_place_id", "supplier_item_id"],
    )

    # ── order_groups ──
    # Column: product_group_id → supplier_item_id
    op.alter_column("order_groups", "product_group_id", new_column_name="supplier_item_id")

    # FK constraint rename
    op.execute(
        "ALTER TABLE order_groups "
        "RENAME CONSTRAINT order_groups_product_group_id_fkey "
        "TO order_groups_supplier_item_id_fkey"
    )

    # Unique constraint: drop old (includes renamed column), create new
    op.drop_constraint("uq_order_groups_business_key", "order_groups", type_="unique")
    op.create_unique_constraint(
        "uq_order_groups_business_key",
        "order_groups",
        ["customer_id", "supplier_item_id", "order_date"],
    )

    # Indexes: drop old product index, create new supplier_item index
    op.drop_index("idx_order_groups_product", table_name="order_groups")
    op.create_index("idx_order_groups_supplier_item", "order_groups", ["supplier_item_id"])

    # ── product_mappings ──
    # Column: product_group_id → supplier_item_id
    op.alter_column("product_mappings", "product_group_id", new_column_name="supplier_item_id")

    # FK constraint rename
    op.execute(
        "ALTER TABLE product_mappings "
        "RENAME CONSTRAINT product_mappings_product_group_id_fkey "
        "TO product_mappings_supplier_item_id_fkey"
    )

    # Index: drop old product index, create new supplier_item index
    op.drop_index("idx_product_mappings_product", table_name="product_mappings")
    op.create_index("idx_product_mappings_supplier_item", "product_mappings", ["supplier_item_id"])


def downgrade() -> None:
    """Revert column names to product_id / product_group_id."""
    # ── product_mappings ──
    op.drop_index("idx_product_mappings_supplier_item", table_name="product_mappings")
    op.create_index("idx_product_mappings_product", "product_mappings", ["supplier_item_id"])
    op.execute(
        "ALTER TABLE product_mappings "
        "RENAME CONSTRAINT product_mappings_supplier_item_id_fkey "
        "TO product_mappings_product_group_id_fkey"
    )
    op.alter_column("product_mappings", "supplier_item_id", new_column_name="product_group_id")

    # ── order_groups ──
    op.drop_index("idx_order_groups_supplier_item", table_name="order_groups")
    op.create_index("idx_order_groups_product", "order_groups", ["supplier_item_id"])
    op.drop_constraint("uq_order_groups_business_key", "order_groups", type_="unique")
    op.create_unique_constraint(
        "uq_order_groups_business_key",
        "order_groups",
        ["customer_id", "supplier_item_id", "order_date"],
    )
    op.execute(
        "ALTER TABLE order_groups "
        "RENAME CONSTRAINT order_groups_supplier_item_id_fkey "
        "TO order_groups_product_group_id_fkey"
    )
    op.alter_column("order_groups", "supplier_item_id", new_column_name="product_group_id")

    # ── forecast_history ──
    op.drop_index("ix_forecast_history_key", table_name="forecast_history")
    op.create_index(
        "ix_forecast_history_key",
        "forecast_history",
        ["customer_id", "delivery_place_id", "supplier_item_id"],
    )
    op.alter_column("forecast_history", "supplier_item_id", new_column_name="product_id")
