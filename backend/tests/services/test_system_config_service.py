import pytest

from app.application.services.system_config_service import SystemConfigService
from app.infrastructure.persistence.models.system_config_model import SystemConfig


@pytest.mark.usefixtures("db")
def test_get_returns_default_when_missing(db):
    service = SystemConfigService(db)

    assert service.get("missing-key", default="fallback") == "fallback"


@pytest.mark.usefixtures("db")
def test_set_creates_and_get_returns_value(db):
    service = SystemConfigService(db)

    created = service.set("config-key", "config-value", description="説明")

    assert created.config_key == "config-key"
    assert created.config_value == "config-value"
    assert created.description == "説明"
    assert service.get("config-key") == "config-value"


@pytest.mark.usefixtures("db")
def test_set_updates_existing_and_preserves_description(db):
    service = SystemConfigService(db)

    service.set("config-key", "config-value", description="説明")

    updated = service.set("config-key", "next-value")

    assert updated.config_key == "config-key"
    assert updated.config_value == "next-value"
    assert updated.description == "説明"


@pytest.mark.usefixtures("db")
def test_get_all_filters_prefix_and_orders_by_key(db):
    service = SystemConfigService(db)

    # Use keys that match DEFAULT_SETTINGS prefix
    db.add(SystemConfig(config_key="cloud_flow_url_custom", config_value="http://test1"))
    db.add(SystemConfig(config_key="cloud_flow_url_another", config_value="http://test2"))
    db.add(SystemConfig(config_key="other_config", config_value="other"))
    db.flush()

    configs = service.get_all(prefix="cloud_flow")

    # Should return both DEFAULT_SETTINGS entries + custom ones
    config_keys = [config.config_key for config in configs]
    assert "cloud_flow_url_material_delivery" in config_keys
    assert "cloud_flow_url_progress_download" in config_keys
    assert "cloud_flow_url_custom" in config_keys
    assert "cloud_flow_url_another" in config_keys
    assert "other_config" not in config_keys


@pytest.mark.usefixtures("db")
def test_get_returns_default_for_empty_value(db):
    service = SystemConfigService(db)

    service.set("empty-value", "")

    assert service.get("empty-value", default="fallback") == "fallback"
