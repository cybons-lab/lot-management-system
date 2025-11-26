"""initial_schema

Revision ID: 000000000000
Revises:
Create Date: 2025-11-26 00:00:00.000000

"""

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op


# revision identifiers, used by Alembic.
revision = "000000000000"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Users
    op.create_table(
        "users",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("username", sa.String(length=50), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("display_name", sa.String(length=100), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("last_login_at", sa.DateTime(), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("username"),
        sa.UniqueConstraint("email"),
    )

    # 2. Roles
    op.create_table(
        "roles",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("role_code", sa.String(length=50), nullable=False),
        sa.Column("role_name", sa.String(length=100), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("role_code"),
    )

    # 3. User Roles
    op.create_table(
        "user_roles",
        sa.Column("user_id", sa.BigInteger(), nullable=False),
        sa.Column("role_id", sa.BigInteger(), nullable=False),
        sa.Column(
            "assigned_at",
            sa.DateTime(),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["role_id"],
            ["roles.id"],
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
        ),
        sa.PrimaryKeyConstraint("user_id", "role_id"),
    )

    # 4. Suppliers
    op.create_table(
        "suppliers",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("supplier_code", sa.String(length=50), nullable=False),
        sa.Column("supplier_name", sa.String(length=200), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("supplier_code"),
    )

    # 5. Products
    op.create_table(
        "products",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("maker_part_code", sa.String(length=100), nullable=False),
        sa.Column("product_name", sa.String(length=200), nullable=False),
        sa.Column("base_unit", sa.String(length=20), nullable=False),
        sa.Column("internal_unit", sa.String(length=20), nullable=True),
        sa.Column("external_unit", sa.String(length=20), nullable=True),
        sa.Column("qty_per_internal_unit", sa.Numeric(precision=15, scale=3), nullable=True),
        sa.Column("consumption_limit_days", sa.Integer(), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("maker_part_code"),
    )

    # 6. Customers
    op.create_table(
        "customers",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("customer_code", sa.String(length=50), nullable=False),
        sa.Column("customer_name", sa.String(length=200), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("customer_code"),
    )

    # 7. Delivery Places
    op.create_table(
        "delivery_places",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("jiku_code", sa.String(length=50), nullable=True),
        sa.Column("delivery_place_code", sa.String(length=50), nullable=False),
        sa.Column("delivery_place_name", sa.String(length=200), nullable=False),
        sa.Column("customer_id", sa.BigInteger(), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False
        ),
        sa.ForeignKeyConstraint(
            ["customer_id"],
            ["customers.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("delivery_place_code"),
    )

    # 8. Warehouses
    op.create_table(
        "warehouses",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("warehouse_code", sa.String(length=50), nullable=False),
        sa.Column("warehouse_name", sa.String(length=200), nullable=False),
        sa.Column("warehouse_type", sa.String(length=20), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False
        ),
        sa.CheckConstraint(
            "warehouse_type IN ('internal', 'external', 'supplier')", name="chk_warehouse_type"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("warehouse_code"),
    )

    # 9. System Configs
    op.create_table(
        "system_configs",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("config_key", sa.String(length=100), nullable=False),
        sa.Column("config_value", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("config_key"),
    )

    # 10. Inbound Plans
    op.create_table(
        "inbound_plans",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("plan_number", sa.String(length=50), nullable=False),
        sa.Column("supplier_id", sa.BigInteger(), nullable=False),
        sa.Column("planned_arrival_date", sa.Date(), nullable=False),
        sa.Column("status", sa.String(length=20), server_default="planned", nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False
        ),
        sa.CheckConstraint(
            "status IN ('planned', 'partially_received', 'received', 'cancelled')",
            name="chk_inbound_plans_status",
        ),
        sa.ForeignKeyConstraint(
            ["supplier_id"],
            ["suppliers.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("plan_number"),
    )

    # 11. Inbound Plan Lines
    op.create_table(
        "inbound_plan_lines",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("inbound_plan_id", sa.BigInteger(), nullable=False),
        sa.Column("product_id", sa.BigInteger(), nullable=False),
        sa.Column("planned_quantity", sa.Numeric(precision=15, scale=3), nullable=False),
        sa.Column("unit", sa.String(length=20), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False
        ),
        sa.ForeignKeyConstraint(
            ["inbound_plan_id"],
            ["inbound_plans.id"],
        ),
        sa.ForeignKeyConstraint(
            ["product_id"],
            ["products.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    # 12. Expected Lots
    op.create_table(
        "expected_lots",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("inbound_plan_line_id", sa.BigInteger(), nullable=False),
        sa.Column("expected_lot_number", sa.String(length=100), nullable=True),
        sa.Column("expected_quantity", sa.Numeric(precision=15, scale=3), nullable=False),
        sa.Column("expected_expiry_date", sa.Date(), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False
        ),
        sa.ForeignKeyConstraint(
            ["inbound_plan_line_id"],
            ["inbound_plan_lines.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    # 13. Lots
    op.create_table(
        "lots",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("lot_number", sa.String(length=100), nullable=False),
        sa.Column("product_id", sa.BigInteger(), nullable=False),
        sa.Column("warehouse_id", sa.BigInteger(), nullable=False),
        sa.Column("supplier_id", sa.BigInteger(), nullable=True),
        sa.Column("expected_lot_id", sa.BigInteger(), nullable=True),
        sa.Column("received_date", sa.Date(), nullable=False),
        sa.Column("expiry_date", sa.Date(), nullable=True),
        sa.Column(
            "current_quantity",
            sa.Numeric(precision=15, scale=3),
            server_default="0",
            nullable=False,
        ),
        sa.Column(
            "allocated_quantity",
            sa.Numeric(precision=15, scale=3),
            server_default="0",
            nullable=False,
        ),
        sa.Column("unit", sa.String(length=20), nullable=False),
        sa.Column("status", sa.String(length=20), server_default="active", nullable=False),
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False
        ),
        sa.Column("version_id", sa.Integer(), server_default="1", nullable=False),
        sa.Column("lock_reason", sa.Text(), nullable=True),
        sa.Column(
            "inspection_status", sa.String(length=20), server_default="not_required", nullable=False
        ),
        sa.Column("inspection_date", sa.Date(), nullable=True),
        sa.Column("inspection_cert_number", sa.String(length=100), nullable=True),
        sa.CheckConstraint("allocated_quantity >= 0", name="chk_lots_allocated_quantity"),
        sa.CheckConstraint(
            "allocated_quantity <= current_quantity", name="chk_lots_allocation_limit"
        ),
        sa.CheckConstraint("current_quantity >= 0", name="chk_lots_current_quantity"),
        sa.CheckConstraint(
            "status IN ('active', 'depleted', 'expired', 'quarantine', 'locked')",
            name="chk_lots_status",
        ),
        sa.CheckConstraint(
            "inspection_status IN ('not_required', 'pending', 'passed', 'failed')",
            name="chk_lots_inspection_status",
        ),
        sa.ForeignKeyConstraint(
            ["expected_lot_id"],
            ["expected_lots.id"],
        ),
        sa.ForeignKeyConstraint(
            ["product_id"],
            ["products.id"],
        ),
        sa.ForeignKeyConstraint(
            ["supplier_id"],
            ["suppliers.id"],
        ),
        sa.ForeignKeyConstraint(
            ["warehouse_id"],
            ["warehouses.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    # 14. Orders
    op.create_table(
        "orders",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("order_number", sa.String(length=50), nullable=False),
        sa.Column("customer_id", sa.BigInteger(), nullable=False),
        sa.Column("order_date", sa.Date(), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False
        ),
        sa.Column("status", sa.String(length=20), server_default="open", nullable=False),
        sa.ForeignKeyConstraint(
            ["customer_id"],
            ["customers.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("order_number"),
    )

    # 15. Order Lines
    op.create_table(
        "order_lines",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("order_id", sa.BigInteger(), nullable=False),
        sa.Column("product_id", sa.BigInteger(), nullable=False),
        sa.Column("delivery_date", sa.Date(), nullable=False),
        sa.Column("order_quantity", sa.Numeric(precision=15, scale=3), nullable=False),
        sa.Column("unit", sa.String(length=20), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False
        ),
        sa.Column("delivery_place_id", sa.BigInteger(), nullable=False),
        sa.Column("status", sa.String(length=20), server_default="pending", nullable=False),
        sa.Column("version_id", sa.Integer(), server_default="1", nullable=False),
        sa.Column("converted_quantity", sa.Numeric(precision=15, scale=3), nullable=True),
        sa.CheckConstraint(
            "status IN ('pending', 'allocated', 'shipped', 'completed', 'cancelled')",
            name="chk_order_lines_status",
        ),
        sa.ForeignKeyConstraint(
            ["delivery_place_id"],
            ["delivery_places.id"],
        ),
        sa.ForeignKeyConstraint(
            ["order_id"],
            ["orders.id"],
        ),
        sa.ForeignKeyConstraint(
            ["product_id"],
            ["products.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    # 16. Allocations
    op.create_table(
        "allocations",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("order_line_id", sa.BigInteger(), nullable=False),
        sa.Column("lot_id", sa.BigInteger(), nullable=False),
        sa.Column("allocated_quantity", sa.Numeric(precision=15, scale=3), nullable=False),
        sa.Column("status", sa.String(length=20), server_default="allocated", nullable=False),
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False
        ),
        sa.CheckConstraint(
            "status IN ('allocated', 'shipped', 'cancelled')", name="chk_allocations_status"
        ),
        sa.ForeignKeyConstraint(
            ["lot_id"],
            ["lots.id"],
        ),
        sa.ForeignKeyConstraint(
            ["order_line_id"],
            ["order_lines.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    # 17. Forecast Current
    op.create_table(
        "forecast_current",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("customer_id", sa.BigInteger(), nullable=False),
        sa.Column("delivery_place_id", sa.BigInteger(), nullable=False),
        sa.Column("product_id", sa.BigInteger(), nullable=False),
        sa.Column("forecast_date", sa.Date(), nullable=False),
        sa.Column("forecast_quantity", sa.Numeric(), nullable=False),
        sa.Column("unit", sa.String(), nullable=True),
        sa.Column("forecast_period", sa.String(length=7), nullable=False),
        sa.Column("snapshot_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(
            ["customer_id"],
            ["customers.id"],
        ),
        sa.ForeignKeyConstraint(
            ["delivery_place_id"],
            ["delivery_places.id"],
        ),
        sa.ForeignKeyConstraint(
            ["product_id"],
            ["products.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    # 18. Forecast History
    op.create_table(
        "forecast_history",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("customer_id", sa.BigInteger(), nullable=False),
        sa.Column("delivery_place_id", sa.BigInteger(), nullable=False),
        sa.Column("product_id", sa.BigInteger(), nullable=False),
        sa.Column("forecast_date", sa.Date(), nullable=False),
        sa.Column("forecast_quantity", sa.Numeric(), nullable=False),
        sa.Column("unit", sa.String(), nullable=True),
        sa.Column("forecast_period", sa.String(length=7), nullable=False),
        sa.Column("snapshot_at", sa.DateTime(), nullable=False),
        sa.Column("archived_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(
            ["customer_id"],
            ["customers.id"],
        ),
        sa.ForeignKeyConstraint(
            ["delivery_place_id"],
            ["delivery_places.id"],
        ),
        sa.ForeignKeyConstraint(
            ["product_id"],
            ["products.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    # 19. Allocation Suggestions
    op.create_table(
        "allocation_suggestions",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("forecast_line_id", sa.BigInteger(), nullable=False),
        sa.Column("forecast_period", sa.String(length=7), nullable=False),
        sa.Column("lot_id", sa.BigInteger(), nullable=False),
        sa.Column("suggested_quantity", sa.Numeric(precision=15, scale=3), nullable=False),
        sa.Column("allocation_logic", sa.String(length=50), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False
        ),
        sa.ForeignKeyConstraint(
            ["forecast_line_id"],
            ["forecast_current.id"],
        ),
        sa.ForeignKeyConstraint(
            ["lot_id"],
            ["lots.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    # 20. Adjustments
    op.create_table(
        "adjustments",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("lot_id", sa.BigInteger(), nullable=False),
        sa.Column("adjustment_type", sa.String(length=20), nullable=False),
        sa.Column("adjusted_quantity", sa.Numeric(precision=15, scale=3), nullable=False),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column("adjusted_by", sa.BigInteger(), nullable=False),
        sa.Column(
            "adjusted_at",
            sa.DateTime(),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "adjustment_type IN ('physical_count', 'damage', 'loss', 'found', 'other')",
            name="chk_adjustments_type",
        ),
        sa.ForeignKeyConstraint(
            ["adjusted_by"],
            ["users.id"],
        ),
        sa.ForeignKeyConstraint(
            ["lot_id"],
            ["lots.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    # 21. Stock History
    op.create_table(
        "stock_history",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("lot_id", sa.BigInteger(), nullable=False),
        sa.Column("transaction_type", sa.String(length=20), nullable=False),
        sa.Column("quantity_change", sa.Numeric(precision=15, scale=3), nullable=False),
        sa.Column("quantity_after", sa.Numeric(precision=15, scale=3), nullable=False),
        sa.Column("reference_type", sa.String(length=50), nullable=True),
        sa.Column("reference_id", sa.BigInteger(), nullable=True),
        sa.Column(
            "transaction_date",
            sa.DateTime(),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "transaction_type IN ('inbound', 'allocation', 'shipment', 'adjustment', 'return')",
            name="chk_stock_history_type",
        ),
        sa.ForeignKeyConstraint(
            ["lot_id"],
            ["lots.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    # 22. Customer Items
    op.create_table(
        "customer_items",
        sa.Column("customer_id", sa.BigInteger(), nullable=False),
        sa.Column("external_product_code", sa.String(length=100), nullable=False),
        sa.Column("product_id", sa.BigInteger(), nullable=False),
        sa.Column("supplier_id", sa.BigInteger(), nullable=True),
        sa.Column("base_unit", sa.String(length=20), nullable=False),
        sa.Column("pack_unit", sa.String(length=20), nullable=True),
        sa.Column("pack_quantity", sa.Integer(), nullable=True),
        sa.Column("special_instructions", sa.Text(), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False
        ),
        sa.ForeignKeyConstraint(
            ["customer_id"],
            ["customers.id"],
        ),
        sa.ForeignKeyConstraint(
            ["product_id"],
            ["products.id"],
        ),
        sa.ForeignKeyConstraint(
            ["supplier_id"],
            ["suppliers.id"],
        ),
        sa.PrimaryKeyConstraint("customer_id", "external_product_code"),
    )

    # 22-1. Product UOM Conversions
    op.create_table(
        "product_uom_conversions",
        sa.Column("conversion_id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("product_id", sa.BigInteger(), nullable=False),
        sa.Column("external_unit", sa.String(length=20), nullable=False),
        sa.Column("factor", sa.Numeric(precision=15, scale=3), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False
        ),
        sa.ForeignKeyConstraint(
            ["product_id"],
            ["products.id"],
        ),
        sa.PrimaryKeyConstraint("conversion_id"),
    )

    # 22-2. Allocation Traces
    op.create_table(
        "allocation_traces",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("order_line_id", sa.BigInteger(), nullable=False),
        sa.Column("lot_id", sa.BigInteger(), nullable=True),
        sa.Column("score", sa.Numeric(precision=15, scale=6), nullable=True),
        sa.Column("decision", sa.String(length=20), nullable=False),
        sa.Column("reason", sa.String(length=255), nullable=False),
        sa.Column("allocated_qty", sa.Numeric(precision=15, scale=3), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False
        ),
        sa.CheckConstraint(
            "decision IN ('adopted', 'rejected', 'partial')", name="chk_allocation_traces_decision"
        ),
        sa.ForeignKeyConstraint(
            ["order_line_id"],
            ["order_lines.id"],
        ),
        sa.ForeignKeyConstraint(
            ["lot_id"],
            ["lots.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    # 22-3. Seed Snapshots
    op.create_table(
        "seed_snapshots",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("params_json", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("profile_json", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("csv_dir", sa.Text(), nullable=True),
        sa.Column("summary_json", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )

    # 23. Batch Jobs
    op.create_table(
        "batch_jobs",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("job_name", sa.String(length=100), nullable=False),
        sa.Column("job_type", sa.String(length=50), nullable=False),
        sa.Column("status", sa.String(length=20), server_default="pending", nullable=False),
        sa.Column("parameters", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("result_message", sa.Text(), nullable=True),
        sa.Column("started_at", sa.DateTime(), nullable=True),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False
        ),
        sa.CheckConstraint(
            "status IN ('pending', 'running', 'completed', 'failed')", name="chk_batch_jobs_status"
        ),
        sa.CheckConstraint(
            "job_type IN ('allocation_suggestion', 'allocation_finalize', 'inventory_sync', 'data_import', 'report_generation')",
            name="chk_batch_jobs_type",
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    # 24. Business Rules
    op.create_table(
        "business_rules",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("rule_code", sa.String(length=50), nullable=False),
        sa.Column("rule_name", sa.String(length=100), nullable=False),
        sa.Column("rule_type", sa.String(length=50), nullable=False),
        sa.Column("rule_parameters", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False
        ),
        sa.CheckConstraint(
            "rule_type IN ('allocation', 'expiry_warning', 'kanban', 'other')",
            name="chk_business_rules_type",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("rule_code"),
    )

    # 25. Master Change Logs
    op.create_table(
        "master_change_logs",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("table_name", sa.String(length=50), nullable=False),
        sa.Column("record_id", sa.BigInteger(), nullable=False),
        sa.Column("change_type", sa.String(length=20), nullable=False),
        sa.Column("old_values", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("new_values", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("changed_by", sa.BigInteger(), nullable=False),
        sa.Column(
            "changed_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False
        ),
        sa.CheckConstraint(
            "change_type IN ('insert', 'update', 'delete')", name="chk_master_change_logs_type"
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    # 26. Operation Logs
    op.create_table(
        "operation_logs",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.BigInteger(), nullable=True),
        sa.Column("operation_type", sa.String(length=50), nullable=False),
        sa.Column("target_table", sa.String(length=50), nullable=False),
        sa.Column("target_id", sa.BigInteger(), nullable=True),
        sa.Column("changes", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("ip_address", sa.String(length=50), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False
        ),
        sa.CheckConstraint(
            "operation_type IN ('create', 'update', 'delete', 'login', 'logout', 'export')",
            name="chk_operation_logs_type",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    # 27. Views
    # 27. Views
    import os
    from pathlib import Path

    # Get the directory where this migration file is located
    migration_dir = Path(__file__).resolve().parent
    # Navigate up to backend directory (versions -> alembic -> backend)
    # __file__ is inside versions/
    # parents[0] = alembic
    # parents[1] = backend
    backend_dir = migration_dir.parents[1]
    sql_path = backend_dir / "sql" / "views" / "create_views.sql"

    with open(sql_path, encoding="utf-8") as f:
        sql_content = f.read()
        # Split by semicolon and execute each statement
        # This avoids issues with some drivers/dialects not handling multi-statement strings
        statements = sql_content.split(";")
        for statement in statements:
            if statement.strip():
                op.execute(statement)


def downgrade() -> None:
    # Drop views first
    op.execute("DROP VIEW IF EXISTS public.v_lots_with_master CASCADE")
    op.execute("DROP VIEW IF EXISTS public.v_candidate_lots_by_order_line CASCADE")
    op.execute("DROP VIEW IF EXISTS public.v_forecast_order_pairs CASCADE")
    op.execute("DROP VIEW IF EXISTS public.v_delivery_place_code_to_id CASCADE")
    op.execute("DROP VIEW IF EXISTS public.v_customer_code_to_id CASCADE")
    op.execute("DROP VIEW IF EXISTS public.v_order_line_context CASCADE")
    op.execute("DROP VIEW IF EXISTS public.v_lot_available_qty CASCADE")
    op.execute("DROP VIEW IF EXISTS public.v_customer_daily_products CASCADE")
    op.execute("DROP VIEW IF EXISTS public.v_lot_current_stock CASCADE")
    op.execute("DROP VIEW IF EXISTS public.v_product_code_to_id CASCADE")
    op.execute("DROP VIEW IF EXISTS public.v_order_line_details CASCADE")
    op.execute("DROP VIEW IF EXISTS public.v_inventory_summary CASCADE")
    op.execute("DROP VIEW IF EXISTS public.v_lot_details CASCADE")

    op.drop_table("operation_logs")
    op.drop_table("master_change_logs")
    op.drop_table("business_rules")
    op.drop_table("batch_jobs")
    op.drop_table("seed_snapshots")
    op.drop_table("allocation_traces")
    op.drop_table("product_uom_conversions")
    op.drop_table("customer_items")
    op.drop_table("stock_history")
    op.drop_table("adjustments")
    op.drop_table("allocation_suggestions")
    op.drop_table("forecast_history")
    op.drop_table("forecast_current")
    op.drop_table("allocations")
    op.drop_table("order_lines")
    op.drop_table("orders")
    op.drop_table("lots")
    op.drop_table("expected_lots")
    op.drop_table("inbound_plan_lines")
    op.drop_table("inbound_plans")
    op.drop_table("system_configs")
    op.drop_table("warehouses")
    op.drop_table("delivery_places")
    op.drop_table("customers")
    op.drop_table("products")
    op.drop_table("suppliers")
    op.drop_table("user_roles")
    op.drop_table("roles")
    op.drop_table("users")
