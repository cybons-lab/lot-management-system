"""Material Delivery simple Step1/Step2 execution service."""

from __future__ import annotations

import logging
from datetime import date

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.time_utils import utcnow
from app.infrastructure.persistence.models import CloudFlowJob, CloudFlowJobStatus, User
from app.application.services.cloud_flow_service import CloudFlowService


logger = logging.getLogger(__name__)


class MaterialDeliverySimpleService:
    """Step1/Step2実行と履歴管理."""

    STEP1_CONFIG_KEY = "MATERIAL_DELIVERY_STEP1_URL"
    STEP2_CONFIG_KEY = "MATERIAL_DELIVERY_STEP2_URL"
    STEP1_JOB_TYPE = "material_delivery_step1"
    STEP2_JOB_TYPE = "material_delivery_step2"

    def __init__(self, db: Session):
        self.db = db
        self.cf_service = CloudFlowService(db)

    def get_step1_history(self, limit: int = 20, offset: int = 0) -> list[CloudFlowJob]:
        """Step1履歴を取得."""
        stmt = (
            select(CloudFlowJob)
            .where(CloudFlowJob.job_type == self.STEP1_JOB_TYPE)
            .order_by(CloudFlowJob.requested_at.desc())
            .limit(limit)
            .offset(offset)
        )
        return list(self.db.execute(stmt).scalars().all())

    def execute_step(
        self,
        step: int,
        start_date: date,
        end_date: date,
        user: User | None,
    ) -> CloudFlowJob:
        """Step1/Step2を実行し履歴に記録."""
        if step not in (1, 2):
            raise ValueError("Invalid step")

        config_key = self.STEP1_CONFIG_KEY if step == 1 else self.STEP2_CONFIG_KEY
        job_type = self.STEP1_JOB_TYPE if step == 1 else self.STEP2_JOB_TYPE

        config = self.cf_service.get_config(config_key)
        flow_url = config.config_value if config else ""
        if not flow_url:
            raise ValueError(f"{config_key} is not configured")

        now = utcnow()
        job = CloudFlowJob(
            job_type=job_type,
            status=CloudFlowJobStatus.RUNNING,
            start_date=start_date,
            end_date=end_date,
            requested_by_user_id=user.id if user else None,
            requested_at=now,
            started_at=now,
        )
        self.db.add(job)
        self.db.commit()
        self.db.refresh(job)

        payload = {
            "start_date": str(start_date),
            "end_date": str(end_date),
            "executed_by": user.username if user else "system",
            "job_id": job.id,
        }

        try:
            with httpx.Client(timeout=30.0) as client:
                response = client.post(flow_url, json=payload)
                response.raise_for_status()
            job.status = CloudFlowJobStatus.COMPLETED
            job.completed_at = utcnow()
            job.result_message = "Flow呼び出し完了"
        except httpx.HTTPError as exc:
            logger.exception("[RPA] Material delivery step flow call failed")
            job.status = CloudFlowJobStatus.FAILED
            job.completed_at = utcnow()
            job.error_message = f"Flow呼び出し失敗: {exc!s}"

        self.db.commit()
        self.db.refresh(job)
        return job
