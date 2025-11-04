"""add audit columns to tables

Revision ID: 7f5c6f4e5b15
Revises: 59a2122108a3
Create Date: 2025-11-03 00:00:00
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "7f5c6f4e5b15"
down_revision = "59a2122108a3"
branch_labels = None
depends_on = None


AUDIT_TABLES = [
    "products",
    "customers",
    "suppliers",
    "warehouses",
    "orders",
    "order_lines",
    "lots",
    "allocations",
    "forecast",
    "warehouse",
    "order_line_warehouse_allocation",
    "receipt_headers",
    "receipt_lines",
    "purchase_requests",
    "shipping",
    "stock_movements",
    "lot_current_stock",
    "product_uom_conversions",
    "ocr_submissions",
    "sap_sync_logs",
    "expiry_rules",
]


def _add_column(batch_op, name, column_factory):
    column = column_factory()
    batch_op.add_column(column)


def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    for table_name in AUDIT_TABLES:
        existing = {col["name"] for col in inspector.get_columns(table_name)}
        try:
            with op.batch_alter_table(table_name) as batch_op:
                if "created_at" not in existing:
                    _add_column(
                        batch_op,
                        "created_at",
                        lambda: sa.Column(
                            "created_at",
                            sa.DateTime(),
                            nullable=False,
                            server_default=sa.func.now(),
                        ),
                    )
                if "updated_at" not in existing:
                    _add_column(
                        batch_op,
                        "updated_at",
                        lambda: sa.Column(
                            "updated_at",
                            sa.DateTime(),
                            nullable=False,
                            server_default=sa.func.now(),
                        ),
                    )
                if "created_by" not in existing:
                    _add_column(
                        batch_op,
                        "created_by",
                        lambda: sa.Column("created_by", sa.String(length=50), nullable=True),
                    )
                if "updated_by" not in existing:
                    _add_column(
                        batch_op,
                        "updated_by",
                        lambda: sa.Column("updated_by", sa.String(length=50), nullable=True),
                    )
                if "deleted_at" not in existing:
                    _add_column(
                        batch_op,
                        "deleted_at",
                        lambda: sa.Column("deleted_at", sa.DateTime(), nullable=True),
                    )
                if "revision" not in existing:
                    _add_column(
                        batch_op,
                        "revision",
                        lambda: sa.Column(
                            "revision",
                            sa.Integer(),
                            nullable=False,
                            server_default="1",
                        ),
                    )
        except sa.exc.NoSuchTableError:
            continue


def downgrade():
    for table_name in AUDIT_TABLES:
        with op.batch_alter_table(table_name) as batch_op:
            for column_name in [
                "revision",
                "deleted_at",
                "updated_by",
                "created_by",
                "updated_at",
                "created_at",
            ]:
                try:
                    batch_op.drop_column(column_name)
                except sa.exc.OperationalError:
                    # SQLite may raise if column is missing; ignore gracefully
                    pass
