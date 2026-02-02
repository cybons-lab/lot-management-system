#!/usr/bin/env python3
"""
Direct SQL execution for non-Docker environments
本番環境用: PostgreSQLに直接接続してビューを修正

Usage:
    python fix_view_direct.py --host localhost --port 5432 --user dxpj_user --db lot_management --password <パスワード>
"""

import argparse
import sys

try:
    import psycopg2
except ImportError:
    print("ERROR: psycopg2 がインストールされていません")
    print("以下のコマンドでインストールしてください:")
    print("  pip install psycopg2-binary")
    sys.exit(1)


def get_view_sql() -> str:
    """Get view SQL for supplier_items environment"""
    return """
CREATE OR REPLACE VIEW v_lot_receipt_stock AS
SELECT
    lr.id AS receipt_id,
    lm.id AS lot_master_id,
    lm.lot_number,
    lr.product_group_id,
    lr.supplier_item_id,
    si.product_code,
    si.display_name AS product_name,
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
    lr.received_quantity AS initial_quantity,
    COALESCE(wl_sum.total_withdrawn, 0) AS withdrawn_quantity,
    GREATEST(lr.received_quantity - COALESCE(wl_sum.total_withdrawn, 0) - lr.locked_quantity, 0) AS remaining_quantity,
    COALESCE(la.allocated_quantity, 0) AS reserved_quantity,
    COALESCE(lar.reserved_quantity_active, 0) AS reserved_quantity_active,
    GREATEST(
        lr.received_quantity - COALESCE(wl_sum.total_withdrawn, 0)
        - lr.locked_quantity - COALESCE(la.allocated_quantity, 0),
        0
    ) AS available_quantity,
    lr.locked_quantity,
    lr.lock_reason,
    lr.inspection_status,
    lr.receipt_key,
    lr.created_at,
    lr.updated_at,
    CASE
        WHEN lr.expiry_date IS NOT NULL
        THEN (lr.expiry_date - CURRENT_DATE)::INTEGER
        ELSE NULL
    END AS days_to_expiry
FROM lot_receipts lr
JOIN lot_master lm ON lr.lot_master_id = lm.id
LEFT JOIN supplier_items si ON lr.supplier_item_id = si.id
LEFT JOIN warehouses w ON lr.warehouse_id = w.id
LEFT JOIN suppliers s ON lm.supplier_id = s.id
LEFT JOIN (
    SELECT wl.lot_receipt_id, SUM(wl.quantity) AS total_withdrawn
    FROM withdrawal_lines wl
    JOIN withdrawals wd ON wl.withdrawal_id = wd.id
    WHERE wd.status != 'cancelled'
    GROUP BY wl.lot_receipt_id
) wl_sum ON wl_sum.lot_receipt_id = lr.id
LEFT JOIN (
    SELECT lot_receipt_id, SUM(quantity) as allocated_quantity
    FROM lot_allocations
    WHERE status NOT IN ('cancelled', 'withdrawn')
    GROUP BY lot_receipt_id
) la ON la.lot_receipt_id = lr.id
LEFT JOIN (
    SELECT source_id, SUM(reserved_qty) AS reserved_quantity_active
    FROM lot_reservations
    WHERE status = 'active' AND source_type = 'ORDER'
    GROUP BY source_id
) lar ON lar.source_id = lr.id;
"""


def main():
    parser = argparse.ArgumentParser(description='Fix v_lot_receipt_stock view (non-Docker)')
    parser.add_argument('--host', default='localhost', help='PostgreSQL host')
    parser.add_argument('--port', type=int, default=5432, help='PostgreSQL port')
    parser.add_argument('--user', required=True, help='PostgreSQL user')
    parser.add_argument('--db', required=True, help='Database name')
    parser.add_argument('--password', required=True, help='PostgreSQL password')
    args = parser.parse_args()

    print("=== v_lot_receipt_stock View Fix (Direct SQL) ===")
    print()
    print(f"Connecting to PostgreSQL:")
    print(f"  Host: {args.host}:{args.port}")
    print(f"  User: {args.user}")
    print(f"  Database: {args.db}")
    print()

    try:
        # Connect to PostgreSQL
        conn = psycopg2.connect(
            host=args.host,
            port=args.port,
            user=args.user,
            password=args.password,
            database=args.db
        )
        print("✅ PostgreSQL接続成功")
        print()

        # Execute SQL
        cursor = conn.cursor()
        sql = get_view_sql()

        print("ビューを作成中...")
        cursor.execute(sql)
        conn.commit()
        print("✅ v_lot_receipt_stock ビュー作成成功")
        print()

        # Verify
        cursor.execute("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'v_lot_receipt_stock' AND column_name = 'supplier_item_id'
        """)
        result = cursor.fetchone()

        if result:
            print("✅ supplier_item_id カラムが存在します")
            print()
            print("完了！アプリケーションを再起動してください。")
        else:
            print("❌ supplier_item_id カラムが見つかりません")
            sys.exit(1)

        cursor.close()
        conn.close()

    except psycopg2.Error as e:
        print(f"❌ PostgreSQLエラー: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"❌ エラー: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
