#!/usr/bin/env python3
"""Phase1 Production Hotfix Script.

本番環境用の緊急修正スクリプト

Usage:
    python fix_phase1_production.py

環境変数から自動的に接続情報を取得します。
DATABASE_URL または個別の環境変数 (POSTGRES_HOST, POSTGRES_USER等) を使用。
"""

import os
import sys


# Windows環境でのUTF-8エンコーディング問題を回避
if sys.platform == "win32":
    import io

    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8")

try:
    import psycopg2
except ImportError:
    print("=" * 60)
    print("ERROR: psycopg2 がインストールされていません")
    print("=" * 60)
    print()
    print("以下のコマンドでインストールしてください:")
    print()
    print("  pip install psycopg2-binary")
    print()
    print("または:")
    print()
    print("  pip install psycopg2")
    print()
    sys.exit(1)


def get_db_config():
    """Get database configuration from environment variables."""
    # Try DATABASE_URL first
    database_url = os.getenv("DATABASE_URL")

    if database_url:
        # Parse DATABASE_URL (format: postgresql://user:password@host:port/dbname)
        try:
            from urllib.parse import urlparse

            result = urlparse(database_url)
            return {
                "host": result.hostname or "localhost",
                "port": result.port or 5432,
                "user": result.username or "postgres",
                "password": result.password or "",
                "database": result.path.lstrip("/") if result.path else "lot_management",
            }
        except Exception:
            pass

    # Fall back to individual environment variables
    return {
        "host": os.getenv("POSTGRES_HOST", "localhost"),
        "port": int(os.getenv("POSTGRES_PORT", "5432")),
        "user": os.getenv("POSTGRES_USER", "admin"),
        "password": os.getenv("POSTGRES_PASSWORD", ""),
        "database": os.getenv("POSTGRES_DB", "lot_management"),
    }


def get_view_sql() -> str:
    """Get v_lot_receipt_stock view SQL."""
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
    print("=" * 70)
    print("Phase1 Production Hotfix Script")
    print("v_lot_receipt_stock ビュー修正")
    print("=" * 70)
    print()

    # Get database configuration
    config = get_db_config()

    print("接続情報:")
    print(f"  Host: {config['host']}:{config['port']}")
    print(f"  User: {config['user']}")
    print(f"  Database: {config['database']}")
    print()

    # Prompt for password if not set
    if not config["password"]:
        import getpass

        config["password"] = getpass.getpass("Password: ")
        print()

    try:
        # Connect to PostgreSQL
        print("PostgreSQL に接続中...")
        conn = psycopg2.connect(**config)
        print("✅ 接続成功")
        print()

        cursor = conn.cursor()

        # Check environment
        print("環境チェック中...")
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_schema = 'public' AND table_name = 'supplier_items'
            )
        """)
        has_supplier_items = cursor.fetchone()[0]

        if not has_supplier_items:
            print("❌ ERROR: supplier_items テーブルが存在しません")
            print("   この環境は Phase1 が完了していません")
            print("   先に Phase1 マイグレーションを実行してください")
            sys.exit(1)

        print("✅ supplier_items テーブル: 存在")

        # Check current view
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_schema = 'public' AND table_name = 'v_lot_receipt_stock'
            )
        """)
        has_view = cursor.fetchone()[0]

        if has_view:
            cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.columns
                    WHERE table_schema = 'public'
                    AND table_name = 'v_lot_receipt_stock'
                    AND column_name = 'supplier_item_id'
                )
            """)
            has_supplier_item_id = cursor.fetchone()[0]

            if has_supplier_item_id:
                print("✅ v_lot_receipt_stock.supplier_item_id: 既に存在")
                print()
                print("修正不要です。ビューは正常です。")
                cursor.close()
                conn.close()
                return

        print()
        print("-" * 70)
        print("ビューを修正します...")
        print("-" * 70)
        print()

        # Execute view creation SQL
        sql = get_view_sql()
        cursor.execute(sql)
        conn.commit()

        print("✅ v_lot_receipt_stock ビュー作成成功")
        print()

        # Verify
        cursor.execute("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = 'public'
            AND table_name = 'v_lot_receipt_stock'
            AND column_name = 'supplier_item_id'
        """)
        result = cursor.fetchone()

        if result:
            print("=" * 70)
            print("✅ 修正完了！")
            print("=" * 70)
            print()
            print("次の手順:")
            print("  1. アプリケーションを再起動してください")
            print("  2. 得意先品番マッピングページで動作確認")
            print("  3. 在庫一覧ページで動作確認")
            print()
        else:
            print("❌ ERROR: supplier_item_id カラムが見つかりません")
            print("   ビュー作成に失敗した可能性があります")
            sys.exit(1)

        cursor.close()
        conn.close()

    except psycopg2.OperationalError as e:
        print()
        print("=" * 70)
        print("❌ PostgreSQL 接続エラー")
        print("=" * 70)
        print()
        print(f"エラー詳細: {e}")
        print()
        print("確認してください:")
        print("  1. PostgreSQL サーバーが起動しているか")
        print("  2. 接続情報（ホスト、ポート、ユーザー名、パスワード）が正しいか")
        print("  3. ファイアウォールでポートが開いているか")
        print()
        sys.exit(1)

    except psycopg2.Error as e:
        print()
        print("=" * 70)
        print("❌ PostgreSQL エラー")
        print("=" * 70)
        print()
        print(f"エラー詳細: {e}")
        print()
        sys.exit(1)

    except Exception as e:
        print()
        print("=" * 70)
        print("❌ 予期しないエラー")
        print("=" * 70)
        print()
        print(f"エラー詳細: {e}")
        print()
        import traceback

        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
