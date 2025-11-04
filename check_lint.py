# check_lint_full.py  (型チェック含む完全版)
from __future__ import annotations

import os
import shutil
import subprocess
import sys
from datetime import datetime
from pathlib import Path

REPO = Path(__file__).resolve().parent
BACKEND = REPO / "backend"
FRONTEND = REPO / "frontend"
LOG_DIR = REPO / "lint_logs"
LOG_DIR.mkdir(exist_ok=True)

timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
LOG_FILE = LOG_DIR / f"lint_check_full_{timestamp}.log"


def run(cmd: list[str], cwd: Path | None = None, name: str = "") -> int:
    """コマンド実行（ログファイルにも出力）"""
    if name:
        header = f"\n=== {name} ===\n"
        print(header)
        with open(LOG_FILE, "a", encoding="utf-8", errors="ignore") as f:
            f.write(header)

    process = subprocess.Popen(
        cmd,
        cwd=cwd,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        encoding="utf-8",
        errors="ignore",
    )
    with open(LOG_FILE, "a", encoding="utf-8", errors="ignore") as f:
        for line in process.stdout:
            print(line, end="")
            f.write(line)
    process.wait()
    return process.returncode


def ensure_dir(p: Path, label: str) -> bool:
    if not p.exists():
        msg = f"[ERROR] {label} directory not found: {p}\n"
        print(msg)
        with open(LOG_FILE, "a", encoding="utf-8") as f:
            f.write(msg)
        return False
    return True


def check_tool_installed(tool: str, install_cmd: str = "") -> bool:
    """ツールがインストールされているか確認"""
    try:
        result = subprocess.run(
            [sys.executable, "-m", tool, "--version"],
            capture_output=True,
            text=True,
            timeout=5,
        )
        return result.returncode == 0
    except (subprocess.TimeoutExpired, FileNotFoundError):
        if install_cmd:
            msg = f"[WARN] {tool} not installed. Run: {install_cmd}\n"
            print(msg)
            with open(LOG_FILE, "a", encoding="utf-8") as f:
                f.write(msg)
        return False


def main() -> int:
    with open(LOG_FILE, "w", encoding="utf-8") as f:
        f.write(f"[Start] Full Lint/Type check {timestamp}\n\n")

    err = 0
    py = sys.executable

    # Backend check
    if ensure_dir(BACKEND, "backend"):
        print("\n" + "=" * 60)
        print("Backend Checks (Python)")
        print("=" * 60)

        # 1. Ruff (スタイルチェック)
        if check_tool_installed("ruff"):
            run([py, "-m", "ruff", "--version"], BACKEND, "Backend: Ruff version")
            if (
                run([py, "-m", "ruff", "check", "."], BACKEND, "Backend: ruff check")
                != 0
            ):
                err = 1

        # 2. Black (フォーマットチェック)
        if check_tool_installed("black"):
            run([py, "-m", "black", "--version"], BACKEND, "Backend: Black version")
            if (
                run(
                    [py, "-m", "black", "--check", "."],
                    BACKEND,
                    "Backend: black --check",
                )
                != 0
            ):
                err = 1

        # 3. Pylint (詳細な静的解析) ← 追加
        if check_tool_installed("pylint", "pip install pylint"):
            run([py, "-m", "pylint", "--version"], BACKEND, "Backend: Pylint version")
            # app/とalembic/を個別にチェック（大量の警告が出る可能性があるため）
            run(
                [
                    py,
                    "-m",
                    "pylint",
                    "app",
                    "--exit-zero",
                ],  # --exit-zero: エラーでも継続
                BACKEND,
                "Backend: pylint app/",
            )
        else:
            msg = "[SKIP] pylint not installed (optional)\n"
            print(msg)
            with open(LOG_FILE, "a", encoding="utf-8") as f:
                f.write(msg)

        # 4. Mypy (型チェック) ← 追加
        if check_tool_installed("mypy", "pip install mypy"):
            run([py, "-m", "mypy", "--version"], BACKEND, "Backend: Mypy version")
            run(
                [
                    py,
                    "-m",
                    "mypy",
                    "app",
                    "--ignore-missing-imports",
                    "--no-error-summary",
                ],
                BACKEND,
                "Backend: mypy app/",
            )
        else:
            msg = "[SKIP] mypy not installed (optional)\n"
            print(msg)
            with open(LOG_FILE, "a", encoding="utf-8") as f:
                f.write(msg)

    # Frontend check
    if ensure_dir(FRONTEND, "frontend"):
        print("\n" + "=" * 60)
        print("Frontend Checks (TypeScript/React)")
        print("=" * 60)

        npx = "npx.cmd" if os.name == "nt" else "npx"
        if not shutil.which(npx):
            msg = (
                "[ERROR] npx not found. Install Node.js and run `npm i` in frontend.\n"
            )
            print(msg)
            with open(LOG_FILE, "a", encoding="utf-8") as f:
                f.write(msg)
            err = 1
        else:
            node_modules = FRONTEND / "node_modules"
            if not node_modules.exists():
                msg = "[WARN] node_modules not found. Run: (cd frontend && npm i)\n"
                print(msg)
                with open(LOG_FILE, "a", encoding="utf-8") as f:
                    f.write(msg)

            # 1. ESLint
            if (
                run(
                    [npx, "eslint", "src/**/*.{ts,tsx,js,jsx}", "--max-warnings=0"],
                    FRONTEND,
                    "Frontend: ESLint",
                )
                != 0
            ):
                err = 1

            # 2. Prettier
            if (
                run(
                    [npx, "prettier", "--check", "src/**/*.{ts,tsx,js,jsx,css,md}"],
                    FRONTEND,
                    "Frontend: Prettier --check",
                )
                != 0
            ):
                err = 1

            # 3. TypeScript型チェック ← 追加
            tsc = FRONTEND / "node_modules" / ".bin" / "tsc"
            if tsc.exists() or shutil.which("tsc"):
                run(
                    [npx, "tsc", "--noEmit"],
                    FRONTEND,
                    "Frontend: TypeScript type check",
                )
            else:
                msg = "[SKIP] TypeScript not installed\n"
                print(msg)
                with open(LOG_FILE, "a", encoding="utf-8") as f:
                    f.write(msg)

    result_msg = (
        "\n" + "=" * 60 + "\n*** All checks passed. ***\n"
        if not err
        else "\n" + "=" * 60 + "\n*** Lint/Format check FAILED. See logs above. ***\n"
    )
    print(result_msg)
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(result_msg)

    print(f"\n[Log saved to] {LOG_FILE}")
    return err


if __name__ == "__main__":
    sys.exit(main())
