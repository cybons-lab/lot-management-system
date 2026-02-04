"""Tests for SmartReadWatchService."""

import os
import tempfile

import pytest
from sqlalchemy.orm import Session

from app.infrastructure.persistence.models.smartread_models import SmartReadConfig


@pytest.fixture
def watch_service(db_session: Session):
    """Create a SmartReadService instance (composite that includes WatchService)."""
    from app.application.services.smartread import SmartReadService

    return SmartReadService(db_session)


@pytest.fixture
def watch_dir():
    """Create a temporary watch directory with test files."""
    with tempfile.TemporaryDirectory() as tmpdir:
        # Create test files
        for name in ["order1.pdf", "order2.pdf", "image.png", "readme.txt"]:
            with open(os.path.join(tmpdir, name), "w") as f:
                f.write("test content")
        yield tmpdir


@pytest.fixture
def config_with_watch_dir(db_session: Session, watch_dir: str) -> SmartReadConfig:
    """Create a SmartReadConfig with a watch directory."""
    config = SmartReadConfig(
        name="Watch Test",
        endpoint="https://api.example.com",
        api_key="test-key",
        watch_dir=watch_dir,
        input_exts="pdf,png",
    )
    db_session.add(config)
    db_session.flush()
    return config


@pytest.fixture
def config_no_watch_dir(db_session: Session) -> SmartReadConfig:
    """Create a SmartReadConfig without a watch directory."""
    config = SmartReadConfig(
        name="No Watch Dir",
        endpoint="https://api.example.com",
        api_key="test-key",
        watch_dir=None,
    )
    db_session.add(config)
    db_session.flush()
    return config


class TestListFilesInWatchDir:
    """Tests for list_files_in_watch_dir."""

    def test_list_matching_files(self, watch_service, config_with_watch_dir) -> None:
        files = watch_service.list_files_in_watch_dir(config_with_watch_dir.id)
        # Should return pdf and png files only (sorted)
        assert files == ["image.png", "order1.pdf", "order2.pdf"]

    def test_no_config(self, watch_service) -> None:
        files = watch_service.list_files_in_watch_dir(99999)
        assert files == []

    def test_no_watch_dir_configured(self, watch_service, config_no_watch_dir) -> None:
        files = watch_service.list_files_in_watch_dir(config_no_watch_dir.id)
        assert files == []

    def test_watch_dir_does_not_exist(self, watch_service, db_session: Session) -> None:
        config = SmartReadConfig(
            name="Bad Dir",
            endpoint="https://api.example.com",
            api_key="test-key",
            watch_dir="/nonexistent/path/that/does/not/exist",
            input_exts="pdf",
        )
        db_session.add(config)
        db_session.flush()

        files = watch_service.list_files_in_watch_dir(config.id)
        assert files == []

    def test_empty_watch_dir(self, watch_service, db_session: Session) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            config = SmartReadConfig(
                name="Empty Dir",
                endpoint="https://api.example.com",
                api_key="test-key",
                watch_dir=tmpdir,
                input_exts="pdf",
            )
            db_session.add(config)
            db_session.flush()

            files = watch_service.list_files_in_watch_dir(config.id)
            assert files == []

    def test_no_extension_filter(self, watch_service, db_session: Session, watch_dir) -> None:
        """When input_exts is None, return all files."""
        config = SmartReadConfig(
            name="No Filter",
            endpoint="https://api.example.com",
            api_key="test-key",
            watch_dir=watch_dir,
            input_exts="",
        )
        db_session.add(config)
        db_session.flush()

        files = watch_service.list_files_in_watch_dir(config.id)
        assert files == sorted(["order1.pdf", "order2.pdf", "image.png", "readme.txt"])


class TestMoveWatchFile:
    """Tests for _move_watch_file."""

    def test_move_file_to_subdir(self, watch_service, watch_dir) -> None:
        from pathlib import Path

        watch_path = Path(watch_dir)
        assert (watch_path / "order1.pdf").exists()

        watch_service._move_watch_file(watch_path, "order1.pdf", "Done")

        # File should be moved
        assert not (watch_path / "order1.pdf").exists()
        assert (watch_path / "Done" / "order1.pdf").exists()

    def test_move_file_creates_subdir(self, watch_service, watch_dir) -> None:
        from pathlib import Path

        watch_path = Path(watch_dir)
        assert not (watch_path / "Error").exists()

        watch_service._move_watch_file(watch_path, "order1.pdf", "Error")

        assert (watch_path / "Error").is_dir()
        assert (watch_path / "Error" / "order1.pdf").exists()
