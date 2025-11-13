#!/usr/bin/env python
"""
Collect diagnostics from docker services and consolidate into a single UTF-8 file.
PowerShell: .\\tools\\collect-reports.ps1 と同等の挙動を Python で再現。
"""

from __future__ import annotations

import subprocess
from pathlib import Path

REPORTS_DIR = Path.cwd() / "reports"
OUT_FILE = REPORTS_DIR / "diagnostics_all.txt"


def append_utf8(path: Path, content: str) -> None:
    """PowerShell の Add-Content -Encoding utf8 相当."""
    with path.open("a", encoding="utf-8") as f:
        f.write(content)


def run_in_container(service: str, cmd: str) -> str:
    """docker compose exec -T {service} sh -lc {cmd} の結果を文字列で取得."""
    result = subprocess.run(
        ["docker", "compose", "exec", "-T", service, "sh", "-lc", cmd],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
    )
    return result.stdout


def step(title: str, service: str, cmd: str) -> None:
    """PowerShell の Step 関数と同じ役割."""
    output = run_in_container(service, cmd)
    append_utf8(OUT_FILE, f"\n===== {title} =====\n")
    append_utf8(OUT_FILE, output)


def main() -> None:
    # reports ディレクトリ作成（なければ）
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)

    # consolidated ファイルは毎回作り直し
    if OUT_FILE.exists():
        OUT_FILE.unlink()
    OUT_FILE.touch()

    print("== Diagnostics collection started ==")

    # Backend sanity
    step("pytest (backend)", "backend", "pytest -q || true")
    step("ruff check (backend)", "backend", "ruff check || true")
    step("ruff format --check (backend)", "backend", "ruff format --check || true")

    # Backend: vulture (install if missing)
    # pip show で存在確認 → なければ install
    step(
        "vulture install/probe (backend)",
        "backend",
        'pip show vulture >/dev/null 2>&1 || pip install --quiet vulture',
    )
    step("vulture (backend)", "backend", "vulture app || true")

    # Frontend sanity
    step("tsc --noEmit (frontend)", "frontend", "npm run typecheck || true")
    step("npm run build (frontend)", "frontend", "npm run build || true")

    # Frontend unused/deps
    step(
        "ts-prune (frontend)",
        "frontend",
        "npx ts-prune -p tsconfig.json --error-first || true",
    )
    step("knip (frontend)", "frontend", "npx knip || true")
    step("depcheck (frontend)", "frontend", "npx depcheck || true")

    # Frontend dependency graph (JSON; Graphviz not required)
    step("madge --json (frontend)", "frontend", "npx madge src --json || true")

    # consolidated 以外は削除（PowerShell の Get-ChildItem ... Remove-Item 相当）
    for p in REPORTS_DIR.glob("*"):
        if p.is_file() and p.resolve() != OUT_FILE.resolve():
            p.unlink()

    print("== Diagnostics collection completed ==")
    print(f"Consolidated: {OUT_FILE}")


if __name__ == "__main__":
    main()
