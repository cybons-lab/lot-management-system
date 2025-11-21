#!/usr/bin/env python3
"""
Backend 最大行数チェックツール.

Python ファイルの最大行数を検証し、300行を超えるファイルを検出します。
空行とコメント行は除外してカウントします。
"""

import sys
from pathlib import Path


MAX_LINES = 300
EXCLUDE_PATTERNS = [
    "__pycache__",
    ".pytest_cache",
    ".ruff_cache",
    "venv",
    "env",
    ".git",
    "__init__.py",  # __init__.py は除外
]


def count_code_lines(file_path: Path) -> int:
    """
    コード行数をカウント（空行・コメント行を除外）.

    Args:
        file_path: Pythonファイルのパス

    Returns:
        コード行数
    """
    try:
        with open(file_path, encoding="utf-8") as f:
            lines = f.readlines()

        code_lines = 0
        in_docstring = False
        docstring_char = None

        for line in lines:
            stripped = line.strip()

            # 空行をスキップ
            if not stripped:
                continue

            # docstring の開始/終了を検出
            if stripped.startswith('"""') or stripped.startswith("'''"):
                if not in_docstring:
                    in_docstring = True
                    docstring_char = stripped[:3]
                    # 1行docstringの場合
                    if stripped.count(docstring_char) >= 2:
                        in_docstring = False
                        continue
                    continue
                elif stripped.endswith(docstring_char):
                    in_docstring = False
                    continue

            # docstring 内はスキップ
            if in_docstring:
                continue

            # コメント行をスキップ
            if stripped.startswith("#"):
                continue

            # 有効なコード行としてカウント
            code_lines += 1

        return code_lines

    except Exception as e:
        print(f"⚠️  Error reading {file_path}: {e}", file=sys.stderr)
        return 0


def should_exclude(path: Path) -> bool:
    """除外パターンに一致するかチェック."""
    path_str = str(path)
    return any(pattern in path_str for pattern in EXCLUDE_PATTERNS)


def main():
    """メイン処理."""
    app_dir = Path(__file__).parent.parent / "app"
    if not app_dir.exists():
        print(f"❌ Directory not found: {app_dir}", file=sys.stderr)
        sys.exit(1)

    violations = []
    total_files = 0

    for py_file in app_dir.rglob("*.py"):
        if should_exclude(py_file):
            continue

        total_files += 1
        line_count = count_code_lines(py_file)

        if line_count > MAX_LINES:
            relative_path = py_file.relative_to(app_dir.parent)
            violations.append((relative_path, line_count))

    # 結果表示
    print(f"\n{'=' * 60}")
    print(f"📊 Maximum Lines Check (threshold: {MAX_LINES} lines)")
    print(f"{'=' * 60}")
    print(f"Total files checked: {total_files}")

    if violations:
        print(f"\n❌ {len(violations)} file(s) exceed {MAX_LINES} lines:\n")
        for path, lines in sorted(violations, key=lambda x: x[1], reverse=True):
            print(f"  {path}: {lines} lines (exceeds by {lines - MAX_LINES})")
        print(f"\n{'=' * 60}")
        sys.exit(1)
    else:
        print(f"✅ All files are within {MAX_LINES} lines limit")
        print(f"{'=' * 60}\n")
        sys.exit(0)


if __name__ == "__main__":
    main()
