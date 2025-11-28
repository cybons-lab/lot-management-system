import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.models.auth_models import User
from app.services.auth.auth_service import AuthService
from app.services.auth.user_service import UserService


@pytest.fixture
def test_user(db_session: Session):
    """Create a test user."""
    user_service = UserService(db_session)
    # Check if user exists first
    existing = user_service.get_by_username("testuser")
    if existing:
        return existing

    from app.schemas.system.users_schema import UserCreate

    user_in = UserCreate(
        username="testuser",
        email="test@example.com",
        password="testpassword",
        display_name="Test User",
        is_active=True,
    )
    return user_service.create(user_in)


@pytest.fixture
def client(db_session: Session):
    """Test client with overridden dependency."""
    from app.core.database import get_db

    app.dependency_overrides[get_db] = lambda: db_session
    yield TestClient(app)
    app.dependency_overrides.clear()


def test_hash_password(db_session: Session):
    """Test password hashing."""
    service = UserService(db_session)
    password = "secret"
    hashed = service._hash_password(password)
    assert hashed != password
    assert service.verify_password(password, hashed)
    assert not service.verify_password("wrong", hashed)


def test_login_success(client: TestClient, test_user: User):
    """Test successful login."""
    response = client.post(
        "/api/login",
        data={"username": "testuser", "password": "testpassword"},
        headers={"content-type": "application/x-www-form-urlencoded"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


def test_login_failure(client: TestClient):
    """Test failed login."""
    response = client.post(
        "/api/login",
        data={"username": "wronguser", "password": "wrongpassword"},
        headers={"content-type": "application/x-www-form-urlencoded"},
    )
    assert response.status_code == 401


def test_token_generation(db_session: Session, test_user: User):
    """Test token generation and validation."""
    auth_service = AuthService(db_session)
    token = auth_service.create_access_token(data={"sub": test_user.username})

    # Verify we can decode it
    from jose import jwt

    from app.core.config import settings

    payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
    assert payload["sub"] == test_user.username
