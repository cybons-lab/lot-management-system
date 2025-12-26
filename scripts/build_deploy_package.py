#!/usr/bin/env python3
"""本番環境デプロイパッケージを作成するスクリプト.

Windows/Mac 両対応。標準ライブラリのみ使用。

Usage:
    python scripts/build_deploy_package.py

Output:
    deploy/lot-management-deploy-YYYYMMDD.zip
"""

import os
import shutil
import subprocess
import sys
import zipfile
from datetime import datetime
from pathlib import Path


# プロジェクトルートを取得
SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent
DEPLOY_DIR = PROJECT_ROOT / "deploy"
BACKEND_DIR = PROJECT_ROOT / "backend"
FRONTEND_DIR = PROJECT_ROOT / "frontend"
DOCS_DIR = PROJECT_ROOT / "docs"


# 除外するパターン
EXCLUDE_PATTERNS = {
    # Python キャッシュ
    "__pycache__",
    ".pytest_cache",
    ".mypy_cache",
    ".ruff_cache",
    ".hypothesis",
    # 仮想環境
    ".venv",
    "venv",
    # Node.js
    "node_modules",
    # IDE
    ".idea",
    ".vscode",
    # Git
    ".git",
    # テスト関連
    "tests",
    "test-results",
    "playwright-report",
    "htmlcov",
    ".coverage",
    # ログ・一時ファイル
    "logs",
    "dumps",
    "uploads",
    # ビルド出力（frontendのdistは含める）
    "dist",  # backend側のdist
    # その他
    ".DS_Store",
    "test.db",
}

# 除外するファイル拡張子
EXCLUDE_EXTENSIONS = {
    ".log",
    ".pyc",
    ".pyo",
}

# 除外するファイル名
EXCLUDE_FILES = {
    ".env",  # セキュリティのため
    ".env.local",
    ".coverage",
    "tsc.log",
    "tsc_final.log",
    "test_output.txt",
}


def print_step(message: str) -> None:
    """ステップメッセージを出力."""
    print(f"\n{'='*60}")
    print(f"🔧 {message}")
    print(f"{'='*60}")


def print_success(message: str) -> None:
    """成功メッセージを出力."""
    print(f"✅ {message}")


def print_error(message: str) -> None:
    """エラーメッセージを出力."""
    print(f"❌ {message}", file=sys.stderr)


def should_exclude(path: Path, base_dir: Path) -> bool:
    """ファイル/ディレクトリを除外すべきか判定."""
    # パスの各部分をチェック
    rel_path = path.relative_to(base_dir)
    parts = rel_path.parts

    for part in parts:
        if part in EXCLUDE_PATTERNS:
            return True

    # ファイル名チェック
    if path.is_file():
        if path.name in EXCLUDE_FILES:
            return True
        if path.suffix in EXCLUDE_EXTENSIONS:
            return True

    return False


def generate_requirements(backend_dir: Path, output_path: Path) -> bool:
    """pyproject.toml から requirements.txt を生成."""
    print_step("requirements.txt を生成中...")

    # uv が使えるか確認
    try:
        result = subprocess.run(
            ["uv", "pip", "compile", "pyproject.toml", "-o", str(output_path)],
            cwd=backend_dir,
            capture_output=True,
            text=True,
        )
        if result.returncode == 0:
            print_success(f"requirements.txt を生成しました: {output_path}")
            return True
        else:
            print(f"uv エラー: {result.stderr}")
    except FileNotFoundError:
        print("uv が見つかりません。pip-tools を試みます...")

    # pip-tools で試行
    try:
        result = subprocess.run(
            ["pip-compile", "pyproject.toml", "-o", str(output_path)],
            cwd=backend_dir,
            capture_output=True,
            text=True,
        )
        if result.returncode == 0:
            print_success(f"requirements.txt を生成しました: {output_path}")
            return True
    except FileNotFoundError:
        pass

    # 手動で依存関係を抽出
    print("pyproject.toml から直接依存関係を抽出します...")
    try:
        import tomllib
    except ImportError:
        # Python 3.10 以前
        print_error("Python 3.11+ が必要です（tomllib）")
        return False

    pyproject_path = backend_dir / "pyproject.toml"
    with open(pyproject_path, "rb") as f:
        data = tomllib.load(f)

    dependencies = data.get("project", {}).get("dependencies", [])
    if dependencies:
        with open(output_path, "w") as f:
            f.write("# Auto-generated from pyproject.toml\n")
            for dep in dependencies:
                f.write(f"{dep}\n")
        print_success(f"requirements.txt を生成しました: {output_path}")
        return True

    print_error("依存関係を抽出できませんでした")
    return False


def build_frontend(frontend_dir: Path) -> bool:
    """フロントエンドをビルド."""
    print_step("フロントエンドをビルド中...")

    dist_dir = frontend_dir / "dist"

    # 既存の dist があればスキップするかどうか確認
    if dist_dir.exists() and any(dist_dir.iterdir()):
        print("既存のビルドが見つかりました。再ビルドします...")
        shutil.rmtree(dist_dir)

    # npm install
    print("npm install を実行中...")
    result = subprocess.run(
        ["npm", "install"],
        cwd=frontend_dir,
        capture_output=True,
        text=True,
        shell=(os.name == "nt"),  # Windows では shell=True が必要
    )
    if result.returncode != 0:
        print_error(f"npm install に失敗: {result.stderr}")
        return False

    # npm run build
    print("npm run build を実行中...")
    result = subprocess.run(
        ["npm", "run", "build"],
        cwd=frontend_dir,
        capture_output=True,
        text=True,
        shell=(os.name == "nt"),
    )
    if result.returncode != 0:
        print_error(f"npm run build に失敗: {result.stderr}")
        return False

    if not dist_dir.exists():
        print_error("dist ディレクトリが生成されませんでした")
        return False

    print_success("フロントエンドのビルドが完了しました")
    return True


def copy_backend(temp_dir: Path) -> bool:
    """バックエンドファイルをコピー."""
    print_step("バックエンドをコピー中...")

    dest_backend = temp_dir / "backend"
    dest_backend.mkdir(parents=True, exist_ok=True)

    # コピーするディレクトリ
    copy_dirs = ["app", "alembic", "scripts", "sql", "configs"]
    # コピーするファイル
    copy_files = [
        "pyproject.toml",
        "uv.lock",
        "alembic.ini",
        "mypy.ini",
        "pytest.ini",
        ".env.example",
        "README.md",
    ]

    # ディレクトリをコピー
    for dir_name in copy_dirs:
        src = BACKEND_DIR / dir_name
        if src.exists():
            dest = dest_backend / dir_name
            shutil.copytree(
                src,
                dest,
                ignore=shutil.ignore_patterns(*EXCLUDE_PATTERNS),
            )
            print(f"  📁 {dir_name}/")

    # ファイルをコピー
    for file_name in copy_files:
        src = BACKEND_DIR / file_name
        if src.exists():
            shutil.copy2(src, dest_backend / file_name)
            print(f"  📄 {file_name}")

    print_success("バックエンドのコピーが完了しました")
    return True


def copy_frontend_dist(temp_dir: Path) -> bool:
    """フロントエンドの dist をコピー."""
    print_step("フロントエンド dist をコピー中...")

    src_dist = FRONTEND_DIR / "dist"
    if not src_dist.exists():
        print_error("frontend/dist が見つかりません。先にビルドしてください。")
        return False

    dest_frontend = temp_dir / "frontend" / "dist"
    shutil.copytree(src_dist, dest_frontend)

    print_success("フロントエンド dist のコピーが完了しました")
    return True


def copy_docs(temp_dir: Path) -> bool:
    """ドキュメントをコピー."""
    print_step("ドキュメントをコピー中...")

    dest_docs = temp_dir / "docs" / "ops"
    dest_docs.mkdir(parents=True, exist_ok=True)

    # 運用ドキュメントをコピー
    src_ops = DOCS_DIR / "ops"
    if src_ops.exists():
        for file in src_ops.glob("*.md"):
            shutil.copy2(file, dest_docs / file.name)
            print(f"  📄 {file.name}")

    print_success("ドキュメントのコピーが完了しました")
    return True


def create_zip(temp_dir: Path, output_path: Path) -> bool:
    """ZIP ファイルを作成."""
    print_step("ZIP ファイルを作成中...")

    with zipfile.ZipFile(output_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for root, _dirs, files in os.walk(temp_dir):
            for file in files:
                file_path = Path(root) / file
                arcname = file_path.relative_to(temp_dir)
                zf.write(file_path, arcname)

    size_mb = output_path.stat().st_size / (1024 * 1024)
    print_success(f"ZIP ファイルを作成しました: {output_path} ({size_mb:.2f} MB)")
    return True


def main() -> int:
    """メイン処理."""
    print("\n" + "=" * 60)
    print("🚀 本番環境デプロイパッケージ作成ツール")
    print("=" * 60)

    # タイムスタンプ
    timestamp = datetime.now().strftime("%Y%m%d")
    zip_name = f"lot-management-deploy-{timestamp}.zip"

    # 出力ディレクトリ準備
    DEPLOY_DIR.mkdir(parents=True, exist_ok=True)
    output_path = DEPLOY_DIR / zip_name

    # 一時ディレクトリで作業
    temp_dir = DEPLOY_DIR / f"_temp_{timestamp}"
    if temp_dir.exists():
        shutil.rmtree(temp_dir)
    temp_dir.mkdir(parents=True)

    try:
        # 1. フロントエンドビルド
        if not build_frontend(FRONTEND_DIR):
            return 1

        # 2. バックエンドコピー
        if not copy_backend(temp_dir):
            return 1

        # 3. requirements.txt 生成
        requirements_path = temp_dir / "backend" / "requirements.txt"
        if not generate_requirements(BACKEND_DIR, requirements_path):
            return 1

        # 4. フロントエンド dist コピー
        if not copy_frontend_dist(temp_dir):
            return 1

        # 5. ドキュメントコピー
        if not copy_docs(temp_dir):
            return 1

        # 6. ZIP 作成
        if not create_zip(temp_dir, output_path):
            return 1

        print("\n" + "=" * 60)
        print("✨ パッケージ作成が完了しました!")
        print("=" * 60)
        print(f"\n出力ファイル: {output_path}")
        print("\n次のステップ:")
        print("  1. ZIP ファイルを本番サーバーにコピー")
        print("  2. docs/ops/PRODUCTION_DEPLOYMENT.md の手順に従ってデプロイ")
        print()

        return 0

    finally:
        # 一時ディレクトリを削除
        if temp_dir.exists():
            shutil.rmtree(temp_dir)


if __name__ == "__main__":
    sys.exit(main())
