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
    """Phase 2-1: ビューの再作成（create_views.sqlを実行）.

    SSOT: backend/sql/views/create_views.sql
    ビュー定義はcreate_views.sqlで一元管理。migrationはそれを実行するのみ。
    """
    # backend/alembic/versions/xxxx.py -> backend/sql/views/create_views.sql
    current_dir = Path(__file__).resolve().parent
    sql_path = current_dir.parent.parent / "sql" / "views" / "create_views.sql"

    with open(sql_path, encoding="utf-8") as f:
        sql_content = f.read()

    op.execute(sql_content)


def downgrade() -> None:
    """Downgrade: ビューの再適用.

    Note: ビュー定義はcreate_views.sqlで一元管理（SSOT）。
    downgradeでも最新定義を再適用する。真にrollbackしたい場合は
    旧バージョンのcreate_views.sqlをgit checkoutして適用する。
    """
    # Views update is usually forward-only
    pass
