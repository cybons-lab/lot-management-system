"""add_error_flags_and_fix_process_status

Revision ID: e218bf23049b
Revises: a1b2c3d4e5f6
Create Date: 2026-01-26 14:50:34.430192

"""

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

from alembic import op


# revision identifiers, used by Alembic.
revision = "e218bf23049b"
down_revision = "a1b2c3d4e5f6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add process_status if it doesn't exist (fixing inconsistency)
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [c["name"] for c in inspector.get_columns("ocr_result_edits")]

    if "process_status" not in columns:
        op.add_column(
            "ocr_result_edits",
            sa.Column(
                "process_status",
                sa.String(20),
                nullable=False,
                server_default="pending",
            ),
        )
        op.execute(
            "COMMENT ON COLUMN ocr_result_edits.process_status IS "
            "'処理ステータス: pending(処理前), downloaded(ダウンロード済み), sap_linked(SAP連携後), completed(完了)'"
        )

    if "error_flags" not in columns:
        op.add_column(
            "ocr_result_edits",
            sa.Column(
                "error_flags",
                JSONB,
                nullable=False,
                server_default="{}",
            ),
        )
        op.execute(
            "COMMENT ON COLUMN ocr_result_edits.error_flags IS 'バリデーションエラーフラグ（JSON形式）'"
        )


def downgrade() -> None:
    op.drop_column("ocr_result_edits", "error_flags")
    # process_status は以前のマイグレーションで定義されているため、ここでは削除しない（あるいは不整合修復目的なので残す）
