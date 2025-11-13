#!/usr/bin/env python3
"""
Directory Tree Generator with .gitignore Support

ディレクトリ構造をTree形式で出力します。
.gitignoreファイルがあれば、そのパターンに一致するファイル/フォルダを除外します。

主な機能:
- Tree形式での見やすい階層表示
- .gitignoreのパターンマッチング対応
- ファイル数・ディレクトリ数の統計表示
- AIがコード構造を分析しやすい形式で出力

使用例:
    python tree_generator.py
    python tree_generator.py /path/to/project
    python tree_generator.py --max-depth 3
"""

import argparse
import fnmatch
import os
from pathlib import Path
from typing import List, Set


class GitignoreParser:
    """シンプルな.gitignoreパーサー"""
    
    def __init__(self, gitignore_path: Path):
        self.patterns: List[str] = []
        self.negations: List[str] = []
        
        if gitignore_path.exists():
            with open(gitignore_path, 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    # 空行やコメントをスキップ
                    if not line or line.startswith('#'):
                        continue
                    
                    # 否定パターン(!で始まる)
                    if line.startswith('!'):
                        self.negations.append(line[1:])
                    else:
                        self.patterns.append(line)
    
    def should_ignore(self, path: Path, is_dir: bool = False) -> bool:
        """パスが.gitignoreパターンにマッチするか判定"""
        path_str = str(path)
        name = path.name
        
        # 否定パターンにマッチする場合は除外しない
        for neg_pattern in self.negations:
            if self._match_pattern(path_str, name, neg_pattern, is_dir):
                return False
        
        # 通常パターンにマッチする場合は除外
        for pattern in self.patterns:
            if self._match_pattern(path_str, name, pattern, is_dir):
                return True
        
        return False
    
    def _match_pattern(self, path_str: str, name: str, pattern: str, is_dir: bool) -> bool:
        """パターンマッチング"""
        # ディレクトリ専用パターン（末尾が/）
        if pattern.endswith('/'):
            if not is_dir:
                return False
            pattern = pattern[:-1]
        
        # ルート相対パターン（先頭が/）
        if pattern.startswith('/'):
            pattern = pattern[1:]
            return fnmatch.fnmatch(path_str, pattern)
        
        # パスの一部にマッチ（/を含む）
        if '/' in pattern:
            return fnmatch.fnmatch(path_str, f"*/{pattern}") or fnmatch.fnmatch(path_str, pattern)
        
        # ファイル名/ディレクトリ名にマッチ
        return fnmatch.fnmatch(name, pattern)


def generate_tree(
    directory: Path,
    prefix: str = "",
    is_last: bool = True,
    gitignore: GitignoreParser = None,
    max_depth: int = None,
    current_depth: int = 0,
    stats: dict = None
) -> List[str]:
    """
    ディレクトリツリーを生成
    
    Args:
        directory: 対象ディレクトリ
        prefix: 現在の接頭辞（罫線）
        is_last: 最後の要素かどうか
        gitignore: GitignoreParserインスタンス
        max_depth: 最大深さ（Noneは無制限）
        current_depth: 現在の深さ
        stats: 統計情報を格納する辞書
    
    Returns:
        ツリー構造の文字列リスト
    """
    if stats is None:
        stats = {'files': 0, 'dirs': 0}
    
    lines = []
    
    # 深さ制限チェック
    if max_depth is not None and current_depth >= max_depth:
        return lines
    
    try:
        # ディレクトリ内のアイテムを取得してソート
        items = sorted(directory.iterdir(), key=lambda x: (not x.is_dir(), x.name.lower()))
    except PermissionError:
        return [f"{prefix}[Permission Denied]"]
    
    # .gitignoreでフィルタリング
    if gitignore:
        items = [
            item for item in items
            if not gitignore.should_ignore(
                item.relative_to(directory.parent),
                item.is_dir()
            )
        ]
    
    for index, item in enumerate(items):
        is_last_item = (index == len(items) - 1)
        
        # 罫線の記号を決定
        if is_last_item:
            connector = "└── "
            extension = "    "
        else:
            connector = "├── "
            extension = "│   "
        
        # アイテム名の表示
        display_name = item.name
        if item.is_dir():
            display_name += "/"
            stats['dirs'] += 1
        else:
            stats['files'] += 1
        
        lines.append(f"{prefix}{connector}{display_name}")
        
        # ディレクトリの場合は再帰的に処理
        if item.is_dir():
            sub_lines = generate_tree(
                item,
                prefix=prefix + extension,
                is_last=is_last_item,
                gitignore=gitignore,
                max_depth=max_depth,
                current_depth=current_depth + 1,
                stats=stats
            )
            lines.extend(sub_lines)
    
    return lines


def main():
    parser = argparse.ArgumentParser(
        description="Generate directory tree with .gitignore support"
    )
    parser.add_argument(
        "path",
        nargs="?",
        default=".",
        help="ディレクトリパス (デフォルト: カレントディレクトリ)"
    )
    parser.add_argument(
        "--max-depth",
        type=int,
        help="最大深さ（指定しない場合は無制限）"
    )
    parser.add_argument(
        "--no-gitignore",
        action="store_true",
        help=".gitignoreを無視"
    )
    parser.add_argument(
        "--output",
        "-o",
        help="出力ファイルパス（指定しない場合は標準出力）"
    )
    
    args = parser.parse_args()
    
    # ディレクトリの確認
    root = Path(args.path).resolve()
    if not root.is_dir():
        print(f"Error: {root} はディレクトリではありません")
        return 1
    
    # .gitignoreの読み込み
    gitignore = None
    if not args.no_gitignore:
        gitignore_path = root / ".gitignore"
        if gitignore_path.exists():
            gitignore = GitignoreParser(gitignore_path)
            print(f"# Using .gitignore: {gitignore_path}")
        else:
            print("# No .gitignore found")
    
    # ツリー生成
    print(f"\n{root.name}/")
    stats = {'files': 0, 'dirs': 0}
    tree_lines = generate_tree(
        root,
        gitignore=gitignore,
        max_depth=args.max_depth,
        stats=stats
    )
    
    # 出力
    output_lines = [f"{root.name}/"] + tree_lines
    output_text = "\n".join(output_lines)
    
    if args.output:
        output_path = Path(args.output)
        output_path.write_text(output_text, encoding='utf-8')
        print(f"\n✓ Tree saved to: {output_path}")
    else:
        print(output_text)
    
    # 統計情報
    print(f"\n# Statistics: {stats['dirs']} directories, {stats['files']} files")
    
    return 0


if __name__ == "__main__":
    exit(main())
