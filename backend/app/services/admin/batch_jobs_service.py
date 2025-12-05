"""Batch jobs service (バッチジョブサービス)."""

from datetime import datetime

from sqlalchemy.orm import Session

from app.models.logs_models import BatchJob
from app.schemas.system.batch_jobs_schema import BatchJobCreate, BatchJobUpdate
from app.services.common.base_service import BaseService


class BatchJobService(BaseService[BatchJob, BatchJobCreate, BatchJobUpdate, int]):
    """Service for batch jobs (バッチジョブ).

    Inherits common CRUD operations from BaseService:
    - get_by_id(job_id) -> BatchJob
    - create(payload) -> BatchJob
    - update(job_id, payload) -> BatchJob
    - delete(job_id) -> None

    Custom business logic is implemented below.
    """

    def __init__(self, db: Session):
        """Initialize service with database session."""
        super().__init__(db=db, model=BatchJob)

    def get_all(  # type: ignore[override]
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

    def update_status(
        self,
        job_id: int,
        status: str,
        result_message: str | None = None,
    ) -> BatchJob | None:
        """Update batch job status."""
        db_job = self.get_by_id(job_id, raise_404=False)
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

        Args:
            job_id: Job ID to execute
            parameters: Optional parameters to override job parameters

        Returns:
            Updated batch job or None if not found
        """
        db_job = self.get_by_id(job_id, raise_404=False)
        if not db_job:
            return None

        # Update parameters if provided
        if parameters is not None:
            db_job.parameters = parameters

        # Update status to running
        db_job.status = "running"
        db_job.started_at = datetime.now()

        self.db.commit()
        self.db.refresh(db_job)

        # Execute actual job based on job_type
        try:
            if db_job.job_type == "inventory_sync":
                # SAP inventory synchronization job
                from app.services.batch.inventory_sync_service import InventorySyncService

                sync_service = InventorySyncService(self.db)
                result = sync_service.check_inventory_totals()

                db_job.status = "completed"
                db_job.result_message = (
                    f"Success: Checked {result['checked_products']} products, "
                    f"found {result['discrepancies_found']} discrepancies, "
                    f"created {result['alerts_created']} alerts."
                )
            else:
                # Other job types: stub implementation
                db_job.status = "completed"
                db_job.result_message = "Job completed successfully (stub implementation)"

        except Exception as e:
            db_job.status = "failed"
            db_job.result_message = f"Error: {str(e)}"

        db_job.completed_at = datetime.now()
        self.db.commit()
        self.db.refresh(db_job)

        return db_job

    def cancel(self, job_id: int) -> BatchJob | None:
        """Cancel a running batch job."""
        db_job = self.get_by_id(job_id, raise_404=False)
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
