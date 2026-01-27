from datetime import date

from fastapi import status
from sqlalchemy.orm import Session

from app.application.services.rpa.material_delivery_simple_service import (
    MaterialDeliverySimpleService,
)
from app.core.time_utils import utcnow
from app.infrastructure.persistence.models import CloudFlowJob, CloudFlowJobStatus


def _create_simple_job(
    db: Session, job_type: str = MaterialDeliverySimpleService.STEP1_JOB_TYPE
) -> CloudFlowJob:
    job = CloudFlowJob(
        job_type=job_type,
        status=CloudFlowJobStatus.COMPLETED,
        start_date=date(2025, 1, 1),
        end_date=date(2025, 1, 31),
        requested_at=utcnow(),
        started_at=utcnow(),
        completed_at=utcnow(),
        result_message="Success",
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    return job


def test_get_history(client, db: Session):
    _create_simple_job(db)
    response = client.get("/api/rpa/material-delivery-simple/history")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert len(data) == 1
    assert data[0]["status"] == CloudFlowJobStatus.COMPLETED


def test_delete_history(client, db: Session):
    job = _create_simple_job(db)

    response = client.delete(f"/api/rpa/material-delivery-simple/history/{job.id}")
    assert response.status_code == status.HTTP_204_NO_CONTENT

    # Verify DB
    deleted = db.query(CloudFlowJob).filter(CloudFlowJob.id == job.id).first()
    assert deleted is None


def test_delete_history_not_found(client, db: Session):
    response = client.delete("/api/rpa/material-delivery-simple/history/99999")
    assert response.status_code == status.HTTP_404_NOT_FOUND


def test_delete_history_invalid_type(client, db: Session):
    # Create a job with different type
    job = _create_simple_job(db, job_type="other_type")

    response = client.delete(f"/api/rpa/material-delivery-simple/history/{job.id}")
    assert response.status_code == status.HTTP_404_NOT_FOUND

    # Verify DB - should still exist
    existing = db.query(CloudFlowJob).filter(CloudFlowJob.id == job.id).first()
    assert existing is not None
