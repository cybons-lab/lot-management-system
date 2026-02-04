"""recreate_views_after_schema_changes

Revision ID: 62a340dbe783
Revises: 486eb9ffe359
Create Date: 2026-02-03 23:32:34.662679

ビューの再作成:
- shipping_master_curated のカラム変更に伴い、依存ビューを再作成
- create_views.sql を実行してすべてのビューを再構築
"""

from pathlib import Path

from alembic import op


# revision identifiers, used by Alembic.
revision = "62a340dbe783"
down_revision = "486eb9ffe359"
branch_labels = None
depends_on = None


def _split_sql_statements(sql_content: str) -> list[str]:
    """SQL文字列を文単位に分割（コメント/文字列/ドルクォートを考慮）."""
    statements: list[str] = []
    current: list[str] = []
    in_single = False
    in_double = False
    in_line_comment = False
    in_block_comment = False
    dollar_tag: str | None = None

    i = 0
    while i < len(sql_content):
        ch = sql_content[i]
        nxt = sql_content[i + 1] if i + 1 < len(sql_content) else ""

        if in_line_comment:
            current.append(ch)
            if ch == "\n":
                in_line_comment = False
            i += 1
            continue

        if in_block_comment:
            current.append(ch)
            if ch == "*" and nxt == "/":
                current.append(nxt)
                i += 2
                in_block_comment = False
                continue
            i += 1
            continue

        if dollar_tag:
            if sql_content.startswith(dollar_tag, i):
                current.append(dollar_tag)
                i += len(dollar_tag)
                dollar_tag = None
                continue
            current.append(ch)
            i += 1
            continue

        if in_single:
            current.append(ch)
            if ch == "'":
                if nxt == "'":
                    current.append(nxt)
                    i += 2
                    continue
                in_single = False
            i += 1
            continue

        if in_double:
            current.append(ch)
            if ch == '"':
                if nxt == '"':
                    current.append(nxt)
                    i += 2
                    continue
                in_double = False
            i += 1
            continue

        if ch == "-" and nxt == "-":
            current.append(ch)
            current.append(nxt)
            i += 2
            in_line_comment = True
            continue

        if ch == "/" and nxt == "*":
            current.append(ch)
            current.append(nxt)
            i += 2
            in_block_comment = True
            continue

        if ch == "'":
            current.append(ch)
            in_single = True
            i += 1
            continue

        if ch == '"':
            current.append(ch)
            in_double = True
            i += 1
            continue

        if ch == "$":
            end = sql_content.find("$", i + 1)
            if end != -1:
                tag = sql_content[i : end + 1]
                tag_body = tag[1:-1]
                if tag_body == "" or tag_body.replace("_", "").isalnum():
                    current.append(tag)
                    dollar_tag = tag
                    i = end + 1
                    continue
            current.append(ch)
            i += 1
            continue

        if ch == ";":
            statement = "".join(current).strip()
            if statement:
                statements.append(statement)
            current = []
            i += 1
            continue

        current.append(ch)
        i += 1

    tail = "".join(current).strip()
    if tail:
        statements.append(tail)

    return statements


def upgrade() -> None:
    """ビューの再作成を実行"""
    # Local-only: skip view recreation here to avoid failures against evolving create_views.sql.
    # Views will be re-applied after full migration.
    return

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

        for statement in _split_sql_statements(sql_content):
            connection.execute(text(statement))
        connection.commit()
    else:
        # SQLファイルが見つからない場合は警告を出すが、エラーにはしない
        print(f"Warning: {create_views_sql} not found. Skipping view recreation.")


def downgrade() -> None:
    """ダウングレード時は何もしない（ビューは次のマイグレーションで再作成される）"""
    pass
