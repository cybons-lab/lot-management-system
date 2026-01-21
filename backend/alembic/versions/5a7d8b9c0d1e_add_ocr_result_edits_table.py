"""Add ocr_result_edits table and refresh v_ocr_results view.

Revision ID: 5a7d8b9c0d1e
Revises: 40516792d7f0
Create Date: 2026-02-01
"""

from pathlib import Path

import sqlalchemy as sa

from alembic import op


# revision identifiers, used by Alembic.
revision = "5a7d8b9c0d1e"
down_revision = "40516792d7f0"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create ocr_result_edits table and recreate views."""
    op.create_table(
        "ocr_result_edits",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column(
            "smartread_long_data_id",
            sa.BigInteger(),
            sa.ForeignKey("smartread_long_data.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("lot_no_1", sa.String(length=100), nullable=True),
        sa.Column("quantity_1", sa.String(length=50), nullable=True),
        sa.Column("lot_no_2", sa.String(length=100), nullable=True),
        sa.Column("quantity_2", sa.String(length=50), nullable=True),
        sa.Column("inbound_no", sa.String(length=100), nullable=True),
        sa.Column("shipping_date", sa.Date(), nullable=True),
        sa.Column("shipping_slip_text", sa.Text(), nullable=True),
        sa.Column(
            "shipping_slip_text_edited",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.UniqueConstraint(
            "smartread_long_data_id",
            name="uq_ocr_result_edits_long_data_id",
        ),
    )

    _recreate_views()


def downgrade() -> None:
    """Drop ocr_result_edits table and refresh view."""
    op.execute(sa.text("DROP VIEW IF EXISTS public.v_ocr_results CASCADE"))
    op.drop_table("ocr_result_edits")
    _recreate_views()


def _recreate_views() -> None:
    conn = op.get_bind()

    views_path = Path(__file__).parent.parent.parent / "sql" / "views" / "create_views.sql"
    if not views_path.exists():
        raise FileNotFoundError(f"Views file not found: {views_path}")

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
            conn.execute(sa.text(stmt_clean))
        except Exception as exc:
            if "does not exist" not in str(exc):
                print(f"[add_ocr_result_edits_table] Warning: {exc}")
