"""
プロジェクト全体を圧縮（生成AI投入用）

使用方法:
    cd D:\\Work\\Lot-management-system
    python tools/archive_project.py

出力:
    lot-management-YYYYMMDD-HHMMSS.zip（プロジェクトルート直下）
"""

import zipfile
from pathlib import Path
from datetime import datetime

# 除外パターン（生成AI投入のため軽量化）
EXCLUDE_PATTERNS = [
    ".mypy_cache",
    ".pytest_cache",
    ".ruff_cache",
    "__pycache__",
    "node_modules",
    ".venv",
    "venv",
    "*.pyc",
    "*.pyo",
    "*.pyd",
    ".git",  # 必要に応じてコメントアウト
]


def should_exclude(path: Path, root: Path) -> bool:
    """除外対象かどうか判定"""
    relative = path.relative_to(root)
    parts = relative.parts

    # ディレクトリ名での除外
    for part in parts:
        if part in EXCLUDE_PATTERNS:
            return True

    # 拡張子での除外
    for pattern in EXCLUDE_PATTERNS:
        if pattern.startswith("*.") and path.suffix == pattern[1:]:
            return True

    # 生成される圧縮ファイル自体を除外
    if path.suffix == ".zip" and path.parent == root:
        return True

    return False


def archive_project() -> None:
    """プロジェクト全体を圧縮"""
    # プロジェクトルート（tools/の親ディレクトリ）
    script_path = Path(__file__).resolve()
    project_root = script_path.parent.parent

    # 出力ファイル名（タイムスタンプ付き）
    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    output_name = f"lot-management-{timestamp}.zip"
    output_path = project_root / output_name

    print("📦 プロジェクト圧縮開始")
    print(f"   ルート: {project_root}")
    print(f"   出力先: {output_path.name}")
    print("\n除外対象:")
    for pattern in EXCLUDE_PATTERNS:
        print(f"   - {pattern}")
    print()

    # ファイル収集
    files_to_archive: list[Path] = []
    skipped_count = 0

    for path in project_root.rglob("*"):
        if path.is_file():
            if should_exclude(path, project_root):
                skipped_count += 1
            else:
                files_to_archive.append(path)

    print("📊 収集完了:")
    print(f"   対象ファイル: {len(files_to_archive):,} 件")
    print(f"   除外ファイル: {skipped_count:,} 件")
    print()

    # ZIP圧縮
    error_count = 0
    with zipfile.ZipFile(output_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for i, file_path in enumerate(files_to_archive, 1):
            try:
                arcname = file_path.relative_to(project_root)
                zf.write(file_path, arcname)

                # プログレス表示（100件ごと）
                if i % 100 == 0 or i == len(files_to_archive):
                    percent = (i / len(files_to_archive)) * 100
                    print(
                        f"\r   圧縮中... {i}/{len(files_to_archive)} ({percent:.1f}%)",
                        end="",
                    )

            except PermissionError:
                print(f"\n   ⚠️  スキップ（ロック中）: {file_path.name}")
                error_count += 1

    print()  # 改行

    # 結果サマリー
    size_mb = output_path.stat().st_size / (1024 * 1024)
    print("\n✅ 圧縮完了!")
    print(f"   ファイル: {output_path.name}")
    print(f"   サイズ: {size_mb:.2f} MB")
    if error_count > 0:
        print(f"   ⚠️  エラー: {error_count} 件（スキップ済み）")


if __name__ == "__main__":
    archive_project()
