#!/usr/bin/env python
"""
監査スキーマ (audit_schema.sql) を Postgres コンテナに適用するスクリプト。
PowerShell: install_audit.ps1 相当。
"""

from __future__ import annotations

import argparse
import subprocess
from pathlib import Path


def run(cmd: list[str]) -> None:
    print("$ " + " ".join(cmd))
    subprocess.run(cmd, check=True)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--service-name", default="db-postgres")
    parser.add_argument("--db-name", default="lot_management")
    parser.add_argument("--db-user", default="admin")
    parser.add_argument(
        "--sql-path",
        default="scripts/audit/audit_schema.sql",
        help="監査用 SQL (audit_schema.sql) のパス",
    )
    parser.add_argument(
        "--no-cleanup",
        action="store_true",
        help="/tmp の SQL を残したい場合に指定 (PowerShell の -NoCleanup)",
    )

    args = parser.parse_args()

    sql_path = Path(args.sql_path)

    print("== Audit setup start ==")

    # 1) SQLファイル確認
    if not sql_path.exists():
        raise SystemExit(f"SQL file not found: {sql_path}")

    # 2) コンテナにコピー
    dest = "/tmp/audit_schema.sql"
    docker_target = f"{args.service_name}:{dest}"
    print(f"Copying {sql_path} -> {docker_target}")
    run(["docker", "compose", "cp", str(sql_path), docker_target])

    # 3) 適用 (ON_ERROR_STOP=1 で途中エラー時に即停止)
    print(f"Applying audit SQL to {args.db_name} ...")
    run(
        [
            "docker",
            "compose",
            "exec",
            "-T",
            args.service_name,
            "psql",
            "-v",
            "ON_ERROR_STOP=1",
            "-U",
            args.db_user,
            "-d",
            args.db_name,
            "-f",
            dest,
        ]
    )

    # 4) 結果のサマリ
    print("\n== Summary ==")

    sql_triggers = """
SELECT count(*) AS trigger_count
  FROM pg_trigger t
  JOIN pg_proc p ON t.tgfoid=p.oid
 WHERE NOT t.tgisinternal AND p.proname='audit_write';
""".strip()

    run(
        [
            "docker",
            "compose",
            "exec",
            "-T",
            args.service_name,
            "psql",
            "-U",
            args.db_user,
            "-d",
            args.db_name,
            "-c",
            sql_triggers,
        ]
    )

    sql_hist = """
SELECT count(*) AS history_tables
  FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='public' AND c.relname LIKE '%\\_history' ESCAPE '\\';
""".strip()

    run(
        [
            "docker",
            "compose",
            "exec",
            "-T",
            args.service_name,
            "psql",
            "-U",
            args.db_user,
            "-d",
            args.db_name,
            "-c",
            sql_hist,
        ]
    )

    # 5) 後始末
    if not args.no_cleanup:
        print(f"Cleaning up {dest} ...")
        run(
            [
                "docker",
                "compose",
                "exec",
                "-T",
                args.service_name,
                "sh",
                "-lc",
                f"rm -f {dest}",
            ]
        )

    print("== Audit setup done ==")


if __name__ == "__main__":
    main()
