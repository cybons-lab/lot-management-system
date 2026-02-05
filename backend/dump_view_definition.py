#!/usr/bin/env python3
"""データベーステーブル・ビュー完全ダンプスクリプト.

Usage:
    # Dockerコンテナ内から実行（開発環境）
    python dump_view_definition.py

    # 本番環境から実行（Windows）
    python dump_view_definition.py --host localhost --port 5432 --user postgres --database lot_management --password YOUR_PASSWORD

出力:
    - view_definition.sql: v_lot_receipt_stock の定義
    - table_schemas.sql: 関連テーブルのスキーマ定義
    - table_data_sample.sql: 関連テーブルのサンプルデータ（最大10件）
    - コンソール: テーブル・ビューの詳細情報
"""

import argparse
import os
import sys
from pathlib import Path


try:
    import psycopg2
except ImportError:
    print(
        "ERROR: psycopg2 is not installed. Install it with: pip install psycopg2-binary",
        file=sys.stderr,
    )
    sys.exit(1)


def get_db_config_from_env_or_args():
    """環境変数またはコマンドライン引数からDB接続設定を取得。.

    優先順位:
    1. DATABASE_URL 環境変数（Docker環境）
    2. コマンドライン引数（本番環境）
    """
    # DATABASE_URL から接続情報を抽出
    database_url = os.getenv("DATABASE_URL")
    if database_url:
        # postgresql://user:pass@host:port/dbname から抽出
        import re

        match = re.match(r"postgresql://([^:]+):([^@]+)@([^:]+):(\d+)/(.+)", database_url)
        if match:
            user, password, host, port, database = match.groups()
            return {
                "host": host,
                "port": int(port),
                "user": user,
                "password": password,
                "database": database,
            }

    # コマンドライン引数から取得
    parser = argparse.ArgumentParser(description="Dump view definition from PostgreSQL")
    parser.add_argument("--host", default=os.getenv("DB_HOST", "localhost"), help="Database host")
    parser.add_argument(
        "--port", type=int, default=int(os.getenv("DB_PORT", "5432")), help="Database port"
    )
    parser.add_argument("--user", default=os.getenv("DB_USER", "postgres"), help="Database user")
    parser.add_argument(
        "--password", default=os.getenv("DB_PASSWORD", "postgres"), help="Database password"
    )
    parser.add_argument(
        "--database", default=os.getenv("DB_NAME", "lot_management"), help="Database name"
    )
    args = parser.parse_args()

    return {
        "host": args.host,
        "port": args.port,
        "user": args.user,
        "password": args.password,
        "database": args.database,
    }


def dump_table_schema(cur, table_name: str) -> str:
    """テーブルのCREATE TABLE文を生成。."""
    cur.execute(
        """
        SELECT
            column_name,
            data_type,
            character_maximum_length,
            numeric_precision,
            numeric_scale,
            is_nullable,
            column_default
        FROM information_schema.columns
        WHERE table_name = %s
        ORDER BY ordinal_position
        """,
        (table_name,),
    )
    columns = cur.fetchall()

    if not columns:
        return f"-- Table {table_name} not found\n"

    create_sql = f"CREATE TABLE {table_name} (\n"
    col_defs = []
    for col in columns:
        col_name, data_type, char_len, num_prec, num_scale, nullable, default = col
        col_def = f"    {col_name} {data_type}"

        if char_len:
            col_def += f"({char_len})"
        elif num_prec:
            col_def += f"({num_prec},{num_scale})"

        if nullable == "NO":
            col_def += " NOT NULL"

        if default:
            col_def += f" DEFAULT {default}"

        col_defs.append(col_def)

    create_sql += ",\n".join(col_defs)
    create_sql += "\n);\n"

    return create_sql


def dump_table_data(cur, table_name: str, limit: int = 10) -> str:
    """テーブルのサンプルデータをINSERT文として生成。."""
    cur.execute(
        """
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = %s
        ORDER BY ordinal_position
        """,
        (table_name,),
    )
    columns = [row[0] for row in cur.fetchall()]

    if not columns:
        return f"-- Table {table_name} not found\n"

    cur.execute(f"SELECT * FROM {table_name} LIMIT %s", (limit,))
    rows = cur.fetchall()

    if not rows:
        return f"-- Table {table_name} is empty\n"

    insert_sql = f"-- Sample data from {table_name} (max {limit} rows)\n"
    for row in rows:
        values = []
        for val in row:
            if val is None:
                values.append("NULL")
            elif isinstance(val, str):
                # Escape single quotes
                escaped = val.replace("'", "''")
                values.append(f"'{escaped}'")
            else:
                values.append(str(val))

        insert_sql += (
            f"INSERT INTO {table_name} ({', '.join(columns)}) VALUES ({', '.join(values)});\n"
        )

    return insert_sql + "\n"


def dump_view_definition(
    config: dict, view_name: str = "v_lot_receipt_stock"
) -> tuple[str, list[tuple]]:
    """指定したビューの定義と列情報を取得。.

    Args:
        config: DB接続設定
        view_name: ビュー名

    Returns:
        (view_definition_sql, columns_list)
    """
    conn = None
    try:
        conn = psycopg2.connect(**config)
        cur = conn.cursor()

        # ビュー定義を取得
        cur.execute(
            """
            SELECT pg_get_viewdef(%s::regclass, true) AS view_definition
            """,
            (view_name,),
        )
        result = cur.fetchone()
        if not result:
            raise ValueError(f"View '{view_name}' not found")

        view_definition = result[0]

        # 列情報を取得
        cur.execute(
            """
            SELECT
                column_name,
                data_type,
                character_maximum_length,
                numeric_precision,
                numeric_scale
            FROM information_schema.columns
            WHERE table_name = %s
            ORDER BY ordinal_position
            """,
            (view_name,),
        )
        columns = cur.fetchall()

        return view_definition, columns

    finally:
        if conn:
            conn.close()


def dump_all_related_tables(config: dict) -> dict:
    """v_lot_receipt_stock に関連する全テーブルのスキーマとデータをダンプ。."""
    related_tables = [
        "lots",
        "supplier_items",
        "suppliers",
        "warehouses",
        "lot_receipts",
        "stock_history",
        "product_groups",  # Phase0の名残があれば
    ]

    conn = None
    result = {}

    try:
        conn = psycopg2.connect(**config)
        cur = conn.cursor()

        for table in related_tables:
            # テーブルが存在するか確認
            cur.execute(
                """
                SELECT EXISTS (
                    SELECT 1
                    FROM information_schema.tables
                    WHERE table_name = %s
                )
                """,
                (table,),
            )
            exists = cur.fetchone()[0]

            if not exists:
                result[table] = {"schema": f"-- Table {table} does not exist\n", "data": ""}
                continue

            schema = dump_table_schema(cur, table)
            data = dump_table_data(cur, table, limit=10)

            # レコード数も取得
            cur.execute(f"SELECT COUNT(*) FROM {table}")
            count = cur.fetchone()[0]

            result[table] = {"schema": schema, "data": data, "count": count}

        return result

    finally:
        if conn:
            conn.close()


def main():
    config = get_db_config_from_env_or_args()
    view_name = "v_lot_receipt_stock"
    output_dir = Path(__file__).parent

    print(f"Connecting to {config['host']}:{config['port']}/{config['database']}...")
    print("=" * 80)

    try:
        # 1. ビュー定義をダンプ
        print("\n[1/3] Dumping view definition...")
        view_def, columns = dump_view_definition(config, view_name)

        view_output = output_dir / "view_definition.sql"
        with open(view_output, "w", encoding="utf-8") as f:
            f.write(f"-- View definition for {view_name}\n")
            f.write(f"-- Dumped from {config['host']}:{config['port']}/{config['database']}\n\n")
            f.write(f"CREATE OR REPLACE VIEW {view_name} AS\n")
            f.write(view_def)
            f.write(";\n")

        print(f"✅ View definition saved to: {view_output}")

        # 2. 関連テーブルのスキーマをダンプ
        print("\n[2/3] Dumping related table schemas...")
        tables_info = dump_all_related_tables(config)

        schema_output = output_dir / "table_schemas.sql"
        with open(schema_output, "w", encoding="utf-8") as f:
            f.write(f"-- Table schemas related to {view_name}\n")
            f.write(f"-- Dumped from {config['host']}:{config['port']}/{config['database']}\n\n")
            for table, info in tables_info.items():
                f.write(f"-- Table: {table}\n")
                if "count" in info:
                    f.write(f"-- Record count: {info['count']}\n")
                f.write(info["schema"])
                f.write("\n")

        print(f"✅ Table schemas saved to: {schema_output}")

        # 3. サンプルデータをダンプ
        print("\n[3/3] Dumping sample data...")
        data_output = output_dir / "table_data_sample.sql"
        with open(data_output, "w", encoding="utf-8") as f:
            f.write(f"-- Sample data from tables related to {view_name}\n")
            f.write(f"-- Dumped from {config['host']}:{config['port']}/{config['database']}\n\n")
            for table, info in tables_info.items():
                f.write(f"-- Table: {table}\n")
                if "count" in info:
                    f.write(f"-- Total records: {info['count']}\n")
                f.write(info["data"])
                f.write("\n")

        print(f"✅ Sample data saved to: {data_output}")

        # 4. コンソールに詳細情報を表示
        print("\n" + "=" * 80)
        print(f"📋 View: {view_name}")
        print("-" * 80)
        col_names = [col[0] for col in columns]
        for col in columns:
            col_name, data_type, char_len, num_prec, num_scale = col
            type_info = data_type
            if char_len:
                type_info += f"({char_len})"
            elif num_prec:
                type_info += f"({num_prec},{num_scale})"
            marker = (
                "✓" if col_name in ["supplier_item_id", "product_code", "maker_part_code"] else " "
            )
            print(f"  [{marker}] {col_name:<30} {type_info}")

        # supplier_item_id の存在チェック
        print("\n" + "-" * 80)
        if "supplier_item_id" in col_names:
            print("✅ Column 'supplier_item_id' EXISTS")
        else:
            print("❌ Column 'supplier_item_id' NOT FOUND")
            print("   This is the root cause of the 500 error!")

        # テーブル情報のサマリー
        print("\n" + "=" * 80)
        print("📊 Related Tables Summary:")
        print("-" * 80)
        for table, info in tables_info.items():
            if "count" in info:
                status = "✓" if info["count"] > 0 else "✗"
                print(f"  [{status}] {table:<30} {info['count']:>6} records")
            else:
                print(f"  [✗] {table:<30} NOT EXISTS")

        print("\n" + "=" * 80)
        print("✅ All dumps completed successfully!")
        print("\nGenerated files:")
        print(f"  - {view_output.name}")
        print(f"  - {schema_output.name}")
        print(f"  - {data_output.name}")

    except Exception as e:
        print(f"\n❌ Error: {e}", file=sys.stderr)
        import traceback

        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
