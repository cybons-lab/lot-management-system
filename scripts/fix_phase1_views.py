#!/usr/bin/env python3
"""
Phase1 Migration View Fix Script
各環境のDB状態をチェックして適切なビュー定義を適用します

Usage:
    python scripts/fix_phase1_views.py

    Or with custom settings:
    python scripts/fix_phase1_views.py --container my-postgres --user admin --db lot_management
"""

import subprocess
import sys
import argparse
from typing import Literal

# Color codes
class Colors:
    RED = '\033[0;31m'
    GREEN = '\033[0;32m'
    YELLOW = '\033[1;33m'
    NC = '\033[0m'  # No Color


def execute_sql(container: str, user: str, db: str, sql: str) -> str:
    """Execute SQL and return result"""
    try:
        result = subprocess.run(
            ["docker", "exec", "-i", container, "psql", "-U", user, "-d", db, "-t", "-A", "-c", sql],
            capture_output=True,
            text=True,
            check=False
        )
        if result.returncode != 0:
            return "ERROR"
        return result.stdout.strip()
    except Exception:
        return "ERROR"


def check_table_exists(container: str, user: str, db: str, table_name: str) -> bool:
    """Check if table exists"""
    sql = f"SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '{table_name}');"
    result = execute_sql(container, user, db, sql)
    return result == "t"


def check_column_exists(container: str, user: str, db: str, table_name: str, column_name: str) -> bool:
    """Check if column exists in table"""
    sql = f"SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '{table_name}' AND column_name = '{column_name}');"
    result = execute_sql(container, user, db, sql)
    return result == "t"


def execute_sql_file(container: str, user: str, db: str, sql: str) -> bool:
    """Execute SQL from string"""
    try:
        result = subprocess.run(
            ["docker", "exec", "-i", container, "psql", "-U", user, "-d", db],
            input=sql,
            capture_output=True,
            text=True,
            check=False
        )
        return result.returncode == 0
    except Exception:
        return False


def get_view_sql_product_groups() -> str:
    """Get view SQL for product_groups environment"""
    return """
CREATE OR REPLACE VIEW v_lot_receipt_stock AS
SELECT
    lr.id AS receipt_id,
    lm.id AS lot_master_id,
    lm.lot_number,
    lr.product_group_id,
    lr.supplier_item_id,
    p.maker_part_code AS product_code,
    p.product_name,
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
LEFT JOIN product_groups p ON lr.product_group_id = p.id
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


def get_view_sql_supplier_items() -> str:
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
    parser = argparse.ArgumentParser(description='Fix Phase1 views for all environments')
    parser.add_argument('--container', default='lot-db-postgres', help='PostgreSQL container name')
    parser.add_argument('--user', default='admin', help='PostgreSQL user')
    parser.add_argument('--db', default='lot_management', help='Database name')
    args = parser.parse_args()

    container = args.container
    user = args.user
    db = args.db

    print("=== Phase1 View Fix Script ===")
    print()
    print("Using PostgreSQL connection:")
    print(f"  Container: {container}")
    print(f"  User: {user}")
    print(f"  Database: {db}")
    print()

    # Step 1: Check environment
    print("Step 1: 環境の状態をチェック...")
    print()

    print("  [CHECK] products テーブル: ", end="")
    has_products = check_table_exists(container, user, db, "products")
    if has_products:
        print(f"{Colors.YELLOW}存在 (Phase1未適用){Colors.NC}")
    else:
        print(f"{Colors.GREEN}なし{Colors.NC}")

    print("  [CHECK] product_groups テーブル: ", end="")
    has_product_groups = check_table_exists(container, user, db, "product_groups")
    if has_product_groups:
        print(f"{Colors.YELLOW}存在 (Phase1途中){Colors.NC}")
    else:
        print(f"{Colors.GREEN}なし{Colors.NC}")

    print("  [CHECK] supplier_items テーブル: ", end="")
    has_supplier_items = check_table_exists(container, user, db, "supplier_items")
    if has_supplier_items:
        print(f"{Colors.GREEN}存在 (Phase1完了){Colors.NC}")
    else:
        print(f"{Colors.RED}なし (異常){Colors.NC}")

    print("  [CHECK] lot_receipts.supplier_item_id: ", end="")
    has_lr_supplier_item = check_column_exists(container, user, db, "lot_receipts", "supplier_item_id")
    if has_lr_supplier_item:
        print(f"{Colors.GREEN}存在{Colors.NC}")
    else:
        print(f"{Colors.RED}なし (Phase1未完了){Colors.NC}")

    print("  [CHECK] v_lot_receipt_stock ビュー: ", end="")
    has_view = check_table_exists(container, user, db, "v_lot_receipt_stock")
    needs_fix = False
    if has_view:
        print(f"{Colors.GREEN}存在{Colors.NC}")
        print("  [CHECK] v_lot_receipt_stock.supplier_item_id: ", end="")
        has_view_supplier_item = check_column_exists(container, user, db, "v_lot_receipt_stock", "supplier_item_id")
        if has_view_supplier_item:
            print(f"{Colors.GREEN}存在{Colors.NC}")
        else:
            print(f"{Colors.RED}なし (要修正){Colors.NC}")
            needs_fix = True
    else:
        print(f"{Colors.RED}なし (要作成){Colors.NC}")
        needs_fix = True

    print()
    print("Step 2: 環境判定...")
    print()

    # Determine environment type
    if has_products:
        print(f"{Colors.YELLOW}環境タイプ: Phase1未適用 (products テーブル使用){Colors.NC}")
        print("  ⚠️  この環境では Phase1 マイグレーションを先に実行してください")
        print("  docker compose exec backend alembic upgrade head")
        sys.exit(1)
    elif has_product_groups:
        env_type = "phase1-intermediate"
        print(f"{Colors.YELLOW}環境タイプ: Phase1途中 (product_groups テーブル使用){Colors.NC}")
    elif has_supplier_items and has_lr_supplier_item:
        env_type = "phase1-complete"
        print(f"{Colors.GREEN}環境タイプ: Phase1完了 (supplier_items テーブル使用){Colors.NC}")
    else:
        print(f"{Colors.RED}環境タイプ: 不明 (異常な状態){Colors.NC}")
        sys.exit(1)

    print()

    # Check if fix is needed
    if not needs_fix:
        print(f"{Colors.GREEN}✅ ビューは正常です。修正不要。{Colors.NC}")
        sys.exit(0)

    # Step 3: Fix view
    print("Step 3: ビューを修正...")
    print()

    if env_type == "phase1-intermediate":
        sql = get_view_sql_product_groups()
    else:  # phase1-complete
        sql = get_view_sql_supplier_items()

    print("  [実行] ビュー再作成...")
    success = execute_sql_file(container, user, db, sql)

    if success:
        print(f"  {Colors.GREEN}✅ ビュー再作成成功{Colors.NC}")
    else:
        print(f"  {Colors.RED}❌ ビュー再作成失敗{Colors.NC}")
        sys.exit(1)

    print()
    print("Step 4: 修正結果を確認...")
    print()

    # Verify
    has_view_supplier_item_after = check_column_exists(container, user, db, "v_lot_receipt_stock", "supplier_item_id")
    if has_view_supplier_item_after:
        print(f"{Colors.GREEN}✅ v_lot_receipt_stock.supplier_item_id が存在します{Colors.NC}")
        print()
        print(f"{Colors.GREEN}修正完了！バックエンドを再起動してください:{Colors.NC}")
        print("  docker compose restart backend")
    else:
        print(f"{Colors.RED}❌ supplier_item_id カラムが見つかりません{Colors.NC}")
        sys.exit(1)


if __name__ == "__main__":
    main()
