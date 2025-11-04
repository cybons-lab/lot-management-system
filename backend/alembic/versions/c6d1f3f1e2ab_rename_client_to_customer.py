"""rename client columns to customer in forecasts

Revision ID: c6d1f3f1e2ab
Revises: b4dd2e0b31c8
Create Date: 2025-11-03 01:20:00
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "c6d1f3f1e2ab"
down_revision = "b4dd2e0b31c8"
branch_labels = None
depends_on = None


def _table_exists(inspector, name: str) -> bool:
    return name in inspector.get_table_names()


def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    table_name = "forecast" if _table_exists(inspector, "forecast") else "forecasts"
    if table_name == "forecast":
        op.rename_table("forecast", "forecasts")

    inspector = sa.inspect(bind)
    columns = {col["name"] for col in inspector.get_columns("forecasts")}
    with op.batch_alter_table("forecasts") as batch_op:
        if "client_id" in columns:
            batch_op.alter_column("client_id", new_column_name="customer_id")
        if "client_code" in columns:
            batch_op.alter_column("client_code", new_column_name="customer_code")

    try:
        op.drop_index("idx_client_product", table_name="forecasts")
    except sa.exc.OperationalError:
        pass
    op.create_index("idx_customer_product", "forecasts", ["customer_id", "product_id"])


def downgrade():
    op.drop_index("idx_customer_product", table_name="forecasts")
    inspector = sa.inspect(op.get_bind())
    columns = {col["name"] for col in inspector.get_columns("forecasts")}
    with op.batch_alter_table("forecasts") as batch_op:
        if "customer_id" in columns:
            batch_op.alter_column("customer_id", new_column_name="client_id")
        if "customer_code" in columns:
            batch_op.alter_column("customer_code", new_column_name="client_code")
    op.create_index("idx_client_product", "forecasts", ["client_id", "product_id"])
    op.rename_table("forecasts", "forecast")
