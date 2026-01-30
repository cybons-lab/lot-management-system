# backend/tests/api/test_batch_jobs.py
"""Tests for batch jobs API endpoints."""

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.infrastructure.persistence.models import BatchJob


def test_list_batch_jobs_empty(db: Session, client: TestClient):
    """Test listing batch jobs when none exist."""
    response = client.get("/api/batch-jobs")
    assert response.status_code == 200


def test_list_batch_jobs_with_status_filter(db: Session, client: TestClient):
    """Test filtering by status."""

    job = BatchJob(
        job_name="Sync Job 1",
        job_type="inventory_sync",
        status="pending",
    )
    db.add(job)
    db.commit()

    response = client.get("/api/batch-jobs", params={"status": "pending"})
    assert response.status_code == 200


def test_list_batch_jobs_with_type_filter(db: Session, client: TestClient):
    """Test filtering by job type."""

    job = BatchJob(
        job_name="Report Job 1",
        job_type="report_generation",
        status="completed",
    )
    db.add(job)
    db.commit()

    response = client.get("/api/batch-jobs", params={"job_type": "report_generation"})
    assert response.status_code == 200


def test_get_batch_job_success(db: Session, client: TestClient):
    """Test getting batch job by ID."""

    job = BatchJob(job_name="Test Job 1", job_type="inventory_sync", status="pending")
    db.add(job)
    db.commit()
    db.refresh(job)

    response = client.get(f"/api/batch-jobs/{job.id}")
    assert response.status_code == 200
    assert response.json()["job_id"] == job.id


def test_get_batch_job_not_found(db: Session, client: TestClient):
    """Test getting non-existent batch job."""
    response = client.get("/api/batch-jobs/99999")
    assert response.status_code == 404


def test_execute_batch_job_not_found(db: Session, client: TestClient):
    """Test executing non-existent batch job."""
    response = client.post("/api/batch-jobs/99999/execute")
    assert response.status_code == 404
