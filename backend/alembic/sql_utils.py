"""Alembic SQL utility functions.

Shared between env.py and migration files.
"""


def split_sql_statements(sql_content: str) -> list[str]:
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
            current.append(ch)
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
