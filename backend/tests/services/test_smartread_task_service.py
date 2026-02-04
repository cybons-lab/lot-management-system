"""Tests for SmartReadTaskService."""

from datetime import date, datetime

import pytest
from sqlalchemy.orm import Session

from app.application.services.smartread.task_service import SmartReadTaskService
from app.infrastructure.persistence.models.smartread_models import (
    SmartReadConfig,
    SmartReadRequest,
    SmartReadTask,
)


@pytest.fixture
def task_service(db_session: Session) -> SmartReadTaskService:
    """Create a SmartReadTaskService instance."""
    return SmartReadTaskService(db_session)


@pytest.fixture
def smartread_config(db_session: Session) -> SmartReadConfig:
    """Create a SmartReadConfig for task tests."""
    config = SmartReadConfig(
        name="Task Test Config",
        endpoint="https://api.example.com",
        api_key="test-key",
    )
    db_session.add(config)
    db_session.flush()
    return config


@pytest.fixture
def sample_task(db_session: Session, smartread_config: SmartReadConfig) -> SmartReadTask:
    """Create a sample task."""
    task = SmartReadTask(
        config_id=smartread_config.id,
        task_id="test-task-001",
        task_date=date(2026, 1, 15),
        name="Test Task",
        state="COMPLETED",
        skip_today=False,
    )
    db_session.add(task)
    db_session.flush()
    return task


class TestGetOrCreateTask:
    """Tests for get_or_create_task."""

    def test_create_new_task(
        self,
        task_service: SmartReadTaskService,
        smartread_config: SmartReadConfig,
    ) -> None:
        result = task_service.get_or_create_task(
            config_id=smartread_config.id,
            task_id="new-task-123",
            task_date=date(2026, 2, 1),
            name="New Task",
            state="PENDING",
        )
        assert result.task_id == "new-task-123"
        assert result.config_id == smartread_config.id
        assert result.name == "New Task"
        assert result.state == "PENDING"
        assert result.id is not None

    def test_get_existing_task(
        self,
        task_service: SmartReadTaskService,
        smartread_config: SmartReadConfig,
        sample_task: SmartReadTask,
    ) -> None:
        result = task_service.get_or_create_task(
            config_id=smartread_config.id,
            task_id="test-task-001",
            task_date=date(2026, 1, 15),
        )
        assert result.id == sample_task.id

    def test_update_existing_task_name(
        self,
        task_service: SmartReadTaskService,
        smartread_config: SmartReadConfig,
        sample_task: SmartReadTask,
    ) -> None:
        result = task_service.get_or_create_task(
            config_id=smartread_config.id,
            task_id="test-task-001",
            task_date=date(2026, 1, 15),
            name="Updated Name",
        )
        assert result.name == "Updated Name"

    def test_update_existing_task_state(
        self,
        task_service: SmartReadTaskService,
        smartread_config: SmartReadConfig,
        sample_task: SmartReadTask,
    ) -> None:
        result = task_service.get_or_create_task(
            config_id=smartread_config.id,
            task_id="test-task-001",
            task_date=date(2026, 1, 15),
            state="RUNNING",
        )
        assert result.state == "RUNNING"


class TestGetTaskByDate:
    """Tests for get_task_by_date."""

    def test_get_task_by_date_found(
        self,
        task_service: SmartReadTaskService,
        smartread_config: SmartReadConfig,
        sample_task: SmartReadTask,
    ) -> None:
        result = task_service.get_task_by_date(smartread_config.id, date(2026, 1, 15))
        assert result is not None
        assert result.task_id == "test-task-001"

    def test_get_task_by_date_not_found(
        self,
        task_service: SmartReadTaskService,
        smartread_config: SmartReadConfig,
    ) -> None:
        result = task_service.get_task_by_date(smartread_config.id, date(2099, 12, 31))
        assert result is None

    def test_get_task_by_date_wrong_config(
        self,
        task_service: SmartReadTaskService,
        sample_task: SmartReadTask,
    ) -> None:
        result = task_service.get_task_by_date(99999, date(2026, 1, 15))
        assert result is None


class TestShouldSkipToday:
    """Tests for should_skip_today."""

    def test_should_not_skip(
        self,
        task_service: SmartReadTaskService,
        sample_task: SmartReadTask,
    ) -> None:
        result = task_service.should_skip_today("test-task-001")
        assert result is False

    def test_should_skip_when_flagged(
        self,
        task_service: SmartReadTaskService,
        sample_task: SmartReadTask,
        db_session: Session,
    ) -> None:
        sample_task.skip_today = True
        db_session.flush()

        result = task_service.should_skip_today("test-task-001")
        assert result is True

    def test_should_not_skip_nonexistent_task(
        self,
        task_service: SmartReadTaskService,
    ) -> None:
        result = task_service.should_skip_today("nonexistent-task")
        assert result is False


class TestSetSkipToday:
    """Tests for set_skip_today."""

    def test_set_skip_today_true(
        self,
        task_service: SmartReadTaskService,
        sample_task: SmartReadTask,
        db_session: Session,
    ) -> None:
        task_service.set_skip_today("test-task-001", True)
        db_session.flush()

        refreshed = db_session.get(SmartReadTask, sample_task.id)
        assert refreshed is not None
        assert refreshed.skip_today is True

    def test_set_skip_today_false(
        self,
        task_service: SmartReadTaskService,
        sample_task: SmartReadTask,
        db_session: Session,
    ) -> None:
        sample_task.skip_today = True
        db_session.flush()

        task_service.set_skip_today("test-task-001", False)
        db_session.flush()

        refreshed = db_session.get(SmartReadTask, sample_task.id)
        assert refreshed is not None
        assert refreshed.skip_today is False

    def test_set_skip_today_nonexistent_task(
        self,
        task_service: SmartReadTaskService,
    ) -> None:
        # Should not raise - silently does nothing
        task_service.set_skip_today("nonexistent-task", True)


class TestUpdateSkipToday:
    """Tests for update_skip_today."""

    def test_update_skip_today_success(
        self,
        task_service: SmartReadTaskService,
        sample_task: SmartReadTask,
    ) -> None:
        result = task_service.update_skip_today("test-task-001", True)
        assert result["skip_today"] is True
        assert result["task_id"] == "test-task-001"

    def test_update_skip_today_nonexistent_raises(
        self,
        task_service: SmartReadTaskService,
    ) -> None:
        with pytest.raises(ValueError, match="Task not found"):
            task_service.update_skip_today("nonexistent-task", True)


class TestUpdateTaskSyncedAt:
    """Tests for update_task_synced_at."""

    def test_update_synced_at(
        self,
        task_service: SmartReadTaskService,
        sample_task: SmartReadTask,
        db_session: Session,
    ) -> None:
        assert sample_task.synced_at is None

        task_service.update_task_synced_at("test-task-001")
        db_session.flush()

        refreshed = db_session.get(SmartReadTask, sample_task.id)
        assert refreshed is not None
        assert refreshed.synced_at is not None
        assert isinstance(refreshed.synced_at, datetime)


class TestGetManagedTasks:
    """Tests for get_managed_tasks."""

    def test_get_managed_tasks_empty(
        self,
        task_service: SmartReadTaskService,
        smartread_config: SmartReadConfig,
    ) -> None:
        result = task_service.get_managed_tasks(smartread_config.id)
        assert result == []

    def test_get_managed_tasks(
        self,
        task_service: SmartReadTaskService,
        smartread_config: SmartReadConfig,
        sample_task: SmartReadTask,
    ) -> None:
        result = task_service.get_managed_tasks(smartread_config.id)
        assert len(result) == 1
        assert result[0]["task_id"] == "test-task-001"
        assert result[0]["config_id"] == smartread_config.id


class TestGetPendingRequests:
    """Tests for get_pending_requests."""

    def test_get_pending_requests_empty(
        self,
        task_service: SmartReadTaskService,
        smartread_config: SmartReadConfig,
    ) -> None:
        result = task_service.get_pending_requests(smartread_config.id)
        assert result == []

    def test_get_pending_requests_filters_correctly(
        self,
        task_service: SmartReadTaskService,
        smartread_config: SmartReadConfig,
        db_session: Session,
    ) -> None:
        # Create PENDING request
        pending_req = SmartReadRequest(
            request_id="req-pending",
            task_id="task-1",
            task_date=date(2026, 1, 15),
            config_id=smartread_config.id,
            filename="pending.pdf",
            state="PENDING",
            submitted_at=datetime.now(),
        )
        # Create COMPLETED request (should not be returned)
        completed_req = SmartReadRequest(
            request_id="req-completed",
            task_id="task-1",
            task_date=date(2026, 1, 15),
            config_id=smartread_config.id,
            filename="completed.pdf",
            state="COMPLETED",
            submitted_at=datetime.now(),
        )
        db_session.add_all([pending_req, completed_req])
        db_session.flush()

        result = task_service.get_pending_requests(smartread_config.id)
        assert len(result) == 1
        assert result[0].request_id == "req-pending"


class TestGetRequestById:
    """Tests for get_request_by_id."""

    def test_get_request_by_id_found(
        self,
        task_service: SmartReadTaskService,
        smartread_config: SmartReadConfig,
        db_session: Session,
    ) -> None:
        req = SmartReadRequest(
            request_id="req-abc-123",
            task_id="task-1",
            task_date=date(2026, 1, 15),
            config_id=smartread_config.id,
            filename="test.pdf",
            state="PENDING",
            submitted_at=datetime.now(),
        )
        db_session.add(req)
        db_session.flush()

        result = task_service.get_request_by_id("req-abc-123")
        assert result is not None
        assert result.filename == "test.pdf"

    def test_get_request_by_id_not_found(
        self,
        task_service: SmartReadTaskService,
    ) -> None:
        result = task_service.get_request_by_id("nonexistent-request-id")
        assert result is None
