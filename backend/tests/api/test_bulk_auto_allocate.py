from fastapi.testclient import TestClient
from sqlalchemy.orm import Session


def test_bulk_auto_allocate_endpoint_reachability(db: Session, client: TestClient):
    """Test bulk auto-allocate endpoint reachability."""

    # Needs valid DB objects to not fail on logic, but for 404 check even empty is fine to check reachability.
    # However, let's make it a valid call.

    response = client.post(
        "/api/allocations/bulk-auto-allocate",
        json={"product_group_id": 999999},  # Non-existent ID to return 0 results
    )
    # If endpoint exists, it should return 200 (or 4xx/5xx handling logic), but NOT 404.
    assert response.status_code == 200
    data = response.json()
    assert "processed_lines" in data
    assert "allocated_lines" in data
