import io

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session


def test_material_order_forecast_import_and_get(
    client: TestClient, db_session: Session, superuser_token_headers: dict
):
    # 1. Create a Maker (needed for enrichment)
    maker_data = {
        "maker_code": "M001",
        "maker_name": "Test Maker",
        "display_name": "TM",
        "short_name": "TM",
        "notes": "Test notes",
    }
    response = client.post("/api/makers", json=maker_data, headers=superuser_token_headers)
    assert response.status_code == 201

    # 2. Prepare CSV content (60 columns, no header)
    # A(0): YYYYMM, B(1): MatCode, C(2): Unit, D(3): WH, E(4): Jiku, F(5): Deliv, G(6): Support, H(7): Proc, I(8): MakerCode, J(9): MakerName, K(10): MatName, ...
    # L(11)-Q(16): Qty info, R(17)-AL(47): Daily Qty, AM(48)-AX(59): Period Qty

    row = [
        "202405",
        "MAT001",
        "PC",
        "WH01",
        "J01",
        "DP01",
        "SUP01",
        "TYPE1",
        "M001",
        "Test Maker",
        "Material 1",
    ]
    row += ["100", "200", "300", "Admin", "400", "500"]  # L-Q
    row += ["10"] * 31  # R-AL (Daily)
    row += ["5"] * 12  # AM-AX (Period)

    # Ensure exactly 60 columns or more
    assert len(row) >= 60

    csv_line = ",".join(row)
    csv_content = csv_line + "\n"

    csv_file = io.BytesIO(csv_content.encode("utf-8"))

    # 3. Import CSV
    # target_month is optional since it's in A column
    files = {"file": ("test.csv", csv_file, "text/csv")}

    response = client.post(
        "/api/material-order-forecasts/import", files=files, headers=superuser_token_headers
    )
    if response.status_code != 200:
        print(f"Import failed: {response.status_code}")
        print(f"Response body: {response.text}")
    assert response.status_code == 200
    result = response.json()
    assert result["success"] is True
    assert result["imported_count"] == 1
    assert result["target_month"] == "2024-05"

    # 4. Get forecasts and verify
    response = client.get(
        "/api/material-order-forecasts",
        params={"target_month": "2024-05"},
        headers=superuser_token_headers,
    )
    if response.status_code != 200:
        print(f"Get forecasts failed: {response.status_code}")
        print(f"Response body: {response.text}")
    assert response.status_code == 200
    data = response.json()
    assert data["total_count"] == 1
    forecast = data["items"][0]
    assert forecast["material_code"] == "MAT001"
    assert forecast["maker_code"] == "M001"
    assert float(forecast["daily_quantities"]["1"]) == 10.0
    assert float(forecast["daily_quantities"]["31"]) == 10.0
    assert float(forecast["delivery_lot"]) == 100.0
