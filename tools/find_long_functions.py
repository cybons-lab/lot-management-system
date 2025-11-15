#!/usr/bin/env python
"""
find_long_functions.py

任意のディレクトリ配下の Python ファイルから、
「行数が長い関数・メソッド」を一覧出力する汎用スクリプト。

例:
    python tools/find_long_functions.py --root backend/app --min-lines 80
"""

from __future__ import annotations

import argparse
import ast
from pathlib import Path
from typing import Iterable, Tuple


FunctionNode = ast.FunctionDef | ast.AsyncFunctionDef


def iter_python_files(root: Path) -> Iterable[Path]:
    """root 配下の .py ファイルを再帰的に列挙する。"""
    for path in root.rglob("*.py"):
        # venv や .venv などを無視したい場合はここでフィルタしてもよい
        yield path


def iter_long_functions(
    path: Path, min_lines: int
) -> Iterable[Tuple[FunctionNode, int]]:
    """1 ファイル内の長い関数を列挙する。"""
    try:
        source = path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        print(f"# skip (encoding error): {path}")
        return

    try:
        tree = ast.parse(source, filename=str(path))
    except SyntaxError as exc:
        print(f"# skip (syntax error): {path} ({exc})")
        return

    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            # Python 3.8+ なら end_lineno が付く
            lineno = getattr(node, "lineno", None)
            end_lineno = getattr(node, "end_lineno", None)
            if lineno is None or end_lineno is None:
                continue

            length = end_lineno - lineno + 1
            if length >= min_lines:
                yield node, length


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Find long Python functions/methods under a given directory."
    )
    parser.add_argument(
        "--root",
        type=str,
        default=".",
        help="検索対象のルートディレクトリ（例: backend/app）",
    )
    parser.add_argument(
        "--min-lines",
        type=int,
        default=80,
        help="この行数以上の関数を検出（デフォルト: 80）",
    )
    args = parser.parse_args()

    root = Path(args.root).resolve()

    if not root.exists():
        raise SystemExit(f"root not found: {root}")

    for file_path in iter_python_files(root):
        # 出力は root からの相対パスの方が読みやすい
        rel_path = file_path.relative_to(root)
        for fn, length in iter_long_functions(file_path, args.min_lines):
            name = fn.name
            lineno = fn.lineno
            end_lineno = fn.end_lineno or (fn.lineno + length - 1)
            print(
                f"{rel_path}:{lineno}-{end_lineno}  {name}  ({length} lines)"
            )


if __name__ == "__main__":
    main()
