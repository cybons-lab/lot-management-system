#!/usr/bin/env python3
"""
本番環境用: ビュー定義チェック & 修正スクリプト.

Usage:
    # 本番環境から実行（Windows）
    python check_and_fix_view.py --host localhost --port 5432 --user postgres --database lot_management --password YOUR_PASSWORD

    # チェックのみ（修正しない）
    python check_and_fix_view.py --check-only

    # 自動修正
    python check_and_fix_view.py --auto-fix

機能:
    1. v_lot_receipt_stock ビューに supplier_item_id 列が存在するかチェック
    2. 存在しない場合、ビューを再作成
    3. 再作成後、再度チェックして確認
"""

import argparse
import sys


try:
    import psycopg2
except ImportError:
    print(
        "ERROR: psycopg2 is not installed. Install it with: pip install psycopg2-binary",
        file=sys.stderr,
    )
    sys.exit(1)


def get_db_config():
    """コマンドライン引数からDB接続設定を取得."""
    parser = argparse.ArgumentParser(description="Check and fix v_lot_receipt_stock view")
    parser.add_argument("--host", required=True, help="Database host (e.g., localhost)")
    parser.add_argument("--port", type=int, default=5432, help="Database port")
    parser.add_argument("--user", required=True, help="Database user")
    parser.add_argument("--password", required=True, help="Database password")
    parser.add_argument("--database", required=True, help="Database name")
    parser.add_argument("--check-only", action="store_true", help="Check only, do not fix")
    parser.add_argument("--auto-fix", action="store_true", help="Auto-fix without confirmation")
    args = parser.parse_args()

    return {
        "host": args.host,
        "port": args.port,
        "user": args.user,
        "password": args.password,
        "database": args.database,
    }, args


def get_correct_view_sql() -> str:
    """正しいビュー定義SQLを返す。.

    これは開発環境で確認された正しい定義です。
    """
    return """
DROP VIEW IF EXISTS v_lot_receipt_stock CASCADE;

CREATE OR REPLACE VIEW v_lot_receipt_stock AS
SELECT
    lr.id AS lot_id,
    lr.id AS receipt_id,
    lm.id AS lot_master_id,
    lm.lot_number,
    COALESCE(lr.supplier_item_id, lr.product_group_id) AS product_group_id,
    COALESCE(lr.supplier_item_id, lr.product_group_id) AS supplier_item_id,
    si.maker_part_no AS product_code,
    si.maker_part_no,
    si.maker_part_no AS maker_part_code,
    si.display_name AS product_name,
    si.display_name,
    lr.warehouse_id,
    w.warehouse_code,
    w.warehouse_name,
    COALESCE(w.short_name, LEFT(w.warehouse_name, 10)) AS warehouse_short_name,
    lm.supplier_id,
    s.supplier_code,
    s.supplier_name,
    COALESCE(s.short_name, LEFT(s.supplier_name, 10)) AS supplier_short_name,
    lr.received_date,
    lr.expiry_date,
    lr.unit,
    lr.status,
    lr.received_quantity,
    lr.consumed_quantity,
    (lr.received_quantity - lr.consumed_quantity) AS current_quantity,
    GREATEST((lr.received_quantity - lr.consumed_quantity - lr.locked_quantity), 0) AS remaining_quantity,
    COALESCE(la.allocated_quantity, 0) AS allocated_quantity,
    COALESCE(la.allocated_quantity, 0) AS reserved_quantity,
    COALESCE(lar.reserved_quantity_active, 0) AS reserved_quantity_active,
    GREATEST((lr.received_quantity - lr.consumed_quantity - lr.locked_quantity - COALESCE(la.allocated_quantity, 0)), 0) AS available_quantity,
    lr.locked_quantity,
    lr.lock_reason,
    lr.inspection_status,
    lr.inspection_date,
    lr.inspection_cert_number,
    lr.shipping_date,
    lr.cost_price,
    lr.sales_price,
    lr.tax_rate,
    lr.temporary_lot_key,
    lr.origin_type,
    lr.origin_reference,
    lr.receipt_key,
    lr.created_at,
    lr.updated_at,
    CASE
        WHEN lr.expiry_date IS NOT NULL THEN (lr.expiry_date - CURRENT_DATE)
        ELSE NULL
    END AS days_to_expiry
FROM
    lot_receipts lr
    JOIN lot_master lm ON lr.lot_master_id = lm.id
    LEFT JOIN supplier_items si ON COALESCE(lr.supplier_item_id, lr.product_group_id) = si.id
    LEFT JOIN warehouses w ON lr.warehouse_id = w.id
    LEFT JOIN suppliers s ON lm.supplier_id = s.id
    LEFT JOIN v_lot_allocations la ON lr.id = la.lot_id
    LEFT JOIN v_lot_active_reservations lar ON lr.id = lar.lot_id
WHERE
    lr.status = 'active';
"""


def check_view_has_column(config: dict, view_name: str, column_name: str) -> bool:
    """ビューに指定した列が存在するかチェック。."""
    conn = None
    try:
        conn = psycopg2.connect(**config)
        cur = conn.cursor()

        cur.execute(
            """
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = %s
              AND column_name = %s
            """,
            (view_name, column_name),
        )
        result = cur.fetchone()
        return result is not None

    finally:
        if conn:
            conn.close()


def get_view_columns(config: dict, view_name: str) -> list[str]:
    """ビューの全列名を取得。."""
    conn = None
    try:
        conn = psycopg2.connect(**config)
        cur = conn.cursor()

        cur.execute(
            """
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = %s
            ORDER BY ordinal_position
            """,
            (view_name,),
        )
        return [row[0] for row in cur.fetchall()]

    finally:
        if conn:
            conn.close()


def fix_view(config: dict) -> bool:
    """ビューを正しい定義で再作成。."""
    conn = None
    try:
        conn = psycopg2.connect(**config)
        conn.autocommit = True  # DDL文は即座にコミット
        cur = conn.cursor()

        print("\n🔧 Recreating view v_lot_receipt_stock...")
        cur.execute(get_correct_view_sql())
        print("✅ View recreated successfully")
        return True

    except Exception as e:
        print(f"❌ Failed to recreate view: {e}", file=sys.stderr)
        return False

    finally:
        if conn:
            conn.close()


def main():
    config, args = get_db_config()
    view_name = "v_lot_receipt_stock"
    column_name = "supplier_item_id"

    print(f"Connecting to {config['host']}:{config['port']}/{config['database']}...")
    print("=" * 80)

    try:
        # Step 1: Check if column exists
        print(f"\n[Step 1] Checking if '{column_name}' column exists in '{view_name}'...")
        has_column = check_view_has_column(config, view_name, column_name)

        if has_column:
            print(f"✅ Column '{column_name}' EXISTS")
            print("\n🎉 No fix needed! The view is already correct.")
            return True

        print(f"❌ Column '{column_name}' NOT FOUND")

        # Show current columns
        print("\nCurrent columns:")
        columns = get_view_columns(config, view_name)
        for col in columns[:10]:
            print(f"  - {col}")
        if len(columns) > 10:
            print(f"  ... and {len(columns) - 10} more columns")

        # Step 2: Fix if needed
        if args.check_only:
            print("\n⚠️ Check-only mode: Not fixing the view")
            print("   To fix, run without --check-only flag")
            return False

        if not args.auto_fix:
            response = input("\n❓ Do you want to fix the view? (yes/no): ").strip().lower()
            if response not in ["yes", "y"]:
                print("❌ Fix cancelled by user")
                return False

        success = fix_view(config)
        if not success:
            return False

        # Step 3: Verify fix
        print("\n[Step 3] Verifying fix...")
        has_column_after = check_view_has_column(config, view_name, column_name)

        if has_column_after:
            print(f"✅ Column '{column_name}' now EXISTS")
            print("\n🎉 View fix completed successfully!")
            return True
        else:
            print(f"❌ Column '{column_name}' still NOT FOUND after fix")
            print("   Please check the SQL manually")
            return False

    except Exception as e:
        print(f"\n❌ Error: {e}", file=sys.stderr)
        import traceback

        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
