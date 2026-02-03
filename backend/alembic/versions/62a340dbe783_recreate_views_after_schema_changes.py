"""recreate_views_after_schema_changes

Revision ID: 62a340dbe783
Revises: 486eb9ffe359
Create Date: 2026-02-03 23:32:34.662679

ビューの再作成:
- shipping_master_curated のカラム変更に伴い、依存ビューを再作成
- create_views.sql を実行してすべてのビューを再構築
"""

from pathlib import Path

import sqlalchemy as sa

from alembic import op


# revision identifiers, used by Alembic.
revision = "62a340dbe783"
down_revision = "486eb9ffe359"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """ビューの再作成を実行"""
    # SQLファイルのパスを取得
    sql_dir = Path(__file__).parent.parent.parent / "sql" / "views"
    create_views_sql = sql_dir / "create_views.sql"

    # SQLファイルが存在する場合のみ実行
    if create_views_sql.exists():
        sql_content = create_views_sql.read_text(encoding="utf-8")

        # PostgreSQLの接続を取得して、生のSQLを実行
        connection = op.get_bind()

        # 複数のSQL文を分割して実行（CASCADEやCOMMENTを含むため）
        # text()でラップして実行
        from sqlalchemy import text

        connection.execute(text(sql_content))
        connection.commit()
    else:
        # SQLファイルが見つからない場合は警告を出すが、エラーにはしない
        print(f"Warning: {create_views_sql} not found. Skipping view recreation.")


def downgrade() -> None:
    """ダウングレード時は何もしない（ビューは次のマイグレーションで再作成される）"""
    pass
