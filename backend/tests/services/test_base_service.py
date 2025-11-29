import pytest
from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import Session
from pydantic import BaseModel
from fastapi import HTTPException

from app.models.base_model import Base
from app.services.common.base_service import BaseService

# --- Test Models & Schemas ---

class TestModel(Base):
    __tablename__ = "test_models"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    description = Column(String, nullable=True)

class TestModelCreate(BaseModel):
    name: str
    description: str | None = None

class TestModelUpdate(BaseModel):
    name: str | None = None
    description: str | None = None

# --- Test Service ---

class TestService(BaseService[TestModel, TestModelCreate, TestModelUpdate]):
    pass

# --- Tests ---

@pytest.fixture
def service(db: Session):
    # Ensure table exists for this test model (since it's defined here dynamically)
    # In a real scenario, Base.metadata.create_all would cover it if imported,
    # but for dynamic models we might need explicit creation or rely on shared metadata.
    # However, since we use the shared Base, it should be picked up if we create tables *after* defining this class.
    # But conftest creates tables at session start.
    # So we need to create this specific table here.
    TestModel.__table__.create(db.get_bind())
    yield TestService(db, TestModel)
    TestModel.__table__.drop(db.get_bind())

def test_create(service: TestService):
    data = TestModelCreate(name="test", description="desc")
    obj = service.create(data)
    assert obj.id is not None
    assert obj.name == "test"
    assert obj.description == "desc"

def test_get_by_id(service: TestService):
    data = TestModelCreate(name="test")
    created = service.create(data)
    
    fetched = service.get_by_id(created.id)
    assert fetched is not None
    assert fetched.id == created.id
    assert fetched.name == "test"

def test_get_by_id_not_found(service: TestService):
    with pytest.raises(HTTPException) as exc:
        service.get_by_id(999)
    assert exc.value.status_code == 404

def test_update(service: TestService):
    data = TestModelCreate(name="original")
    created = service.create(data)
    
    update_data = TestModelUpdate(name="updated")
    updated = service.update(created.id, update_data)
    
    assert updated.name == "updated"
    assert updated.id == created.id

def test_delete(service: TestService):
    data = TestModelCreate(name="to_delete")
    created = service.create(data)
    
    service.delete(created.id)
    
    with pytest.raises(HTTPException) as exc:
        service.get_by_id(created.id)
    assert exc.value.status_code == 404
