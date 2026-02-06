"""Fix supplier_items.maker_part_no to have unique supplier-specific codes.

PROBLEM:
    Current data has maker_part_no duplicating products.maker_part_code,
    causing confusion between product codes and supplier-specific part numbers.

SOLUTION:
    Generate unique supplier-specific part numbers using pattern:
    {SUPPLIER_PREFIX}-{PRODUCT_TYPE}-{SEQUENCE}

USAGE:
    docker compose exec backend python fix_supplier_part_numbers.py
"""

import sys
from datetime import UTC, datetime

from sqlalchemy import create_engine, select, text
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.infrastructure.persistence.models import Supplier, SupplierItem


# Supplier code prefixes for part number generation
SUPPLIER_PREFIXES = {
    "有限会社鈴木電気": "SUZ",
    "村上通信有限会社": "MUR",
    "岡田銀行有限会社": "OKD",
}


def get_product_type_code(product_name: str) -> str:
    """Extract product type code from product name.

    Examples:
        "六角ボルト M6 91" -> "BOLT"
        "配線ケーブル A 22" -> "CABLE"
        "ゴムパッキン B 96" -> "GASKET"
        "ナット M8 65" -> "NUT"
        "ワッシャー M6 31" -> "WASHER"
    """
    # Map Japanese product types to English codes
    type_map = {
        "ボルト": "BOLT",
        "ケーブル": "CABLE",
        "パッキン": "GASKET",
        "ナット": "NUT",
        "ワッシャー": "WASHER",
        "ネジ": "SCREW",
        "コネクタ": "CONN",
        "スイッチ": "SW",
        "センサー": "SENS",
        "モーター": "MTR",
        "リレー": "RELAY",
        "トランス": "TRANS",
        "コンデンサ": "CAP",
        "抵抗": "RES",
        "ダイオード": "DIODE",
    }

    for jp_type, eng_code in type_map.items():
        if jp_type in product_name:
            return eng_code

    # Default to first 4 characters if no match
    return product_name[:4].upper().replace(" ", "")


def generate_supplier_part_no(
    supplier_name: str,
    product_name: str,
    sequence: int,
) -> str:
    """Generate unique supplier-specific part number.

    Args:
        supplier_name: Supplier company name
        product_name: Product name for type extraction
        sequence: Sequence number for uniqueness

    Returns:
        Part number in format: {PREFIX}-{TYPE}-{SEQ:03d}
        Example: "SUZ-BOLT-001"
    """
    prefix = SUPPLIER_PREFIXES.get(supplier_name, "SUP")
    type_code = get_product_type_code(product_name)
    return f"{prefix}-{type_code}-{sequence:03d}"


def main():
    """Main execution function."""
    engine = create_engine(str(settings.DATABASE_URL))
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    try:
        print("=" * 60)
        print("Supplier Part Number Correction Script")
        print("=" * 60)

        # Get all supplier items with products
        # NOTE: Original code joined with Product (alias for SupplierItem) via product_id,
        # but SupplierItem no longer has product_id. Selecting only SupplierItem + Supplier.
        stmt = (
            select(SupplierItem, Supplier)
            .join(Supplier, SupplierItem.supplier_id == Supplier.id)
            .order_by(Supplier.supplier_name, SupplierItem.id)
        )

        results = db.execute(stmt).all()

        print(f"\nFound {len(results)} supplier items to process")
        print()

        # Track sequence numbers per supplier
        supplier_sequences = {}
        updates = []

        for si, supplier in results:
            # Get or initialize sequence for this supplier
            if supplier.id not in supplier_sequences:
                supplier_sequences[supplier.id] = 1

            old_part_no = si.maker_part_no

            # Generate new part number
            new_part_no = generate_supplier_part_no(
                supplier.supplier_name,
                si.display_name or "GENERIC",
                supplier_sequences[supplier.id],
            )

            supplier_sequences[supplier.id] += 1

            # Show change
            product_info = f"{si.maker_part_no} ({si.display_name})"
            print(f"SI #{si.id}: {supplier.supplier_name}")
            print(f"  Product: {product_info}")
            print(f"  Old: {old_part_no}")
            print(f"  New: {new_part_no}")
            print()

            updates.append(
                {
                    "si_id": si.id,
                    "old": old_part_no,
                    "new": new_part_no,
                }
            )

        # Confirm before applying
        print("=" * 60)
        print(f"Ready to update {len(updates)} supplier items")
        print("=" * 60)

        response = input("\nApply these changes? (yes/no): ")

        if response.lower() != "yes":
            print("\n❌ Operation cancelled")
            return

        # Apply updates
        print("\nApplying updates...")
        for update in updates:
            db.execute(
                text(
                    "UPDATE supplier_items SET maker_part_no = :new, updated_at = :now "
                    "WHERE id = :si_id"
                ),
                {
                    "new": update["new"],
                    "now": datetime.now(UTC),
                    "si_id": update["si_id"],
                },
            )

        db.commit()

        print(f"\n✅ Successfully updated {len(updates)} supplier items")

        # Verify no duplicates
        result = db.execute(
            text("""
                SELECT maker_part_no, COUNT(*) as cnt
                FROM supplier_items
                GROUP BY maker_part_no
                HAVING COUNT(*) > 1
            """)
        )
        duplicates = list(result)

        if duplicates:
            print(f"\n⚠️  WARNING: Found {len(duplicates)} duplicate maker_part_no values:")
            for dup in duplicates:
                print(f"  {dup[0]}: {dup[1]} occurrences")
        else:
            print("\n✅ Verified: No duplicate maker_part_no values")

    except Exception as e:
        print(f"\n❌ Error: {e}")
        db.rollback()
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    main()
