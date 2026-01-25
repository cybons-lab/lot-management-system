"""rename_order_lines_external_product_code_to_customer_part_no

Revision ID: 0b86a5a7236d
Revises: 7c11d91ddeab
Create Date: 2026-01-25 18:49:46.484630

"""

import sqlalchemy as sa

from alembic import op


# revision identifiers, used by Alembic.
revision = "0b86a5a7236d"
down_revision = "7c11d91ddeab"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Rename column external_product_code -> customer_part_no in order_lines
    # Idempotent check: only rename if old column exists and new one doesn't
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [c["name"] for c in inspector.get_columns("order_lines")]

    if "external_product_code" in columns and "customer_part_no" not in columns:
        op.alter_column("order_lines", "external_product_code", new_column_name="customer_part_no")

    # 2. Apply Views (SSOT)
    # create_views.sql contains DROP VIEW CASCADE logic, so it handles dependencies
    import os
    from pathlib import Path

    # Assuming this script is in backend/alembic/versions/
    # We need to reach backend/sql/views/create_views.sql
    base_dir = Path(__file__).resolve().parents[2]
    sql_path = base_dir / "sql" / "views" / "create_views.sql"

    if not sql_path.exists():
        raise FileNotFoundError(f"Views SQL not found at {sql_path}")

    sql_content = sql_path.read_text(encoding="utf-8")
    op.execute(sql_content)


def downgrade() -> None:
    # 1. Revert column rename
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [c["name"] for c in inspector.get_columns("order_lines")]

    if "customer_part_no" in columns and "external_product_code" not in columns:
        op.alter_column("order_lines", "customer_part_no", new_column_name="external_product_code")

    # 2. Re-apply views (to ensure consistency, though views don't depend on this column explicitly yet)
    import os
    from pathlib import Path

    base_dir = Path(__file__).resolve().parents[2]
    sql_path = base_dir / "sql" / "views" / "create_views.sql"

    if sql_path.exists():
        sql_content = sql_path.read_text(encoding="utf-8")
        op.execute(sql_content)
