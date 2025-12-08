from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.infrastructure.persistence.models import Role


def test_duplicate_role_code(client: TestClient, db: Session):
    """Test creating a role with duplicate code."""
    # Create a role directly in DB
    role = Role(role_code="ROLE_TEST_DUP", role_name="Test Role Duplicate")
    db.add(role)
    db.commit()

    # Try to create same role via API
    response = client.post(
        "/api/roles/",
        json={
            "role_code": "ROLE_TEST_DUP",
            "role_name": "Another Name",
            "description": "Duplicate code",
        },
    )

    # Should return 409 Conflict or 400 Bad Request depending on implementation
    # Ideally 409 for unique constraint violation
    assert response.status_code in [400, 409]
    assert "already exists" in response.text.lower() or "duplicate" in response.text.lower()


def test_foreign_key_violation(client: TestClient):
    """Test foreign key violation."""
    # Try to create a user with non-existent role assignment?
    # Or create a product with non-existent supplier?
    # Usually these are caught by Pydantic validation if we check existence.
    # But if we bypass validation or if validation doesn't check DB, it hits DB constraint.

    # Let's try creating an order with non-existent customer
    # Pydantic schema usually just validates type (int).
    # Service layer might check existence.
    # If service layer checks, it returns 404 or 400.
    # If it hits DB, it raises IntegrityError which should be handled.

    response = client.post(
        "/api/orders/",
        json={
            "customer_id": 999999,  # Non-existent
            "delivery_place_id": 999999,
            "order_date": "2025-01-01",
            "lines": [],
        },
    )

    # Should be 404 Not Found (if checked) or 400/409/422
    # In our implementation, we likely check existence in service.
    assert response.status_code in [400, 404, 409, 422]
