"""SmartRead OCR services."""

from app.application.services.smartread.config_service import SmartReadConfigService
from app.application.services.smartread.smartread_service import SmartReadService
from app.application.services.smartread.task_service import SmartReadTaskService


__all__ = [
    "SmartReadService",
    "SmartReadConfigService",
    "SmartReadTaskService",
]
