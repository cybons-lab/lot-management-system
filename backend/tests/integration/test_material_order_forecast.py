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


def test_material_order_forecast_import_accepts_cp932(
    client: TestClient, db_session: Session, superuser_token_headers: dict
):
    maker_data = {
        "maker_code": "M002",
        "maker_name": "テストメーカー",
        "display_name": "TM2",
        "short_name": "TM2",
        "notes": "cp932 test",
    }
    response = client.post("/api/makers", json=maker_data, headers=superuser_token_headers)
    assert response.status_code == 201

    row = [
        "202405",
        "MAT002",
        "PC",
        "WH01",
        "J01",
        "DP01",
        "SUP01",
        "TYPE1",
        "M002",
        "テストメーカー",
        "材質A",
    ]
    row += ["100", "200", "300", "担当A", "400", "500"]
    row += ["10"] * 31
    row += ["5"] * 12

    csv_line = ",".join(row)
    csv_content = csv_line + "\n"
    csv_file = io.BytesIO(csv_content.encode("cp932"))

    files = {"file": ("cp932.csv", csv_file, "text/csv")}
    response = client.post(
        "/api/material-order-forecasts/import", files=files, headers=superuser_token_headers
    )
    assert response.status_code == 200
    result = response.json()
    assert result["success"] is True
    assert result["imported_count"] == 1


def test_material_order_forecast_import_rejects_short_columns(
    client: TestClient, superuser_token_headers: dict
):
    short_row = ["202405", "MAT001", "PC", "WH01", "J01", "DP01"]
    csv_content = ",".join(short_row) + "\n"
    csv_file = io.BytesIO(csv_content.encode("utf-8"))
    files = {"file": ("short.csv", csv_file, "text/csv")}

    response = client.post(
        "/api/material-order-forecasts/import", files=files, headers=superuser_token_headers
    )
    assert response.status_code == 400
    assert "CSV列数が不足" in response.json()["detail"]


def test_material_order_forecast_import_58cols_warns_but_imports(
    client: TestClient, db_session: Session, superuser_token_headers: dict
):
    maker_data = {
        "maker_code": "M058",
        "maker_name": "Maker58",
        "display_name": "M58",
        "short_name": "M58",
        "notes": "58col test",
    }
    response = client.post("/api/makers", json=maker_data, headers=superuser_token_headers)
    assert response.status_code == 201

    canonical_60 = [
        "202405",  # A 対象月
        "MAT058",  # B 材質コード
        "PC",  # C 単位
        "WH01",  # D 倉庫
        "",  # E 次区（欠損）
        "DP58",  # F 納入先
        "SUP01",  # G 支給先
        "TYPE1",  # H 支購
        "M058",  # I メーカー
        "",  # J メーカー名（欠損）
        "Material58",  # K 材質
    ]
    canonical_60 += ["100", "200", "300", "Admin", "400", "500"]  # L-Q
    canonical_60 += ["10"] * 31  # R-AL
    canonical_60 += ["5"] * 12  # AM-AX
    assert len(canonical_60) == 60

    # 58列版（E:次区 と J:メーカー名を除外）
    row_58 = canonical_60[:]
    del row_58[9]  # J
    del row_58[4]  # E
    assert len(row_58) == 58

    csv_content = ",".join(row_58) + "\n"
    csv_file = io.BytesIO(csv_content.encode("utf-8"))
    files = {"file": ("58cols.csv", csv_file, "text/csv")}

    response = client.post(
        "/api/material-order-forecasts/import", files=files, headers=superuser_token_headers
    )
    assert response.status_code == 200
    result = response.json()
    assert result["success"] is True
    assert result["imported_count"] == 1
    assert result["warnings"]


def test_material_order_forecast_import_uses_first_column_for_target_month(
    client: TestClient, db_session: Session, superuser_token_headers: dict
):
    maker_data = {
        "maker_code": "MB01",
        "maker_name": "Month B Maker",
        "display_name": "MB",
        "short_name": "MB",
        "notes": "b-col month test",
    }
    response = client.post("/api/makers", json=maker_data, headers=superuser_token_headers)
    assert response.status_code == 201

    # 取込時の先頭列（元CSV B列相当）を対象月として扱う
    row = [
        "202406",
        "MAT-B",
        "PC",
        "WH01",
        "J01",
        "DP01",
        "SUP01",
        "TYPE1",
        "MB01",
        "Month B Maker",
        "Material B",
    ]
    row += ["100", "200", "300", "Admin", "400", "500"]
    row += ["10"] * 31
    row += ["5"] * 12
    assert len(row) == 60

    csv_file = io.BytesIO((",".join(row) + "\n").encode("utf-8"))
    files = {"file": ("bcol-month.csv", csv_file, "text/csv")}
    response = client.post(
        "/api/material-order-forecasts/import", files=files, headers=superuser_token_headers
    )
    assert response.status_code == 200
    result = response.json()
    assert result["success"] is True
    assert result["target_month"] == "2024-06"


def test_material_order_forecast_import_rejects_invalid_first_column_month(
    client: TestClient, db_session: Session, superuser_token_headers: dict
):
    maker_data = {
        "maker_code": "MB02",
        "maker_name": "Month Invalid Maker",
        "display_name": "MB2",
        "short_name": "MB2",
        "notes": "invalid first col month test",
    }
    response = client.post("/api/makers", json=maker_data, headers=superuser_token_headers)
    assert response.status_code == 201

    row = [
        "NOT_MONTH",
        "202406",
        "PC",
        "WH01",
        "J01",
        "DP01",
        "SUP01",
        "TYPE1",
        "MB02",
        "Month Invalid Maker",
        "Material Invalid",
    ]
    row += ["100", "200", "300", "Admin", "400", "500"]
    row += ["10"] * 31
    row += ["5"] * 12
    assert len(row) == 60

    csv_file = io.BytesIO((",".join(row) + "\n").encode("utf-8"))
    files = {"file": ("invalid-first-col-month.csv", csv_file, "text/csv")}
    response = client.post(
        "/api/material-order-forecasts/import", files=files, headers=superuser_token_headers
    )
    assert response.status_code == 400
    assert "対象月の形式が不正" in response.json()["detail"]


def test_material_order_forecast_delete(
    client: TestClient, db_session: Session, superuser_token_headers: dict
):
    maker_data = {
        "maker_code": "MDEL",
        "maker_name": "Delete Maker",
        "display_name": "DEL",
        "short_name": "DEL",
        "notes": "delete test",
    }
    response = client.post("/api/makers", json=maker_data, headers=superuser_token_headers)
    assert response.status_code == 201

    row = [
        "202405",
        "MATDEL",
        "PC",
        "WH01",
        "J01",
        "DP01",
        "SUP01",
        "TYPE1",
        "MDEL",
        "Delete Maker",
        "Material Delete",
    ]
    row += ["100", "200", "300", "Admin", "400", "500"]
    row += ["10"] * 31
    row += ["5"] * 12

    csv_file = io.BytesIO((",".join(row) + "\n").encode("utf-8"))
    files = {"file": ("delete.csv", csv_file, "text/csv")}
    import_response = client.post(
        "/api/material-order-forecasts/import", files=files, headers=superuser_token_headers
    )
    assert import_response.status_code == 200

    get_response = client.get(
        "/api/material-order-forecasts",
        params={"target_month": "2024-05"},
        headers=superuser_token_headers,
    )
    assert get_response.status_code == 200
    item = get_response.json()["items"][0]

    delete_response = client.delete(
        f"/api/material-order-forecasts/{item['id']}",
        headers=superuser_token_headers,
    )
    assert delete_response.status_code == 204

    get_after_response = client.get(
        "/api/material-order-forecasts",
        params={"target_month": "2024-05"},
        headers=superuser_token_headers,
    )
    assert get_after_response.status_code == 200
    assert get_after_response.json()["total_count"] == 0
