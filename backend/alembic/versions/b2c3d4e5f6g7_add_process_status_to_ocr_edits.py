"""add_process_status_to_ocr_edits

Revision ID: b2c3d4e5f6g7
Revises: a1b2c3d4e5f6
Create Date: 2026-01-26

OCR結果編集テーブルに処理ステータスカラムを追加。
ステータス値:
- pending: 処理前
- downloaded: ダウンロード済み
- sap_linked: SAP連携後（受注Noなし）
- completed: 完了（受注番号登録後）
"""

import sqlalchemy as sa

from alembic import op


# revision identifiers, used by Alembic.
revision = "b2c3d4e5f6g7"
down_revision = "7469e861ca23"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add process_status column to ocr_result_edits table."""
    op.add_column(
        "ocr_result_edits",
        sa.Column(
            "process_status",
            sa.String(20),
            nullable=False,
            server_default="pending",
        ),
    )
    # コメント追加
    op.execute(
        "COMMENT ON COLUMN ocr_result_edits.process_status IS "
        "'処理ステータス: pending(処理前), downloaded(ダウンロード済み), "
        "sap_linked(SAP連携後), completed(完了)'"
    )


def downgrade() -> None:
    """Remove process_status column from ocr_result_edits table."""
    op.drop_column("ocr_result_edits", "process_status")
