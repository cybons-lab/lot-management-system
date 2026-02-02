#!/usr/bin/env python3
"""
ビュー修正検証スクリプト

Usage:
    # Dockerコンテナ内から実行（開発環境）
    python verify_view_fix.py

    # 本番環境から実行（Windows）
    python verify_view_fix.py --host localhost --port 5432 --user postgres --database lot_management --password YOUR_PASSWORD

検証内容:
    1. v_lot_receipt_stock に supplier_item_id 列が存在するか
    2. ビュー定義が期待通りの列を含んでいるか
    3. ビューからデータが取得できるか
"""

import argparse
import os
import sys

try:
    import psycopg2
    from psycopg2 import sql
except ImportError:
    print("ERROR: psycopg2 is not installed. Install it with: pip install psycopg2-binary", file=sys.stderr)
    sys.exit(1)


def get_db_config_from_args():
    """コマンドライン引数からDB接続設定を取得"""
    parser = argparse.ArgumentParser(description="Verify view fix for v_lot_receipt_stock")
    parser.add_argument("--host", default=os.getenv("DB_HOST", "localhost"), help="Database host")
    parser.add_argument("--port", type=int, default=int(os.getenv("DB_PORT", "5432")), help="Database port")
    parser.add_argument("--user", default=os.getenv("DB_USER", "postgres"), help="Database user")
    parser.add_argument("--password", default=os.getenv("DB_PASSWORD", "postgres"), help="Database password")
    parser.add_argument("--database", default=os.getenv("DB_NAME", "lot_management"), help="Database name")
    args = parser.parse_args()

    return {
        "host": args.host,
        "port": args.port,
        "user": args.user,
        "password": args.password,
        "database": args.database,
    }


def verify_view(config: dict) -> bool:
    """
    v_lot_receipt_stock ビューを検証

    Returns:
        True if all checks pass, False otherwise
    """
    conn = None
    all_passed = True

    try:
        conn = psycopg2.connect(**config)
        cur = conn.cursor()

        print(f"Connected to {config['host']}:{config['port']}/{config['database']}")
        print("=" * 80)

        # Check 1: supplier_item_id 列の存在確認
        print("\n[Check 1] Checking if 'supplier_item_id' column exists...")
        cur.execute(
            """
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'v_lot_receipt_stock'
              AND column_name = 'supplier_item_id'
            """
        )
        result = cur.fetchone()
        if result:
            print("✅ PASS: 'supplier_item_id' column exists")
        else:
            print("❌ FAIL: 'supplier_item_id' column NOT FOUND")
            all_passed = False

        # Check 2: 必須列の存在確認
        print("\n[Check 2] Checking required columns...")
        required_columns = [
            "receipt_id",
            "lot_id",
            "lot_number",
            "supplier_item_id",
            "product_code",
            "product_name",
            "maker_part_code",
            "supplier_id",
            "supplier_name",
            "warehouse_id",
            "warehouse_name",
            "current_stock",
        ]

        cur.execute(
            """
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'v_lot_receipt_stock'
            ORDER BY ordinal_position
            """
        )
        existing_columns = [row[0] for row in cur.fetchall()]

        missing_columns = [col for col in required_columns if col not in existing_columns]
        if missing_columns:
            print(f"❌ FAIL: Missing columns: {', '.join(missing_columns)}")
            all_passed = False
        else:
            print(f"✅ PASS: All {len(required_columns)} required columns exist")

        print(f"\n   Existing columns ({len(existing_columns)}):")
        for col in existing_columns:
            marker = "✓" if col in required_columns else " "
            print(f"   [{marker}] {col}")

        # Check 3: ビューからデータ取得可能か
        print("\n[Check 3] Testing view query...")
        try:
            cur.execute(
                """
                SELECT
                    receipt_id,
                    supplier_item_id,
                    product_code,
                    maker_part_code,
                    current_stock
                FROM v_lot_receipt_stock
                LIMIT 1
                """
            )
            result = cur.fetchone()
            if result:
                print(f"✅ PASS: View query successful (sample row: {result})")
            else:
                print("⚠️  WARN: View query successful but no data (empty table)")
        except Exception as e:
            print(f"❌ FAIL: View query failed: {e}")
            all_passed = False

        # Check 4: inventory_service.py で使われている GROUP BY クエリのテスト
        print("\n[Check 4] Testing GROUP BY query (used in inventory_service.py)...")
        try:
            cur.execute(
                """
                SELECT
                    v.supplier_item_id,
                    v.supplier_id,
                    v.warehouse_id,
                    COUNT(*) as receipt_count
                FROM v_lot_receipt_stock v
                GROUP BY v.supplier_item_id, v.supplier_id, v.warehouse_id
                LIMIT 5
                """
            )
            results = cur.fetchall()
            print(f"✅ PASS: GROUP BY query successful ({len(results)} groups found)")
            if results:
                print("   Sample groups:")
                for row in results[:3]:
                    print(f"     supplier_item_id={row[0]}, supplier_id={row[1]}, warehouse_id={row[2]}, count={row[3]}")
        except Exception as e:
            print(f"❌ FAIL: GROUP BY query failed: {e}")
            all_passed = False

        print("\n" + "=" * 80)
        if all_passed:
            print("🎉 ALL CHECKS PASSED")
            print("\nThe view is correctly configured and ready for production.")
            return True
        else:
            print("❌ SOME CHECKS FAILED")
            print("\nPlease run fix_view_direct.sql to fix the view definition.")
            return False

    except Exception as e:
        print(f"\n❌ Connection or query error: {e}", file=sys.stderr)
        return False

    finally:
        if conn:
            conn.close()


def main():
    config = get_db_config_from_args()

    try:
        success = verify_view(config)
        sys.exit(0 if success else 1)

    except KeyboardInterrupt:
        print("\n\nInterrupted by user")
        sys.exit(130)


if __name__ == "__main__":
    main()
