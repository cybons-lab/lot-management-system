"""Tests for SmartReadConfigService."""

import pytest
from sqlalchemy.orm import Session

from app.application.services.smartread.config_service import SmartReadConfigService
from app.infrastructure.persistence.models.smartread_models import SmartReadConfig


@pytest.fixture
def config_service(db_session: Session) -> SmartReadConfigService:
    """Create a SmartReadConfigService instance."""
    return SmartReadConfigService(db_session)


@pytest.fixture
def sample_config(db_session: Session) -> SmartReadConfig:
    """Create a sample SmartReadConfig for testing."""
    config = SmartReadConfig(
        name="Test Config",
        endpoint="https://api.example.com",
        api_key="test-api-key-123",
        template_ids="tmpl_1,tmpl_2",
        export_type="csv",
        watch_dir="/tmp/watch",
        export_dir="/tmp/export",
        input_exts="pdf,png",
        description="Test config for unit tests",
        is_active=True,
    )
    db_session.add(config)
    db_session.flush()
    return config


class TestGetConfig:
    """Tests for get_config."""

    def test_get_existing_config(
        self,
        config_service: SmartReadConfigService,
        sample_config: SmartReadConfig,
    ) -> None:
        result = config_service.get_config(sample_config.id)
        assert result is not None
        assert result.id == sample_config.id
        assert result.name == "Test Config"
        assert result.endpoint == "https://api.example.com"

    def test_get_nonexistent_config(
        self,
        config_service: SmartReadConfigService,
    ) -> None:
        result = config_service.get_config(99999)
        assert result is None


class TestGetAllConfigs:
    """Tests for get_all_configs."""

    def test_get_all_configs_empty(
        self,
        config_service: SmartReadConfigService,
    ) -> None:
        result = config_service.get_all_configs()
        assert result == []

    def test_get_all_configs(
        self,
        config_service: SmartReadConfigService,
        sample_config: SmartReadConfig,
    ) -> None:
        result = config_service.get_all_configs()
        assert len(result) == 1
        assert result[0].id == sample_config.id


class TestGetActiveConfigs:
    """Tests for get_active_configs."""

    def test_get_active_configs_only(
        self,
        config_service: SmartReadConfigService,
        db_session: Session,
    ) -> None:
        # Create active config
        active = SmartReadConfig(
            name="Active",
            endpoint="https://api.example.com",
            api_key="key",
            is_active=True,
        )
        # Create inactive config
        inactive = SmartReadConfig(
            name="Inactive",
            endpoint="https://api.example.com",
            api_key="key",
            is_active=False,
        )
        db_session.add_all([active, inactive])
        db_session.flush()

        result = config_service.get_active_configs()
        assert len(result) == 1
        assert result[0].name == "Active"


class TestCreateConfig:
    """Tests for create_config."""

    def test_create_config_minimal(
        self,
        config_service: SmartReadConfigService,
    ) -> None:
        result = config_service.create_config(
            endpoint="https://api.example.com",
            api_key="test-key",
        )
        assert result.id is not None
        assert result.endpoint == "https://api.example.com"
        assert result.api_key == "test-key"
        assert result.name == "default"
        assert result.is_active is True

    def test_create_config_full(
        self,
        config_service: SmartReadConfigService,
    ) -> None:
        result = config_service.create_config(
            endpoint="https://api.example.com",
            api_key="test-key",
            name="Full Config",
            template_ids="t1,t2,t3",
            export_type="json",
            aggregation_type="page",
            watch_dir="/data/watch",
            export_dir="/data/export",
            input_exts="pdf",
            description="Full test config",
            is_active=False,
        )
        assert result.name == "Full Config"
        assert result.template_ids == "t1,t2,t3"
        assert result.export_type == "json"
        assert result.is_active is False


class TestUpdateConfig:
    """Tests for update_config."""

    def test_update_config_success(
        self,
        config_service: SmartReadConfigService,
        sample_config: SmartReadConfig,
    ) -> None:
        result = config_service.update_config(
            sample_config.id,
            name="Updated Name",
            description="Updated description",
        )
        assert result is not None
        assert result.name == "Updated Name"
        assert result.description == "Updated description"
        # Unchanged fields
        assert result.endpoint == "https://api.example.com"

    def test_update_nonexistent_config(
        self,
        config_service: SmartReadConfigService,
    ) -> None:
        result = config_service.update_config(99999, name="New Name")
        assert result is None

    def test_update_ignores_unknown_fields(
        self,
        config_service: SmartReadConfigService,
        sample_config: SmartReadConfig,
    ) -> None:
        result = config_service.update_config(
            sample_config.id,
            nonexistent_field="value",
        )
        assert result is not None
        # Should not raise, unknown fields silently ignored


class TestDeleteConfig:
    """Tests for delete_config."""

    def test_delete_config_success(
        self,
        config_service: SmartReadConfigService,
        sample_config: SmartReadConfig,
        db_session: Session,
    ) -> None:
        config_id = sample_config.id
        result = config_service.delete_config(config_id)
        assert result is True

        # Verify deleted
        assert db_session.get(SmartReadConfig, config_id) is None

    def test_delete_nonexistent_config(
        self,
        config_service: SmartReadConfigService,
    ) -> None:
        result = config_service.delete_config(99999)
        assert result is False
