"""phase2_views_customer_part_no

Phase 2-1: 在庫ページ先方品番表示ルール対応
- v_lot_details ビューに supplier_item_id, customer_part_no, mapping_status 追加
- 未マッピングブロック用のステータス情報

Revision ID: e51f979ad44d
Revises: 6e445ed948cf
Create Date: 2026-01-25 15:07:37.802491

"""

from pathlib import Path

from alembic import op


# revision identifiers, used by Alembic.
revision = "e51f979ad44d"
down_revision = "6e445ed948cf"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Phase 2-1: ビューの再作成（create_views.sqlを実行）."""
    views_sql_path = Path(__file__).parent.parent.parent / "sql" / "views" / "create_views.sql"
    if views_sql_path.exists():
        with open(views_sql_path) as f:
            views_sql = f.read()
            op.execute(views_sql)


def downgrade() -> None:
    """Downgrade: ビューの再作成（旧バージョンは create_views.sql で管理）.

    Note: 旧バージョンのビュー定義は履歴管理されていないため、
    最新の create_views.sql を再適用する形でダウングレードする。
    実運用ではビュー履歴を別途管理することを推奨。
    """
    views_sql_path = Path(__file__).parent.parent.parent / "sql" / "views" / "create_views.sql"
    if views_sql_path.exists():
        with open(views_sql_path) as f:
            views_sql = f.read()
            op.execute(views_sql)
