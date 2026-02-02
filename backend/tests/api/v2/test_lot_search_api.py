from starlette.testclient import TestClient


def test_search_lots_basic(client: TestClient, setup_search_data):
    """Test basic search functionality."""
    product = setup_search_data["product"]
    warehouse = setup_search_data["warehouse"]

    # Create extra lots for pagination test
    for i in range(5):
        payload = {
            "supplier_item_id": product.id,
            "warehouse_id": warehouse.id,
            "lot_number": f"SEARCH-TEST-{i:03d}",
            "received_date": "2024-01-01",
            "current_quantity": 100.0,
            "unit": "pcs",
            "origin_type": "adhoc",
        }
        res = client.post("/api/v2/lot/", json=payload)
        assert res.status_code == 201

    # 1. Search by keyword
    response = client.get("/api/v2/lot/search?q=SEARCH-TEST")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 5
    assert len(data["items"]) == 5
    assert data["items"][0]["lot_number"].startswith("SEARCH-TEST")

    # 2. Pagination
    response = client.get("/api/v2/lot/search?q=SEARCH-TEST&page=1&size=2")
    data = response.json()
    assert data["total"] == 5
    assert len(data["items"]) == 2
    assert data["size"] == 2

    response = client.get("/api/v2/lot/search?q=SEARCH-TEST&page=3&size=2")
    data = response.json()
    assert len(data["items"]) == 1  # 5th item

    # 3. Filter by Product
    response = client.get(f"/api/v2/lot/search?supplier_item_id={product.id}")
    data = response.json()
    assert data["total"] >= 5

    # 4. Filter by invalid product
    response = client.get("/api/v2/lot/search?supplier_item_id=999999")
    data = response.json()
    assert data["total"] == 0


def test_search_lots_with_phase1_fields(client: TestClient, setup_search_data):
    """Test search response includes Phase 1 fields (shipping_date, etc.)."""
    product = setup_search_data["product"]
    warehouse = setup_search_data["warehouse"]

    # Create lot with full details
    payload = {
        "supplier_item_id": product.id,
        "warehouse_id": warehouse.id,
        "lot_number": "PHASE1-TEST-001",
        "received_date": "2024-02-01",
        "current_quantity": 50.0,
        "unit": "pcs",
        "origin_type": "adhoc",
        "origin_reference": "REF-12345",
        "shipping_date": "2024-03-01",
        "cost_price": 100.50,
        "sales_price": 200.00,
        "tax_rate": 0.10,
    }
    res = client.post("/api/v2/lot/", json=payload)
    assert res.status_code == 201

    # Search and verify fields
    response = client.get("/api/v2/lot/search?q=PHASE1-TEST")
    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) == 1
    item = data["items"][0]

    assert item["lot_number"] == "PHASE1-TEST-001"
    assert item["origin_type"] == "adhoc"
    assert item["origin_reference"] == "REF-12345"
    assert item["shipping_date"] == "2024-03-01"
    assert float(item["cost_price"]) == 100.5
    assert float(item["sales_price"]) == 200.0
    assert float(item["tax_rate"]) == 0.1
