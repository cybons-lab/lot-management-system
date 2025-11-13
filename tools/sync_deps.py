#!/usr/bin/env python
"""
Backend / Frontend の依存関係を docker コンテナ内で更新し、
最後に backend イメージを build して up -d まで行う。

PowerShell: tools/sync-deps.ps1 と同等。
"""

from __future__ import annotations

import argparse
import subprocess
from typing import Sequence


def run(cmd: Sequence[str]) -> None:
    print("$ " + " ".join(cmd))
    subprocess.run(cmd, check=True)


def run_backend() -> None:
    script = r"""
set -e
python -V
pip install -U pip setuptools wheel
pip install -U pip-review
pip-review --auto || true
pip check || true
pip freeze > /app/requirements.txt
"""
    run(["docker", "compose", "exec", "-T", "backend", "sh", "-lc", script])


def run_frontend(frontend_target: str) -> None:
    script = f"""
set -e
corepack enable || true
(npm ci || npm install)
npx npm-check-updates --target {frontend_target} -u
npm install
npm audit fix || true
npx tsc --noEmit
"""
    run(["docker", "compose", "exec", "-T", "frontend", "sh", "-lc", script])


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--frontend-target",
        choices=["minor", "latest"],
        default="minor",
        help="npm-check-updates の target (PowerShell の $FrontendTarget)",
    )
    parser.add_argument(
        "--backend-only",
        action="store_true",
        help="Backend のみ更新 (PowerShell の -BackendOnly 相当)",
    )
    parser.add_argument(
        "--frontend-only",
        action="store_true",
        help="Frontend のみ更新 (PowerShell の -FrontendOnly 相当)",
    )

    args = parser.parse_args()

    do_backend = not args.frontend_only
    do_frontend = not args.backend_only

    if do_backend:
        print("== Backend deps update ==")
        run_backend()

    if do_frontend:
        print("== Frontend deps update ==")
        run_frontend(args.frontend_target)

    # 反映
    print("== Rebuild backend image & docker compose up -d ==")
    run(["docker", "compose", "build", "backend"])
    run(["docker", "compose", "up", "-d"])


if __name__ == "__main__":
    main()
