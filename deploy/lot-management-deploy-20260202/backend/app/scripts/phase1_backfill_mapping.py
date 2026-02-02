"""Phase1 Backfill Script - Auto-fill supplier_item_id mappings.

customer_items の supplier_item_id を自動的に設定するスクリプト

Usage:
    # Dry-run (preview only)
    docker compose exec backend python -m app.scripts.phase1_backfill_mapping --dry-run

    # Execute backfill
    docker compose exec backend python -m app.scripts.phase1_backfill_mapping

Strategy:
    customer_items の supplier_item_id を使って、対応する supplier_items を検索し、
    supplier_item_id を自動設定します。

    Matching logic:
    1. supplier_item_id が一致する supplier_items を検索
    2. 複数ある場合は is_primary=True を優先
    3. 見つかった supplier_item_id を customer_items に設定
"""

import argparse
import sys

from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session

from app.core.config import settings


def print_header(title: str) -> None:
    """Print section header."""
    print("\n" + "=" * 80)
    print(f"  {title}")
    print("=" * 80 + "\n")


def backfill_supplier_item_mappings(session: Session, dry_run: bool = True) -> tuple[int, int, int]:
    """Backfill customer_items.supplier_item_id based on supplier_item_id.

    Args:
        session: Database session
        dry_run: If True, only preview changes without committing

    Returns:
        Tuple of (updated_count, not_found_count, skipped_count)
    """
    # Find all customer_items without supplier_item_id
    result = session.execute(
        text("""
            SELECT
                ci.id,
                ci.customer_part_no,
                ci.supplier_item_id,
                ci.supplier_id as old_supplier_id,
                c.customer_name
            FROM customer_items ci
            LEFT JOIN customers c ON ci.customer_id = c.id
            WHERE ci.supplier_item_id IS NULL
            ORDER BY ci.id
        """)
    )
    unmapped = result.fetchall()

    if not unmapped:
        print("✅ No unmapped customer_items found")
        return 0, 0, 0

    print(f"Found {len(unmapped)} customer_items without supplier_item_id\n")

    updated_count = 0
    not_found_count = 0
    skipped_count = 0

    for item in unmapped:
        customer_item_id = item.id
        supplier_item_id = item.supplier_item_id
        customer_part_no = item.customer_part_no
        customer_name = item.customer_name

        if supplier_item_id is None:
            print(f"  ⚠️  ID {customer_item_id}: No supplier_item_id, cannot map")
            skipped_count += 1
            continue

        # Find supplier_item for this supplier_item_id
        # Priority: is_primary=True, then any
        result = session.execute(
            text("""
                SELECT id, maker_part_no, supplier_id, is_primary
                FROM supplier_items
                WHERE supplier_item_id = :supplier_item_id
                ORDER BY is_primary DESC, id ASC
                LIMIT 1
            """),
            {"supplier_item_id": supplier_item_id},
        )
        supplier_item = result.first()

        if not supplier_item:
            print(
                f"  ❌ ID {customer_item_id} ({customer_name}): "
                f"No supplier_item found for supplier_item_id={supplier_item_id}"
            )
            not_found_count += 1
            continue

        supplier_item_id = supplier_item.id
        maker_part_no = supplier_item.maker_part_no
        supplier_id = supplier_item.supplier_id
        is_primary = supplier_item.is_primary

        # Update customer_items.supplier_item_id
        if dry_run:
            print(
                f"  [DRY-RUN] ID {customer_item_id} ({customer_name}, {customer_part_no}): "
                f"Would set supplier_item_id={supplier_item_id} "
                f"(maker_part_no='{maker_part_no}', supplier={supplier_id}, "
                f"primary={is_primary})"
            )
        else:
            session.execute(
                text("""
                    UPDATE customer_items
                    SET supplier_item_id = :supplier_item_id
                    WHERE id = :customer_item_id
                """),
                {"supplier_item_id": supplier_item_id, "customer_item_id": customer_item_id},
            )
            print(
                f"  ✅ ID {customer_item_id} ({customer_name}, {customer_part_no}): "
                f"Set supplier_item_id={supplier_item_id} "
                f"(maker_part_no='{maker_part_no}')"
            )

        updated_count += 1

    if not dry_run:
        session.commit()
        print("\n✅ Changes committed to database")
    else:
        print("\n⚠️  DRY-RUN mode: No changes were made")

    return updated_count, not_found_count, skipped_count


def main() -> int:
    """Run Phase1 backfill script.

    Returns:
        Exit code (0: success, 1: errors found)
    """
    parser = argparse.ArgumentParser(
        description="Phase1: Backfill customer_items.supplier_item_id mappings"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview changes without committing (default: False)",
    )
    args = parser.parse_args()

    mode = "DRY-RUN" if args.dry_run else "EXECUTE"
    print_header(f"Phase1 Backfill: supplier_item_id Mapping ({mode})")

    if args.dry_run:
        print("⚠️  Running in DRY-RUN mode - no changes will be made")
        print("    To execute changes, run without --dry-run flag\n")
    else:
        print("⚠️  Running in EXECUTE mode - changes will be committed")
        print("    Press Ctrl+C to cancel within 3 seconds...")
        import time

        try:
            time.sleep(3)
        except KeyboardInterrupt:
            print("\n\nCancelled by user")
            return 0
        print()

    # Create database connection
    engine = create_engine(settings.DATABASE_URL)

    with Session(engine) as session:
        updated, not_found, skipped = backfill_supplier_item_mappings(session, dry_run=args.dry_run)

        # Summary
        print_header("Backfill Summary")
        print(f"Updated: {updated}")
        print(f"Not found: {not_found}")
        print(f"Skipped: {skipped}")

        if args.dry_run:
            print("\nTo execute these changes, run:")
            print("  docker compose exec backend python -m app.scripts.phase1_backfill_mapping")
        elif not_found > 0 or skipped > 0:
            print("\n⚠️  Some items could not be mapped automatically")
            print("    Please fix these manually via the 得意先品番マスタ UI")
        else:
            print("\n✅ All mappings completed successfully")
            print("\nNext steps:")
            print(
                "  1. Run audit to verify: docker compose exec backend python -m app.scripts.phase1_audit"
            )
            print(
                "  2. If audit passes, run migration: docker compose exec backend alembic upgrade head"
            )

        return 1 if (not_found > 0 or skipped > 0) else 0


if __name__ == "__main__":
    sys.exit(main())
