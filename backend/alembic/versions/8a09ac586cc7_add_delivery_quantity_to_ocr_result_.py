"""add_delivery_quantity_to_ocr_result_edits

Revision ID: 8a09ac586cc7
Revises: eaa941fd2224
Create Date: 2026-01-23 09:21:04.684243

"""

from pathlib import Path

import sqlalchemy as sa

from alembic import op


# revision identifiers, used by Alembic.
revision = "8a09ac586cc7"
down_revision = "eaa941fd2224"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add delivery_quantity column to ocr_result_edits
    op.add_column(
        "ocr_result_edits", sa.Column("delivery_quantity", sa.String(length=100), nullable=True)
    )

    _recreate_views()


def downgrade() -> None:
    # Drop view first because it depends on the column (though v_ocr_results doesn't explicitly mention it in definition,
    # but the COALESCE logic we added to create_views.sql does)
    op.execute(sa.text("DROP VIEW IF EXISTS public.v_ocr_results CASCADE"))

    # Remove delivery_quantity column
    op.drop_column("ocr_result_edits", "delivery_quantity")

    # Recreate views (will use the version without oe.delivery_quantity if create_views.sql is reverted,
    # but here we just follow the pattern)
    _recreate_views()


def _recreate_views() -> None:
    conn = op.get_bind()

    # Apply views from canonical source
    views_path = Path(__file__).parent.parent.parent / "sql" / "views" / "create_views.sql"
    if not views_path.exists():
        raise FileNotFoundError(f"Views file not found: {views_path}")

    print(f"[{revision}] Recreating views from create_views.sql...")
    views_sql = views_path.read_text(encoding="utf-8")

    statements = []
    current_stmt = []

    for line in views_sql.splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("--"):
            continue
        current_stmt.append(line)
        if stripped.endswith(";"):
            stmt = "\n".join(current_stmt).strip()
            if stmt and stmt != ";":
                statements.append(stmt)
            current_stmt = []

    for stmt in statements:
        stmt_clean = stmt.rstrip(";").strip()
        if not stmt_clean:
            continue
        try:
            # CASCADE drops might have already removed some views
            conn.execute(sa.text(stmt_clean))
        except Exception as e:
            if "does not exist" not in str(e):
                print(f"[{revision}] Warning: {e}")
