#!/usr/bin/env python
"""
監査トリガ／履歴テーブルの動作確認用スクリプト。
PowerShell: scripts/audit/test_audit.ps1 相当。
"""

from __future__ import annotations

import argparse
import subprocess


def run_psql(
    service_name: str,
    db_user: str,
    db_name: str,
    sql: str,
    quiet: bool = False,
) -> None:
    cmd = [
        "docker",
        "compose",
        "exec",
        "-T",
        service_name,
        "psql",
        "-U",
        db_user,
        "-d",
        db_name,
        "-c",
        sql,
    ]
    print("$ " + " ".join(cmd))
    if quiet:
        subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.STDOUT)
    else:
        subprocess.run(cmd, check=True)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--service-name", default="db-postgres")
    parser.add_argument("--db-name", default="lot_management")
    parser.add_argument("--db-user", default="admin")

    # 監査テスト対象（デフォルトは warehouses）
    parser.add_argument("--table", default="warehouses")
    parser.add_argument("--key-column", default="warehouse_code")
    parser.add_argument("--key-value", default="ZZ-AUDIT")
    parser.add_argument("--name-column", default="warehouse_name")
    parser.add_argument("--init-name", default="監査テスト倉庫")
    parser.add_argument("--updated-name", default="監査テスト倉庫(改)")

    args = parser.parse_args()

    service = args.service_name
    db = args.db_name
    user = args.db_user
    table = args.table
    key_column = args.key_column
    key_value = args.key_value
    name_column = args.name_column
    init_name = args.init_name
    updated_name = args.updated_name

    print("== Audit test start ==")

    # 1) トリガ数・履歴テーブル一覧（ざっくりヘルスチェック）
    sql_triggers = """
SELECT count(*) AS trigger_count
  FROM pg_trigger t
  JOIN pg_proc p ON t.tgfoid=p.oid
 WHERE NOT t.tgisinternal AND p.proname='audit_write';
""".strip()
    run_psql(service, user, db, sql_triggers)

    sql_hist_tables = """
SELECT n.nspname AS schema, c.relname AS history_table
  FROM pg_class c
  JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='public' AND c.relname LIKE '%\\_history' ESCAPE '\\'
 ORDER BY c.relname;
""".strip()
    run_psql(service, user, db, sql_hist_tables)

    # 2) 既存のテストデータを掃除
    delete_existing = f"DELETE FROM public.{table} WHERE {key_column} = '{key_value}';"
    run_psql(service, user, db, delete_existing, quiet=True)

    # 3) I/U/D 実行
    insert_sql = f"""
INSERT INTO public.{table} ({key_column}, {name_column})
VALUES ('{key_value}', '{init_name}');
""".strip()

    update_sql = f"""
UPDATE public.{table} SET {name_column} = '{updated_name}'
 WHERE {key_column} = '{key_value}';
""".strip()

    delete_sql = f"DELETE FROM public.{table} WHERE {key_column} = '{key_value}';"

    print("\n-- INSERT --")
    run_psql(service, user, db, insert_sql)

    print("\n-- UPDATE --")
    run_psql(service, user, db, update_sql)

    print("\n-- DELETE --")
    run_psql(service, user, db, delete_sql)

    # 4) 履歴テーブルの確認
    hist_table = f"{table}_history"
    select_hist_sql = f"""
SELECT op, changed_by, changed_at,
       (row_data->>'{key_column}')  AS key_value,
       (row_data->>'{name_column}') AS name
  FROM public.{hist_table}
 WHERE row_data->>'{key_column}' = '{key_value}'
 ORDER BY changed_at;
""".strip()

    print("\n== History ==")
    run_psql(service, user, db, select_hist_sql)

    print("== Audit test done ==")


if __name__ == "__main__":
    main()
