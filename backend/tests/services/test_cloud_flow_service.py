"""CloudFlowService tests."""

from datetime import date

import httpx
from sqlalchemy.orm import Session

from app.application.services.cloud_flow_service import CloudFlowService
from app.infrastructure.persistence.models import (
    CloudFlowConfig,
    CloudFlowJob,
    CloudFlowJobStatus,
    User,
)


class DummyResponse:
    def raise_for_status(self) -> None:
        return None


def test_execute_flow_success_updates_job_and_payload(db_session: Session, monkeypatch):
    """execute_flow completes the job and builds Power Automate payloads."""

    payloads: list[dict] = []

    class DummyClient:
        def __init__(self, timeout: float) -> None:
            self.timeout = timeout

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb) -> bool:
            return False

        def post(self, _url: str, json: dict) -> DummyResponse:
            payloads.append(json)
            return DummyResponse()

    monkeypatch.setattr(httpx, "Client", DummyClient)

    user = User(
        username="flow_user",
        email="flow_user@example.com",
        password_hash="hash",
        display_name="Flow User",
        is_active=True,
    )
    db_session.add(user)
    db_session.flush()

    job = CloudFlowJob(
        job_type="progress_download",
        status=CloudFlowJobStatus.RUNNING,
        start_date=date(2024, 1, 1),
        end_date=date(2024, 1, 2),
        requested_by_user_id=user.id,
    )
    db_session.add(job)
    db_session.flush()

    config = CloudFlowConfig(
        config_key="progress_download_url",
        config_value="https://example.com/flow",
    )
    db_session.add(config)
    db_session.commit()

    service = CloudFlowService(db_session)
    result = service.execute_flow(job)

    db_session.refresh(job)
    assert result["success"] is True
    assert job.status == CloudFlowJobStatus.COMPLETED
    assert job.result_message == "4回の呼び出しが成功しました"
    assert len(payloads) == 4
    assert payloads[0]["job_id"] == job.id
    assert payloads[0]["job_type"] == "progress_download"
    assert payloads[0]["step"] == 1
    assert payloads[0]["start_date"] == "2024-01-01"
    assert payloads[0]["end_date"] == "2024-01-02"
    assert payloads[0]["requested_by_user_id"] == user.id
    assert payloads[0]["requested_by"] == "Flow User"
    assert payloads[0]["requested_at"] is not None
    assert payloads[0]["triggered_at"] is not None


def test_execute_flow_http_error_marks_failed(db_session: Session, monkeypatch):
    """execute_flow marks the job failed when the flow call errors."""

    class ErrorClient:
        def __init__(self, timeout: float) -> None:
            self.timeout = timeout

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb) -> bool:
            return False

        def post(self, _url: str, json: dict) -> DummyResponse:
            raise httpx.HTTPError("boom")

    monkeypatch.setattr(httpx, "Client", ErrorClient)

    job = CloudFlowJob(
        job_type="progress_download",
        status=CloudFlowJobStatus.RUNNING,
        start_date=date(2024, 1, 1),
        end_date=date(2024, 1, 2),
        requested_by_user_id=None,
    )
    db_session.add(job)
    db_session.flush()

    config = CloudFlowConfig(
        config_key="progress_download_url",
        config_value="https://example.com/flow",
    )
    db_session.add(config)
    db_session.commit()

    service = CloudFlowService(db_session)
    result = service.execute_flow(job)

    db_session.refresh(job)
    assert result["success"] is False
    assert job.status == CloudFlowJobStatus.FAILED
    assert job.error_message is not None
    assert "HTTP呼び出しエラー" in job.error_message
