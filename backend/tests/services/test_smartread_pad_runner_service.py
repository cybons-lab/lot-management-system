"""Tests for SmartReadPadRunnerService."""

import io
import zipfile
from datetime import datetime, timedelta
from unittest.mock import MagicMock, patch

import pytest
from sqlalchemy.orm import Session

from app.application.services.smartread.pad_runner_service import SmartReadPadRunnerService
from app.infrastructure.persistence.models.smartread_models import SmartReadConfig, SmartReadPadRun


@pytest.fixture
def pad_runner_service(db: Session) -> SmartReadPadRunnerService:
    """Create a SmartReadPadRunnerService instance."""
    return SmartReadPadRunnerService(db)


@pytest.fixture
def smartread_config(db: Session) -> SmartReadConfig:
    """Create a SmartReadConfig for PAD runner tests."""
    config = SmartReadConfig(
        name="PAD Test Config",
        endpoint="https://api.example.com",
        api_key="sk-pad-key",
        watch_dir="/tmp/smartread/watch",
    )
    db.add(config)
    db.flush()
    return config


class TestRunManagement:
    """Tests for run lifecycle management."""

    def test_start_run(
        self,
        pad_runner_service: SmartReadPadRunnerService,
        smartread_config: SmartReadConfig,
        db: Session,
    ) -> None:
        run_id = pad_runner_service.start_run(smartread_config.id, ["file1.pdf", "file2.pdf"])
        assert run_id is not None

        run = db.query(SmartReadPadRun).filter_by(run_id=run_id).first()
        assert run is not None
        assert run.status == "RUNNING"
        assert run.filenames == ["file1.pdf", "file2.pdf"]

    def test_get_run_status_stale(
        self,
        pad_runner_service: SmartReadPadRunnerService,
        smartread_config: SmartReadConfig,
        db: Session,
    ) -> None:
        # Create a run that hasn't had a heartbeat for a long time
        old_heartbeat = datetime.now() - timedelta(minutes=5)
        run = SmartReadPadRun(
            run_id="stale-run",
            config_id=smartread_config.id,
            status="RUNNING",
            heartbeat_at=old_heartbeat,
            created_at=datetime.now(),
            updated_at=datetime.now(),
        )
        db.add(run)
        db.flush()

        status = pad_runner_service.get_run_status("stale-run")
        assert status["status"] == "STALE"
        assert "応答なし" in status["error_message"]

    def test_retry_run(
        self,
        pad_runner_service: SmartReadPadRunnerService,
        smartread_config: SmartReadConfig,
        db: Session,
    ) -> None:
        run = SmartReadPadRun(
            run_id="failed-run",
            config_id=smartread_config.id,
            status="FAILED",
            filenames=["retry.pdf"],
            retry_count=0,
            max_retries=3,
            heartbeat_at=datetime.now(),
            created_at=datetime.now(),
            updated_at=datetime.now(),
        )
        db.add(run)
        db.flush()

        new_id = pad_runner_service.retry_run("failed-run")
        assert new_id is not None
        assert new_id != "failed-run"

        assert run.retry_count == 1

        new_run = db.query(SmartReadPadRun).filter_by(run_id=new_id).first()
        assert new_run.filenames == ["retry.pdf"]


class TestExecuteRun:
    """Tests for execute_run full flow."""

    def test_execute_run_success(
        self,
        pad_runner_service: SmartReadPadRunnerService,
        smartread_config: SmartReadConfig,
        db: Session,
        tmp_path,
    ) -> None:
        # Setup watch dir
        watch_dir = tmp_path / "watch"
        watch_dir.mkdir()
        (watch_dir / "test.pdf").write_bytes(b"content")
        smartread_config.watch_dir = str(watch_dir)
        db.flush()

        run_id = pad_runner_service.start_run(smartread_config.id, ["test.pdf"])
        run = db.query(SmartReadPadRun).filter_by(run_id=run_id).first()

        # Mock session and responses
        mock_session = MagicMock()

        def mock_resp(data, status=200):
            r = MagicMock()
            r.status_code = status
            r.json.return_value = data
            return r

        # Flow sequence (keys are method + partial path, no extra spaces)
        responses = {
            "POST:/task/t1/request": mock_resp({"requestId": "r1"}, 202),
            "POST:/task/t1/export": mock_resp({"exportId": "e1"}, 202),
            "POST:/task": mock_resp({"taskId": "t1"}, 202),
            "GET:/request/r1": mock_resp({"state": "COMPLETED"}),
            "GET:/task/t1/export/e1": mock_resp({"state": "COMPLETED"}),
            "GET:/task/t1": mock_resp({"state": "OCR_COMPLETED"}),
        }

        # Download ZIP
        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, "w") as zf:
            zf.writestr("res.csv", "材質コード1,納入量1\nMAT001,100")
        download_resp = MagicMock()
        download_resp.status_code = 200
        download_resp.content = zip_buffer.getvalue()

        def mock_dispatch(url, method="POST", **kwargs):
            if "/download" in url:
                return download_resp
            from urllib.parse import urlparse

            path = urlparse(url).path
            match_key = f"{method}:{path}"
            # Sort keys by length descending to match more specific ones first
            for key in sorted(responses.keys(), key=len, reverse=True):
                if key in match_key:
                    return responses[key]
            print(f"DEBUG: No mock for {match_key} (orig url: {url})")
            return mock_resp({"error": "not found"}, 404)

        mock_session.post.side_effect = lambda url, **kwargs: mock_dispatch(url, "POST", **kwargs)
        mock_session.get.side_effect = lambda url, **kwargs: mock_dispatch(url, "GET", **kwargs)

        @patch("time.sleep", return_value=None)
        def run_test(mock_sleep):
            with (
                patch.object(pad_runner_service, "_create_api_session", return_value=mock_session),
                patch.object(pad_runner_service, "_save_results") as mock_save,
            ):
                pad_runner_service.execute_run(run_id)

            if run.status != "SUCCEEDED":
                print(f"DEBUG: status={run.status}, step={run.step}, error={run.error_message}")

            assert run.status == "SUCCEEDED", f"Run failed: {run.error_message}"
            assert run.step == "POSTPROCESSED"
            assert (watch_dir / "Done" / "test.pdf").exists()
            mock_save.assert_called_once()

        run_test()
