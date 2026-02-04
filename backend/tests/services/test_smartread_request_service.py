"""Tests for SmartReadRequestService."""

from datetime import date
from unittest.mock import AsyncMock, patch

import pytest
from sqlalchemy.orm import Session

from app.application.services.smartread.request_service import SmartReadRequestService
from app.infrastructure.persistence.models.smartread_models import (
    SmartReadConfig,
    SmartReadLongData,
    SmartReadRequest,
    SmartReadTask,
    SmartReadWideData,
)
from app.infrastructure.smartread.client import SmartReadRequestResults, SmartReadRequestStatus


@pytest.fixture
def request_service(db: Session) -> SmartReadRequestService:
    """Create an SmartReadRequestService instance."""
    from app.application.services.smartread import SmartReadService

    return SmartReadService(db)


@pytest.fixture
def smartread_config(db: Session) -> SmartReadConfig:
    """Create a SmartReadConfig for request tests."""
    config = SmartReadConfig(
        name="Request Test",
        endpoint="https://api.example.com",
        api_key="sk-test-key",
    )
    db.add(config)
    db.flush()
    return config


class TestTaskManagement:
    """Tests for daily task management."""

    @pytest.mark.asyncio
    async def test_get_or_create_daily_task_existing(
        self,
        request_service: SmartReadRequestService,
        smartread_config: SmartReadConfig,
        db: Session,
    ) -> None:
        task_date = date(2024, 1, 1)
        existing_task = SmartReadTask(
            config_id=smartread_config.id,
            task_id="task-existing",
            task_date=task_date,
            state="CREATED",
        )
        db.add(existing_task)
        db.flush()

        task_id, task_rec = await request_service.get_or_create_daily_task(
            smartread_config.id, task_date
        )

        assert task_id == "task-existing"
        assert task_rec.id == existing_task.id

    @pytest.mark.asyncio
    async def test_get_or_create_daily_task_new(
        self,
        request_service: SmartReadRequestService,
        smartread_config: SmartReadConfig,
        db: Session,
    ) -> None:
        task_date = date(2024, 1, 2)

        with patch(
            "app.infrastructure.smartread.client.SmartReadClient.create_task_with_name",
            new_callable=AsyncMock,
        ) as mock_create:
            mock_create.return_value = "task-new-id"

            task_id, task_rec = await request_service.get_or_create_daily_task(
                smartread_config.id, task_date
            )

        assert task_id == "task-new-id"
        assert task_rec.task_id == "task-new-id"
        mock_create.assert_called_once_with("OCR_20240102")


class TestRequestSubmission:
    """Tests for request submission."""

    @pytest.mark.asyncio
    async def test_submit_ocr_request(
        self,
        request_service: SmartReadRequestService,
        smartread_config: SmartReadConfig,
        db: Session,
    ) -> None:
        task = SmartReadTask(
            config_id=smartread_config.id,
            task_id="task-123",
            task_date=date.today(),
        )
        db.add(task)
        db.flush()

        with patch(
            "app.infrastructure.smartread.client.SmartReadClient.submit_request",
            new_callable=AsyncMock,
        ) as mock_submit:
            mock_submit.return_value = "req-123"

            req_rec = await request_service.submit_ocr_request(
                smartread_config.id, task.task_id, task, b"pdf content", "test.pdf"
            )

        assert req_rec is not None
        assert req_rec.request_id == "req-123"
        assert req_rec.task_id_ref == task.id


class TestPollingAndProcessing:
    """Tests for result polling and processing."""

    @pytest.mark.asyncio
    async def test_poll_and_process_request_success(
        self,
        request_service: SmartReadRequestService,
        smartread_config: SmartReadConfig,
        db: Session,
    ) -> None:
        task = SmartReadTask(config_id=smartread_config.id, task_id="t1", task_date=date.today())
        db.add(task)
        db.flush()

        req = SmartReadRequest(
            request_id="r1",
            config_id=smartread_config.id,
            task_id_ref=task.id,
            task_id="t1",
            task_date=date.today(),
            filename="test.pdf",
        )
        db.add(req)
        db.flush()

        # Mock status
        mock_status = SmartReadRequestStatus(request_id="r1", state="COMPLETED", num_of_pages=1)

        # Mock results
        mock_results = SmartReadRequestResults(
            request_id="r1",
            success=True,
            raw_response={
                "results": [
                    {
                        "pages": [
                            {
                                "fields": [
                                    {
                                        "fieldId": "f1",
                                        "name": "材質コード",
                                        "singleLine": {"text": "MAT1"},
                                    }
                                ]
                            }
                        ]
                    }
                ]
            },
            results=[
                {
                    "pages": [
                        {
                            "fields": [
                                {
                                    "fieldId": "f1",
                                    "name": "材質コード",
                                    "singleLine": {"text": "MAT1"},
                                }
                            ]
                        }
                    ]
                }
            ],
        )

        with (
            patch(
                "app.infrastructure.smartread.client.SmartReadClient.poll_request_until_complete",
                new_callable=AsyncMock,
            ) as mock_poll,
            patch(
                "app.infrastructure.smartread.client.SmartReadClient.get_request_results",
                new_callable=AsyncMock,
            ) as mock_get_results,
            patch.object(request_service, "_calculate_row_fingerprint") as mock_fp,
        ):
            mock_poll.return_value = mock_status
            mock_get_results.return_value = mock_results
            mock_fp.return_value = "fake-fp"

            success = await request_service.poll_and_process_request(smartread_config.id, req)

        assert success is True
        assert req.state == "COMPLETED"
        assert req.result_json is not None

        # Verify storage
        wide = db.query(SmartReadWideData).filter_by(request_id_ref=req.id).first()
        assert wide is not None
        assert wide.content["材質コード"] == "MAT1"

        long = db.query(SmartReadLongData).filter_by(request_id_ref=req.id).first()
        assert long is not None
        assert long.content["value"] == "MAT1"


class TestFieldExtraction:
    """Tests for field extraction logic."""

    def test_extract_field_value_various_types(self, request_service: SmartReadRequestService):
        # Correction
        assert request_service._extract_field_value({"correction": "CORRECTED"}) == "CORRECTED"

        # Checkbox
        assert (
            request_service._extract_field_value({"checkbox": {"isChecked": {"result": True}}})
            == "True"
        )

        # Single line
        assert request_service._extract_field_value({"singleLine": {"text": "hello"}}) == "hello"

        # Multi line
        multi = {"multiLine": {"lines": [{"text": "line1"}, {"text": "line2"}]}}
        assert request_service._extract_field_value(multi) == "line1\nline2"

    def test_extract_field_confidence(self, request_service: SmartReadRequestService):
        assert (
            request_service._extract_field_confidence({"singleLine": {"confidence": 0.95}}) == 0.95
        )

        multi = {"multiLine": {"lines": [{"confidence": 0.9}, {"confidence": 0.8}]}}
        assert request_service._extract_field_confidence(multi) == 0.8
