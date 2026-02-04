"""Tests for SmartReadSimpleSyncService."""

import io
import zipfile
from unittest.mock import MagicMock, patch

import pytest
from sqlalchemy.orm import Session

from app.application.services.smartread.simple_sync_service import SmartReadSimpleSyncService
from app.infrastructure.persistence.models.smartread_models import SmartReadConfig


@pytest.fixture
def simple_sync_service(db: Session) -> SmartReadSimpleSyncService:
    """Create a SmartReadSimpleSyncService instance."""
    from app.application.services.smartread import SmartReadService

    return SmartReadService(db)


@pytest.fixture
def smartread_config(db: Session) -> SmartReadConfig:
    """Create a SmartReadConfig for simple sync tests."""
    config = SmartReadConfig(
        name="Simple Sync Test",
        endpoint="https://api.example.com",
        api_key="sk-test-key",
        template_ids="tmpl-123",
    )
    db.add(config)
    db.flush()
    return config


class TestSyncWithSimpleFlow:
    """Tests for sync_with_simple_flow."""

    @pytest.mark.asyncio
    async def test_sync_with_simple_flow_success(
        self,
        simple_sync_service: SmartReadSimpleSyncService,
        smartread_config: SmartReadConfig,
        db: Session,
    ) -> None:
        filename = "test.pdf"
        file_content = b"fake pdf"

        # Mock requests.Session
        mock_session = MagicMock()

        # 1. Mock _create_task response (POST /task)
        mock_task_resp = MagicMock()
        mock_task_resp.status_code = 202
        mock_task_resp.json.return_value = {"taskId": "task-123"}

        # 2. Mock _upload_file response (POST /task/{id}/request)
        mock_upload_resp = MagicMock()
        mock_upload_resp.status_code = 202
        mock_upload_resp.json.return_value = {"requestId": "req-123"}

        # 3. Mock _poll_task_until_completed (GET /task/{id})
        mock_poll_task_resp = MagicMock()
        mock_poll_task_resp.status_code = 200
        mock_poll_task_resp.json.return_value = {"state": "OCR_COMPLETED"}

        # 4. Mock _start_export (POST /task/{id}/export)
        mock_export_resp = MagicMock()
        mock_export_resp.status_code = 202
        mock_export_resp.json.return_value = {"exportId": "exp-123"}

        # 5. Mock _poll_export_until_completed (GET /task/{id}/export/{id})
        mock_poll_export_resp = MagicMock()
        mock_poll_export_resp.status_code = 200
        mock_poll_export_resp.json.return_value = {"state": "COMPLETED"}

        # 6. Mock _download_export_zip (GET /task/{id}/export/{id}/download)
        mock_download_resp = MagicMock()
        mock_download_resp.status_code = 200
        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, "w") as zf:
            zf.writestr("data.csv", "材質コード1,納入量1\nMAT001,100")
        mock_download_resp.content = zip_buffer.getvalue()

        # Chain behavior for session.post/get
        def mock_dispatch(*args, **kwargs):
            url = args[0]
            if (
                "/task" in url
                and "/request" not in url
                and "/export" not in url
                and "GET" not in kwargs.get("method", "")
            ):
                return mock_task_resp
            if "/request" in url and "/results" not in url:
                return mock_upload_resp
            if (
                "/task" in url
                and "/export" in url
                and "/download" not in url
                and "POST" in kwargs.get("method", "POST")
            ):
                return mock_export_resp
            if "/download" in url:
                return mock_download_resp
            # For polling (GET)
            if "/task" in url and "/export" in url:
                return mock_poll_export_resp
            if "/task" in url:
                return mock_poll_task_resp
            return MagicMock(status_code=404)

        mock_session.post.side_effect = lambda url, **kwargs: mock_dispatch(
            url, method="POST", **kwargs
        )
        mock_session.get.side_effect = lambda url, **kwargs: mock_dispatch(
            url, method="GET", **kwargs
        )

        with (
            patch.object(simple_sync_service, "_create_session", return_value=mock_session),
            patch.object(simple_sync_service, "_save_wide_and_long_data") as mock_save,
        ):
            result = await simple_sync_service.sync_with_simple_flow(
                smartread_config.id, file_content, filename
            )

        assert result["success"] is True
        assert result["task_id"] == "task-123"
        assert result["export_id"] == "exp-123"
        assert len(result["wide_data"]) == 1
        assert result["wide_data"][0]["材質コード1"] == "MAT001"

        mock_save.assert_called_once()


class TestZipExtraction:
    """Tests for _extract_csv_from_zip."""

    def test_extract_csv_from_zip(self, simple_sync_service: SmartReadSimpleSyncService):
        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, "w") as zf:
            # Test UTF-8 with BOM
            content = "\ufeffcol1,col2\nval1,val2"
            zf.writestr("test.csv", content.encode("utf-8"))

        data = simple_sync_service._extract_csv_from_zip(zip_buffer.getvalue())
        assert len(data) == 1
        assert data[0]["col1"] == "val1"
