"""Tests for SmartReadAnalyzeService."""

from unittest.mock import AsyncMock, patch

import pytest
from sqlalchemy.orm import Session

from app.application.services.smartread.analyze_service import SmartReadAnalyzeService
from app.infrastructure.persistence.models.smartread_models import SmartReadConfig
from app.infrastructure.smartread.client import SmartReadResult


@pytest.fixture
def analyze_service(db_session: Session) -> SmartReadAnalyzeService:
    """Create an SmartReadAnalyzeService instance.

    Since AnalyzeService uses TYPE_CHECKING protocol for get_config,
    we use the composite SmartReadService which provides the actual method.
    """
    from app.application.services.smartread import SmartReadService

    return SmartReadService(db_session)


@pytest.fixture
def smartread_config(db_session: Session) -> SmartReadConfig:
    """Create a SmartReadConfig for analyze tests."""
    config = SmartReadConfig(
        name="Analyze Test",
        endpoint="https://api.smartread.example.com",
        api_key="sk-test-key",
        template_ids="tmpl_a,tmpl_b",
    )
    db_session.add(config)
    db_session.flush()
    return config


@pytest.fixture
def config_no_templates(db_session: Session) -> SmartReadConfig:
    """Create a SmartReadConfig without template_ids."""
    config = SmartReadConfig(
        name="No Templates",
        endpoint="https://api.smartread.example.com",
        api_key="sk-test-key",
        template_ids=None,
    )
    db_session.add(config)
    db_session.flush()
    return config


class TestAnalyzeFile:
    """Tests for analyze_file."""

    @pytest.mark.asyncio
    async def test_analyze_file_config_not_found(
        self,
        analyze_service: SmartReadAnalyzeService,
    ) -> None:
        result = await analyze_service.analyze_file(
            config_id=99999,
            file_content=b"fake pdf content",
            filename="test.pdf",
        )
        assert result.success is False
        assert result.error_message == "設定が見つかりません"
        assert result.filename == "test.pdf"

    @pytest.mark.asyncio
    async def test_analyze_file_success(
        self,
        analyze_service: SmartReadAnalyzeService,
        smartread_config: SmartReadConfig,
    ) -> None:
        mock_result = SmartReadResult(
            success=True,
            data=[{"field": "value"}],
            raw_response={"status": "ok"},
            request_id="req-001",
        )
        with patch(
            "app.application.services.smartread.analyze_service.SmartReadClient"
        ) as mock_client_cls:
            mock_instance = AsyncMock()
            mock_instance.analyze_file = AsyncMock(return_value=mock_result)
            mock_client_cls.return_value = mock_instance

            result = await analyze_service.analyze_file(
                config_id=smartread_config.id,
                file_content=b"fake pdf content",
                filename="test.pdf",
            )

        assert result.success is True
        assert result.filename == "test.pdf"
        assert len(result.data) == 1
        assert result.data[0]["field"] == "value"

        # Verify client was created with correct params
        mock_client_cls.assert_called_once_with(
            endpoint="https://api.smartread.example.com",
            api_key="sk-test-key",
            template_ids=["tmpl_a", "tmpl_b"],
        )

    @pytest.mark.asyncio
    async def test_analyze_file_failure(
        self,
        analyze_service: SmartReadAnalyzeService,
        smartread_config: SmartReadConfig,
    ) -> None:
        mock_result = SmartReadResult(
            success=False,
            data=[],
            raw_response={"status": "error"},
            error_message="OCR processing failed",
        )
        with patch(
            "app.application.services.smartread.analyze_service.SmartReadClient"
        ) as mock_client_cls:
            mock_instance = AsyncMock()
            mock_instance.analyze_file = AsyncMock(return_value=mock_result)
            mock_client_cls.return_value = mock_instance

            result = await analyze_service.analyze_file(
                config_id=smartread_config.id,
                file_content=b"corrupted content",
                filename="bad.pdf",
            )

        assert result.success is False
        assert result.error_message == "OCR processing failed"

    @pytest.mark.asyncio
    async def test_analyze_file_no_template_ids(
        self,
        analyze_service: SmartReadAnalyzeService,
        config_no_templates: SmartReadConfig,
    ) -> None:
        mock_result = SmartReadResult(
            success=True,
            data=[],
            raw_response={},
        )
        with patch(
            "app.application.services.smartread.analyze_service.SmartReadClient"
        ) as mock_client_cls:
            mock_instance = AsyncMock()
            mock_instance.analyze_file = AsyncMock(return_value=mock_result)
            mock_client_cls.return_value = mock_instance

            await analyze_service.analyze_file(
                config_id=config_no_templates.id,
                file_content=b"content",
                filename="test.pdf",
            )

        # template_ids should be None when not set
        mock_client_cls.assert_called_once_with(
            endpoint="https://api.smartread.example.com",
            api_key="sk-test-key",
            template_ids=None,
        )
