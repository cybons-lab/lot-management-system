"""CloudFlow test data generator."""

import random
from datetime import UTC, datetime, timedelta

from sqlalchemy.orm import Session

from app.infrastructure.persistence.models.cloud_flow_models import (
    CloudFlowConfig,
    CloudFlowJob,
    CloudFlowJobStatus,
)


def generate_cloud_flow_data(db: Session) -> None:
    """Generate CloudFlowConfig and CloudFlowJob test data."""
    # Generate 2-5 configs
    configs = [
        {
            "config_key": "progress_download",
            "config_value": "https://prod-123.japaneast.logic.azure.com:443/workflows/abcd1234/triggers/manual/paths/invoke",
            "description": "進捗表ダウンロードフロー",
        },
        {
            "config_key": "sap_integration",
            "config_value": "https://prod-456.japaneast.logic.azure.com:443/workflows/efgh5678/triggers/manual/paths/invoke",
            "description": "SAP連携フロー",
        },
        {
            "config_key": "daily_report",
            "config_value": "https://prod-789.japaneast.logic.azure.com:443/workflows/ijkl9012/triggers/manual/paths/invoke",
            "description": "日次レポート生成フロー",
        },
    ]

    for config_data in configs:
        config = CloudFlowConfig(**config_data)
        db.add(config)

    # Edge case: Very long URL (500+ chars)
    long_url_config = CloudFlowConfig(
        config_key="long_url_test",
        config_value="https://prod-999.japaneast.logic.azure.com:443/workflows/"
        + "x" * 450
        + "/triggers/manual/paths/invoke",
        description="長いURL設定テスト" * 10,
    )
    db.add(long_url_config)

    db.commit()

    # Generate 30-50 jobs
    num_jobs = random.randint(30, 50)

    job_types = ["progress_download", "sap_integration", "daily_report", "data_export"]

    for _ in range(num_jobs):
        job_type = random.choice(job_types)

        # 30% pending, 20% running, 40% completed, 10% failed
        status = random.choices(
            [
                CloudFlowJobStatus.PENDING,
                CloudFlowJobStatus.RUNNING,
                CloudFlowJobStatus.COMPLETED,
                CloudFlowJobStatus.FAILED,
            ],
            weights=[30, 20, 40, 10],
            k=1,
        )[0]

        # Date range within last 90 days
        requested_at = datetime.now(UTC) - timedelta(days=random.randint(0, 90))
        start_date = (requested_at - timedelta(days=random.randint(1, 30))).date()
        end_date = (requested_at + timedelta(days=random.randint(1, 7))).date()

        started_at = None
        completed_at = None
        result_message = None
        error_message = None

        if status in [
            CloudFlowJobStatus.RUNNING,
            CloudFlowJobStatus.COMPLETED,
            CloudFlowJobStatus.FAILED,
        ]:
            started_at = requested_at + timedelta(minutes=random.randint(1, 10))

        if (
            status in [CloudFlowJobStatus.COMPLETED, CloudFlowJobStatus.FAILED]
            and started_at is not None
        ):
            completed_at = started_at + timedelta(minutes=random.randint(1, 30))

        if status == CloudFlowJobStatus.COMPLETED:
            result_message = f"Successfully processed {random.randint(10, 500)} records"
        elif status == CloudFlowJobStatus.FAILED:
            error_message = random.choice(
                [
                    "Flow execution timeout",
                    "Authentication failed",
                    "Invalid request payload",
                    "External API returned 403 Forbidden",
                    "Blob storage quota exceeded",
                ]
            )

        job = CloudFlowJob(
            job_type=job_type,
            status=status,
            start_date=start_date,
            end_date=end_date,
            requested_at=requested_at,
            started_at=started_at,
            completed_at=completed_at,
            result_message=result_message,
            error_message=error_message,
        )
        db.add(job)

    # Edge case: Jobs spanning multiple months (date range test)
    base_date = datetime.now(UTC) - timedelta(days=180)
    for i in range(12):
        job_date = base_date + timedelta(days=i * 15)
        start_date = (job_date - timedelta(days=30)).date()
        end_date = job_date.date()

        job = CloudFlowJob(
            job_type="historical_test",
            status=CloudFlowJobStatus.COMPLETED,
            start_date=start_date,
            end_date=end_date,
            requested_at=job_date,
            started_at=job_date + timedelta(minutes=1),
            completed_at=job_date + timedelta(minutes=5),
            result_message=f"Processed month {i + 1}",
        )
        db.add(job)

    # Edge case: Very long result message
    long_result_job = CloudFlowJob(
        job_type="long_result_test",
        status=CloudFlowJobStatus.COMPLETED,
        start_date=(datetime.now(UTC) - timedelta(days=7)).date(),
        end_date=datetime.now(UTC).date(),
        requested_at=datetime.now(UTC) - timedelta(hours=2),
        started_at=datetime.now(UTC) - timedelta(hours=2, minutes=-1),
        completed_at=datetime.now(UTC) - timedelta(hours=1),
        result_message="Processing details: " + "x" * 1000,
    )
    db.add(long_result_job)

    # Edge case: Abandoned job (started but never completed)
    abandoned_job = CloudFlowJob(
        job_type="abandoned_test",
        status=CloudFlowJobStatus.RUNNING,
        start_date=(datetime.now(UTC) - timedelta(days=14)).date(),
        end_date=(datetime.now(UTC) - timedelta(days=7)).date(),
        requested_at=datetime.now(UTC) - timedelta(days=7),
        started_at=datetime.now(UTC) - timedelta(days=7, hours=-1),
    )
    db.add(abandoned_job)

    db.commit()
