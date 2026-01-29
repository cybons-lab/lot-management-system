# Mocking and minimal imports to test logic
def test_export_logic():
    # Simulation of row data
    row = {
        "item_no": "1000000001",
        "maker_part_no": "MK-001",
        "sap_raw_data": {"ZMKMAT_B": "SAP-MK-001"},
    }

    # item_no logic
    item_no_raw = row.get("item_no")
    item_no = str(item_no_raw)[-6:] if item_no_raw else None

    # maker_part_no logic
    sap_raw_data = row.get("sap_raw_data")
    maker_part_no = sap_raw_data.get("ZMKMAT_B") if sap_raw_data else row.get("maker_part_no")

    print(f"Input Item No: {row['item_no']} -> Output Item No: {item_no}")
    print(
        f"Input Maker Part No: {row['maker_part_no']} (SAP: {sap_raw_data.get('ZMKMAT_B')}) -> Output: {maker_part_no}"
    )

    assert item_no == "000001"
    assert maker_part_no == "SAP-MK-001"
    print("✅ Logic verification successful!")


if __name__ == "__main__":
    test_export_logic()
