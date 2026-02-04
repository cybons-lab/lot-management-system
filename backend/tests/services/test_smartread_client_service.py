"""Tests for SmartReadClientService."""

from datetime import date
from unittest.mock import AsyncMock, patch

import pytest
from sqlalchemy.orm import Session

from app.application.services.smartread.client_service import SmartReadClientService
from app.infrastructure.persistence.models.smartread_models import (
    SmartReadConfig,
    SmartReadLongData,
    SmartReadTask,
    SmartReadWideData,
)
from app.infrastructure.smartread.client import SmartReadTask as ApiTask


@pytest.fixture
def client_service(db: Session) -> SmartReadClientService:
    """Create an SmartReadClientService instance."""
    # Note: SmartReadService inherits from everything including ClientService
    from app.application.services.smartread import SmartReadService

    return SmartReadService(db)


@pytest.fixture
def smartread_config(db: Session) -> SmartReadConfig:
    """Create a SmartReadConfig for client tests."""
    config = SmartReadConfig(
        name="Client Test",
        endpoint="https://api.example.com",
        api_key="sk-test-key",
        template_ids="tmpl_1, tmpl_2",
        aggregation_type="perPage",
    )
    db.add(config)
    db.flush()
    return config


class TestGetTasks:
    """Tests for get_tasks."""

    @pytest.mark.asyncio
    async def test_get_tasks_success(
        self,
        client_service: SmartReadClientService,
        smartread_config: SmartReadConfig,
        db: Session,
    ) -> None:
        # Mock API tasks
        api_tasks = [
            ApiTask(
                task_id="task-1",
                name="Task 1",
                status="COMPLETED",
                created_at="2024-01-20T10:00:00Z",
            ),
            ApiTask(
                task_id="task-2", name="Task 2", status="RUNNING", created_at="2024-01-21T10:00:00Z"
            ),
        ]

        with patch(
            "app.infrastructure.smartread.client.SmartReadClient.get_tasks", new_callable=AsyncMock
        ) as mock_get_tasks:
            mock_get_tasks.return_value = api_tasks

            results = await client_service.get_tasks(smartread_config.id)

        assert len(results) == 2
        assert results[0].task_id == "task-1"

        # Verify DB synchronization
        task1 = db.query(SmartReadTask).filter_by(task_id="task-1").first()
        assert task1 is not None
        assert task1.name == "Task 1"
        assert task1.state == "COMPLETED"
        assert task1.task_date == date(2024, 1, 20)

        task2 = db.query(SmartReadTask).filter_by(task_id="task-2").first()
        assert task2 is not None
        assert task2.state == "RUNNING"


class TestSyncTaskResults:
    """Tests for sync_task_results."""

    @pytest.mark.asyncio
    async def test_sync_task_results_from_cache(
        self,
        client_service: SmartReadClientService,
        smartread_config: SmartReadConfig,
        db: Session,
    ) -> None:
        # Prep existing data
        task_id = "task-cached"
        wide = SmartReadWideData(
            config_id=smartread_config.id,
            task_id=task_id,
            task_date=date.today(),
            content={"foo": "bar"},
            row_index=0,
            row_fingerprint="fake-fingerprint",
        )
        db.add(wide)
        long = SmartReadLongData(
            config_id=smartread_config.id,
            task_id=task_id,
            task_date=date.today(),
            wide_data_id=None,  # In implementation it might use wide_data_id but let's see
            content={"key": "val"},
            row_index=0,
        )
        db.add(long)
        db.flush()

        result = await client_service.sync_task_results(smartread_config.id, task_id)

        assert result["from_cache"] is True
        assert result["wide_data"][0] == {"foo": "bar"}
        assert result["long_data"][0] == {"key": "val"}

    @pytest.mark.asyncio
    async def test_sync_task_results_full_flow(
        self,
        client_service: SmartReadClientService,
        smartread_config: SmartReadConfig,
        db: Session,
    ) -> None:
        task_id = "task-new"

        # 1. Mock get_task_requests (polling)
        mock_requests = [{"status": "SUCCEEDED"}, {"status": "COMPLETED"}]

        # 2. Mock create_export
        from app.infrastructure.smartread.client import SmartReadExport

        mock_export = SmartReadExport(export_id="exp-123", state="RUNNING", task_id=task_id)

        # 3. Mock poll_export_until_ready
        mock_export_ready = SmartReadExport(export_id="exp-123", state="COMPLETED", task_id=task_id)

        # 4. Mock get_export_csv_data (internal call to ExportService)
        mock_csv_result = {
            "wide_data": [{"col1": "val1"}],
            "long_data": [{"f1": "v1"}],
            "errors": [],
            "filename": "test.csv",
        }

        with (
            patch(
                "app.infrastructure.smartread.client.SmartReadClient.get_task_requests",
                new_callable=AsyncMock,
            ) as mock_get_reqs,
            patch(
                "app.infrastructure.smartread.client.SmartReadClient.create_export",
                new_callable=AsyncMock,
            ) as mock_create_exp,
            patch(
                "app.infrastructure.smartread.client.SmartReadClient.poll_export_until_ready",
                new_callable=AsyncMock,
            ) as mock_poll_exp,
            patch.object(
                client_service, "get_export_csv_data", new_callable=AsyncMock
            ) as mock_get_csv,
        ):
            mock_get_reqs.return_value = mock_requests
            mock_create_exp.return_value = mock_export
            mock_poll_exp.return_value = mock_export_ready
            mock_get_csv.return_value = mock_csv_result

            result = await client_service.sync_task_results(smartread_config.id, task_id)

        assert result["wide_data"] == [{"col1": "val1"}]
        mock_create_exp.assert_called_once_with(task_id, export_type="csv", aggregation="perPage")
        mock_get_csv.assert_called_once()


class TestStatusSummarization:
    """Tests for status summarization internal logic."""

    def test_summarize_request_status(self, client_service: SmartReadClientService):
        requests = [
            {"status": "SUCCEEDED"},  # completed
            {"state": "OCR_COMPLETED"},  # completed
            {"status": "FAILED"},  # failed
            {"status": "OCR_RUNNING"},  # running
            {"state": "PENDING"},  # running
            {"status": "UNKNOWN_STUFF"},  # running (default)
        ]

        summary = client_service._summarize_request_status("task-1", 1, requests)

        assert summary["total"] == 6
        assert summary["completed"] == 2
        assert summary["failed"] == 1
        assert summary["running"] == 3
