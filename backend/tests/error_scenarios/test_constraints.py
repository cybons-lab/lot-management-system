import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.infrastructure.persistence.models import Role


@pytest.mark.skip(reason="POST /api/roles/ not implemented yet")
def test_duplicate_role_code(
    client: TestClient, db: Session, superuser_token_headers: dict[str, str]
):
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
        headers=superuser_token_headers,
    )

    # Should return 409 Conflict or 400 Bad Request depending on implementation
    # Ideally 409 for unique constraint violation
    assert response.status_code in [400, 409]
    assert "already exists" in response.text.lower() or "duplicate" in response.text.lower()
