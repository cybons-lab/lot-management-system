"""Batch jobs service (バッチジョブサービス)."""

from datetime import datetime

from sqlalchemy.orm import Session

from app.models.logs_models import BatchJob
from app.schemas.system.batch_jobs_schema import BatchJobCreate


class BatchJobService:
    """Service for batch jobs (バッチジョブ)."""

    def __init__(self, db: Session):
        """Initialize service with database session."""
        self.db = db

    def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
        job_type: str | None = None,
        status: str | None = None,
    ) -> tuple[list[BatchJob], int]:
        """
        Get all batch jobs with filtering and pagination.

        Returns:
            tuple: (list of jobs, total count)
        """
        query = self.db.query(BatchJob)

        # Apply filters
        if job_type:
            query = query.filter(BatchJob.job_type == job_type)

        if status:
            query = query.filter(BatchJob.status == status)

        # Get total count
        total = query.count()

        # Apply pagination and order
        jobs = query.order_by(BatchJob.created_at.desc()).offset(skip).limit(limit).all()

        return jobs, total

    def get_by_id(self, job_id: int) -> BatchJob | None:
        """Get batch job by ID."""
        return self.db.query(BatchJob).filter(BatchJob.job_id == job_id).first()

    def create(self, job: BatchJobCreate) -> BatchJob:
        """Create a new batch job."""
        db_job = BatchJob(**job.model_dump(), status="pending")
        self.db.add(db_job)
        self.db.commit()
        self.db.refresh(db_job)
        return db_job

    def update_status(
        self,
        job_id: int,
        status: str,
        result_message: str | None = None,
    ) -> BatchJob | None:
        """Update batch job status."""
        db_job = self.get_by_id(job_id)
        if not db_job:
            return None

        db_job.status = status

        if result_message is not None:
            db_job.result_message = result_message

        if status == "running" and db_job.started_at is None:
            db_job.started_at = datetime.now()

        if status in ("completed", "failed"):
            db_job.completed_at = datetime.now()

        self.db.commit()
        self.db.refresh(db_job)
        return db_job

    def execute(self, job_id: int, parameters: dict | None = None) -> BatchJob | None:
        """
        Execute a batch job.

        This is a stub implementation. In production, this would:
        1. Update the job status to 'running'
        2. Trigger the actual job execution (e.g., via Celery, RQ, etc.)
        3. Return the updated job

        Args:
            job_id: Job ID to execute
            parameters: Optional parameters to override job parameters

        Returns:
            Updated batch job or None if not found
        """
        db_job = self.get_by_id(job_id)
        if not db_job:
            return None

        # Update parameters if provided
        if parameters is not None:
            db_job.parameters = parameters

        # Update status to running
        db_job.status = "running"
        db_job.started_at = datetime.now()
        db_job.result_message = "Job execution started"

        self.db.commit()
        self.db.refresh(db_job)

        # TODO: In production, trigger actual job execution here
        # For now, immediately mark as completed (stub)
        db_job.status = "completed"
        db_job.completed_at = datetime.now()
        db_job.result_message = "Job completed successfully (stub implementation)"

        self.db.commit()
        self.db.refresh(db_job)

        return db_job

    def delete(self, job_id: int) -> bool:
        """Delete a batch job (hard delete)."""
        db_job = self.get_by_id(job_id)
        if not db_job:
            return False

        self.db.delete(db_job)
        self.db.commit()
        return True

    def cancel(self, job_id: int) -> BatchJob | None:
        """Cancel a running batch job."""
        db_job = self.get_by_id(job_id)
        if not db_job:
            return None

        if db_job.status not in ("pending", "running"):
            return None  # Can't cancel completed or failed jobs

        db_job.status = "failed"
        db_job.completed_at = datetime.now()
        db_job.result_message = "Job cancelled by user"

        self.db.commit()
        self.db.refresh(db_job)
        return db_job
