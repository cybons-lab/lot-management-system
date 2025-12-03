# backend/tests/api/test_batch_jobs.py
"""Tests for batch jobs API endpoints."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.main import app
from app.models import BatchJob


def _truncate_all(db: Session):
    db.query(BatchJob).delete()
    db.commit()


@pytest.fixture
def test_db(db: Session):
    _truncate_all(db)

    def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db
    yield db
    _truncate_all(db)
    app.dependency_overrides.clear()


def test_list_batch_jobs_empty(test_db: Session):
    """Test listing batch jobs when none exist."""
    client = TestClient(app)
    response = client.get("/api/batch-jobs")
    assert response.status_code == 200


def test_list_batch_jobs_with_status_filter(test_db: Session):
    """Test filtering by status."""
    client = TestClient(app)

    job = BatchJob(
        job_name="Sync Job 1",
        job_type="inventory_sync",
        status="pending",
    )
    test_db.add(job)
    test_db.commit()

    response = client.get("/api/batch-jobs", params={"status": "pending"})
    assert response.status_code == 200


def test_list_batch_jobs_with_type_filter(test_db: Session):
    """Test filtering by job type."""
    client = TestClient(app)

    job = BatchJob(
        job_name="Report Job 1",
        job_type="report_generation",
        status="completed",
    )
    test_db.add(job)
    test_db.commit()

    response = client.get("/api/batch-jobs", params={"job_type": "report_generation"})
    assert response.status_code == 200


def test_get_batch_job_success(test_db: Session):
    """Test getting batch job by ID."""
    client = TestClient(app)

    job = BatchJob(
        job_name="Test Job 1",
        job_type="inventory_sync",
        status="pending"
    )
    test_db.add(job)
    test_db.commit()
    test_db.refresh(job)

    response = client.get(f"/api/batch-jobs/{job.id}")
    assert response.status_code == 200
    assert response.json()["job_id"] == job.id


def test_get_batch_job_not_found(test_db: Session):
    """Test getting non-existent batch job."""
    client = TestClient(app)
    response = client.get("/api/batch-jobs/99999")
    assert response.status_code == 404


def test_execute_batch_job_not_found(test_db: Session):
    """Test executing non-existent batch job."""
    client = TestClient(app)
    response = client.post("/api/batch-jobs/99999/execute")
    assert response.status_code == 404
