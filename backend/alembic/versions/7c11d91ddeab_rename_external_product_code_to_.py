"""rename_external_product_code_to_customer_part_no

Revision ID: 7c11d91ddeab
Revises: e51f979ad44d
Create Date: 2026-01-25 18:33:46.521123

"""

from pathlib import Path

import sqlalchemy as sa

from alembic import op


# revision identifiers, used by Alembic.
revision = "7c11d91ddeab"
down_revision = "e51f979ad44d"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Rename column
    op.alter_column(
        "order_lines",
        "external_product_code",
        new_column_name="customer_part_no",
        existing_type=sa.String(length=100),
        existing_nullable=True,
        existing_comment="OCR元の先方品番（変換前の生データ）",
    )

    # Refresh views (SSOT)
    sql_path = Path(__file__).resolve().parents[2] / "sql" / "views" / "create_views.sql"
    op.execute(sql_path.read_text(encoding="utf-8"))


def downgrade() -> None:
    # Rename column back
    op.alter_column(
        "order_lines",
        "customer_part_no",
        new_column_name="external_product_code",
        existing_type=sa.String(length=100),
        existing_nullable=True,
        existing_comment="OCR元の先方品番（変換前の生データ）",
    )

    # Refresh views
    sql_path = Path(__file__).resolve().parents[2] / "sql" / "views" / "create_views.sql"
    op.execute(sql_path.read_text(encoding="utf-8"))
