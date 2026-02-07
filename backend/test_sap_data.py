#!/usr/bin/env python3
"""Test script to verify SAP data is added to SmartRead test data."""

import sys


sys.path.insert(0, "/app")

from app.application.services.test_data.smartread import (
    clear_smartread_data,
    generate_smartread_data,
)
from app.core.database import SessionLocal
from app.infrastructure.persistence.models.smartread_models import SmartReadLongData


def test_sap_data():
    """Verify SAP data is present in SmartReadLongData."""
    db = SessionLocal()
    try:
        # Clear and regenerate test data
        print("Clearing existing data...")
        clear_smartread_data(db)
        db.commit()

        print("Generating new test data...")
        generate_smartread_data(db)
        db.commit()

        # Query a few records to verify SAP data
        print("\nChecking SAP data in SmartReadLongData...")
        long_records = db.query(SmartReadLongData).limit(10).all()

        for record in long_records:
            material_code = record.content.get("材質コード")
            sap_supplier_code = record.content.get("SAP仕入先コード")
            sap_supplier_name = record.content.get("SAP仕入先名")
            sap_qty_unit = record.content.get("数量単位")

            print(f"\nRecord ID: {record.id}")
            print(f"  Material Code: {material_code}")
            print(f"  SAP Supplier Code: {sap_supplier_code}")
            print(f"  SAP Supplier Name: {sap_supplier_name}")
            print(f"  Quantity Unit: {sap_qty_unit}")

            # Verify data matches expected mapping
            expected_mapping = {
                "M001": ("S001", "仕入先名_S001", "KG"),
                "M002": ("S002", "仕入先名_S002", "PC"),
                "M003": ("S001", "仕入先名_S001", "M"),
                "M004": ("S002", "仕入先名_S002", "KG"),
            }

            if material_code in expected_mapping:
                expected = expected_mapping[material_code]
                assert sap_supplier_code == expected[0], (
                    f"Expected {expected[0]}, got {sap_supplier_code}"
                )
                assert sap_supplier_name == expected[1], (
                    f"Expected {expected[1]}, got {sap_supplier_name}"
                )
                assert sap_qty_unit == expected[2], f"Expected {expected[2]}, got {sap_qty_unit}"
                print("  ✓ SAP data verified!")
            else:
                # Unknown material codes should use default
                assert sap_supplier_code == "S999", f"Expected S999, got {sap_supplier_code}"
                assert sap_supplier_name == "その他仕入先", (
                    f"Expected 'その他仕入先', got {sap_supplier_name}"
                )
                assert sap_qty_unit == "EA", f"Expected EA, got {sap_qty_unit}"
                print("  ✓ Default SAP data verified!")

        print("\n✅ All SAP data verification passed!")

    finally:
        db.close()


if __name__ == "__main__":
    test_sap_data()
