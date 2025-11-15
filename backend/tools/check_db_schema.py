# tools/check_db_schema.py

from __future__ import annotations

import os
from typing import Dict, List, Tuple

from sqlalchemy import create_engine, inspect
from sqlalchemy.dialects.postgresql import INTEGER, BIGINT
from sqlalchemy.engine.reflection import Inspector
from sqlalchemy.exc import SQLAlchemyError


def get_engine():
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise RuntimeError("DATABASE_URL が設定されていません。環境変数を確認してください。")
    return create_engine(database_url)


def collect_table_info(inspector: Inspector, schema: str = "public"):
    tables = inspector.get_table_names(schema=schema)

    pk_info: Dict[Tuple[str, str], str] = {}
    column_types: Dict[Tuple[str, str], str] = {}
    bigint_columns: List[Tuple[str, str]] = []

    for table in tables:
        cols = inspector.get_columns(table, schema=schema)
        pk = inspector.get_pk_constraint(table, schema=schema)
        pk_cols = set(pk.get("constrained_columns") or [])

        for col in cols:
            col_name = col["name"]
            col_type = col["type"]
            key = (table, col_name)

            # 型名を文字列で保持しておく（見やすさ重視）
            column_types[key] = str(col_type)

            # PK カラムなら記録
            if col_name in pk_cols:
                pk_info[key] = str(col_type)

            # bigint 判定
            if isinstance(col_type, BIGINT):
                bigint_columns.append(key)

    return pk_info, column_types, bigint_columns


def collect_fk_mismatches(inspector: Inspector, column_types: Dict[Tuple[str, str], str], schema: str = "public"):
    tables = inspector.get_table_names(schema=schema)
    mismatches: List[Dict[str, str]] = []

    for table in tables:
        fks = inspector.get_foreign_keys(table, schema=schema)
        for fk in fks:
            referred_schema = fk.get("referred_schema") or schema
            referred_table = fk["referred_table"]
            local_cols = fk["constrained_columns"]
            remote_cols = fk["referred_columns"]

            for local_col, remote_col in zip(local_cols, remote_cols):
                local_key = (table, local_col)
                remote_key = (referred_table, remote_col)

                local_type = column_types.get(local_key)
                remote_type = column_types.get(remote_key)

                if local_type is None or remote_type is None:
                    # 何かおかしい場合はスキップしつつ記録だけしてもよいが、
                    # ここでは無視
                    continue

                if local_type != remote_type:
                    mismatches.append(
                        {
                            "table": table,
                            "column": local_col,
                            "type": local_type,
                            "ref_table": referred_table,
                            "ref_column": remote_col,
                            "ref_type": remote_type,
                        }
                    )

    return mismatches


def main():
    try:
        engine = get_engine()
        inspector = inspect(engine)

        print("=== 🔍 DB Schema Check (PK/FK & bigint) ===")

        pk_info, column_types, bigint_columns = collect_table_info(inspector)

        # 1. bigint カラム一覧
        print("\n--- 1) bigint カラム一覧 --------------------------")
        if not bigint_columns:
            print("✅ bigint カラムは見つかりませんでした。")
        else:
            for table, col in sorted(bigint_columns):
                type_str = column_types[(table, col)]
                pk_flag = " (PK)" if (table, col) in pk_info else ""
                print(f"- {table}.{col}: {type_str}{pk_flag}")

        # 2. PK 情報一覧
        print("\n--- 2) PK カラム一覧 -----------------------------")
        for (table, col), type_str in sorted(pk_info.items()):
            print(f"- {table}.{col}: {type_str}")

        # 3. PK/FK 型不一致チェック
        print("\n--- 3) PK/FK 型不一致チェック --------------------")
        mismatches = collect_fk_mismatches(inspector, column_types)

        if not mismatches:
            print("✅ PK/FK の型不一致は見つかりませんでした。")
        else:
            for m in mismatches:
                print(
                    f"- {m['table']}.{m['column']} ({m['type']}) "
                    f"→ {m['ref_table']}.{m['ref_column']} ({m['ref_type']})"
                )

        print("\n=== ✅ チェック完了 ===============================")

    except SQLAlchemyError as e:
        print(f"❌ DB接続またはメタデータ取得でエラー: {e}")
    except Exception as e:
        print(f"❌ 予期しないエラー: {e}")


if __name__ == "__main__":
    main()
