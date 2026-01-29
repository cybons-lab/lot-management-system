"""Phase1 Data Audit Script.

Phase1マイグレーション実行前のデータ監査スクリプト

Usage:
    docker compose exec backend python -m app.scripts.phase1_audit

このスクリプトは以下をチェックします:
1. supplier_items.maker_part_no の NULL/空文字チェック
2. customer_items.supplier_item_id の NULL チェック
3. データの分類と修正推奨

Exit Codes:
    0: All checks passed (100% ready for Phase1 migration)
    1: Issues found (migration will fail, fix required)
"""

import sys
from datetime import date

from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session

from app.core.config import settings


def print_header(title: str) -> None:
    """Print section header."""
    print("\n" + "=" * 80)
    print(f"  {title}")
    print("=" * 80 + "\n")


def print_subsection(title: str) -> None:
    """Print subsection header."""
    print(f"\n--- {title} ---\n")


def check_supplier_items_maker_part_no(session: Session) -> tuple[bool, int]:
    """Check supplier_items.maker_part_no for NULL/empty values.

    Args:
        session: Database session

    Returns:
        Tuple of (is_valid, issue_count)
    """
    print_subsection("Step 1/2: Checking supplier_items.maker_part_no")

    result = session.execute(
        text("""
            SELECT id, supplier_id, product_group_id, maker_part_no
            FROM supplier_items
            WHERE maker_part_no IS NULL OR maker_part_no = ''
        """)
    )
    rows = result.fetchall()

    if not rows:
        print("✅ All supplier_items have valid maker_part_no")
        return True, 0

    print(f"❌ Found {len(rows)} rows with NULL or empty maker_part_no\n")
    print("Details (first 20):")
    for i, row in enumerate(rows[:20], 1):
        print(
            f"  {i}. ID: {row.id}, supplier_id: {row.supplier_id}, "
            f"product_group_id: {row.product_group_id}, maker_part_no: '{row.maker_part_no}'"
        )

    if len(rows) > 20:
        print(f"  ... and {len(rows) - 20} more rows")

    print("\nSQL to find all affected rows:")
    print("  SELECT id, supplier_id, product_group_id FROM supplier_items")
    print("  WHERE maker_part_no IS NULL OR maker_part_no = '';")

    return False, len(rows)


def check_customer_items_supplier_item_id(session: Session) -> tuple[bool, int, int]:
    """Check customer_items.supplier_item_id for NULL values.

    Args:
        session: Database session

    Returns:
        Tuple of (is_valid, active_count, inactive_count)
    """
    print_subsection("Step 2/2: Checking customer_items.supplier_item_id")

    result = session.execute(
        text("""
            SELECT
                ci.id,
                ci.customer_id,
                ci.customer_part_no,
                c.customer_name,
                ci.supplier_item_id,
                ci.valid_to
            FROM customer_items ci
            LEFT JOIN customers c ON ci.customer_id = c.id
            WHERE ci.supplier_item_id IS NULL
        """)
    )
    rows = result.fetchall()

    if not rows:
        print("✅ All customer_items have supplier_item_id mapping")
        return True, 0, 0

    # Separate active and inactive records
    today = date.today()
    active_rows = [r for r in rows if r.valid_to is None or r.valid_to >= today]
    inactive_rows = [r for r in rows if r not in active_rows]

    print(f"❌ Found {len(rows)} customer_items without supplier_item_id mapping")
    print(f"   - Active: {len(active_rows)}")
    print(f"   - Inactive: {len(inactive_rows)}\n")

    if active_rows:
        print("Active records without mapping (first 20):")
        for i, row in enumerate(active_rows[:20], 1):
            print(
                f"  {i}. ID: {row.id}, customer: {row.customer_name}, "
                f"customer_part_no: '{row.customer_part_no}'"
            )
        if len(active_rows) > 20:
            print(f"  ... and {len(active_rows) - 20} more active rows")

    if inactive_rows:
        print(f"\nInactive records without mapping: {len(inactive_rows)}")
        print("  (These should also be fixed or permanently deleted)")

    print("\nSQL to find all unmapped records:")
    print("  SELECT id, customer_id, customer_part_no, valid_to")
    print("  FROM customer_items WHERE supplier_item_id IS NULL;")

    return False, len(active_rows), len(inactive_rows)


def get_statistics(session: Session) -> dict:
    """Get overall statistics.

    Args:
        session: Database session

    Returns:
        Dictionary with statistics
    """
    stats = {}

    # supplier_items stats
    result = session.execute(text("SELECT COUNT(*) FROM supplier_items"))
    stats["supplier_items_total"] = result.scalar()

    result = session.execute(
        text(
            "SELECT COUNT(*) FROM supplier_items WHERE maker_part_no IS NOT NULL AND maker_part_no != ''"
        )
    )
    stats["supplier_items_with_maker_part_no"] = result.scalar()

    # customer_items stats
    result = session.execute(text("SELECT COUNT(*) FROM customer_items"))
    stats["customer_items_total"] = result.scalar()

    result = session.execute(
        text("SELECT COUNT(*) FROM customer_items WHERE supplier_item_id IS NOT NULL")
    )
    stats["customer_items_with_mapping"] = result.scalar()

    result = session.execute(
        text("""
            SELECT COUNT(*) FROM customer_items
            WHERE valid_to IS NULL OR valid_to >= CURRENT_DATE
        """)
    )
    stats["customer_items_active"] = result.scalar()

    return stats


def main() -> int:
    """Run Phase1 data audit.

    Returns:
        Exit code (0: success, 1: issues found)
    """
    print_header("Phase1 Data Audit: SKU-driven Inventory Management")

    # Create database connection
    engine = create_engine(settings.DATABASE_URL)

    with Session(engine) as session:
        # Get statistics
        print_subsection("Overview Statistics")
        stats = get_statistics(session)

        print("supplier_items:")
        print(f"  Total: {stats['supplier_items_total']}")
        print(f"  With maker_part_no: {stats['supplier_items_with_maker_part_no']}")
        if stats["supplier_items_total"] > 0:
            percentage = (
                stats["supplier_items_with_maker_part_no"] / stats["supplier_items_total"]
            ) * 100
            print(f"  Completion: {percentage:.1f}%")

        print("\ncustomer_items:")
        print(f"  Total: {stats['customer_items_total']}")
        print(f"  Active: {stats['customer_items_active']}")
        print(f"  With supplier_item_id: {stats['customer_items_with_mapping']}")
        if stats["customer_items_total"] > 0:
            percentage = (
                stats["customer_items_with_mapping"] / stats["customer_items_total"]
            ) * 100
            print(f"  Completion: {percentage:.1f}%")

        # Run checks
        supplier_items_ok, supplier_items_issues = check_supplier_items_maker_part_no(session)

        customer_items_ok, active_issues, inactive_issues = check_customer_items_supplier_item_id(
            session
        )

        # Summary
        print_header("Audit Summary")

        all_checks_passed = supplier_items_ok and customer_items_ok

        if all_checks_passed:
            print("✅ ALL CHECKS PASSED")
            print("\nYou can proceed with Phase1 migration:")
            print("  docker compose exec backend alembic upgrade head")
            return 0

        print("❌ ISSUES FOUND - Migration will fail\n")
        print("Action Required:")

        if not supplier_items_ok:
            print(f"\n1. Fix {supplier_items_issues} supplier_items with missing maker_part_no")
            print("   - Use the メーカー品番マスタ UI to add maker_part_no")
            print("   - Or permanently delete invalid records (admin only)")

        if not customer_items_ok:
            print(
                f"\n2. Fix {active_issues + inactive_issues} customer_items without supplier_item_id"
            )
            print(f"   - Active: {active_issues} (must fix before migration)")
            print(f"   - Inactive: {inactive_issues} (fix or delete)")
            print("   - Use the 得意先品番マスタ UI to set supplier_item_id")

        print("\nAfter fixing all issues, re-run this audit:")
        print("  docker compose exec backend python -m app.scripts.phase1_audit")

        print("\n" + "=" * 80)
        return 1


if __name__ == "__main__":
    sys.exit(main())
