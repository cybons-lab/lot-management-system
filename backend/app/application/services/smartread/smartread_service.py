"""SmartRead OCR Service.

PDFや画像のOCR処理とエクスポート機能を提供する。
"""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.application.services.smartread.analyze_service import SmartReadAnalyzeService
from app.application.services.smartread.base import SmartReadBaseService
from app.application.services.smartread.client_service import SmartReadClientService
from app.application.services.smartread.config_service import SmartReadConfigService
from app.application.services.smartread.export_service import SmartReadExportService
from app.application.services.smartread.request_service import SmartReadRequestService
from app.application.services.smartread.task_service import SmartReadTaskService
from app.application.services.smartread.types import (
    AnalyzeResult,
    ExportResult,
    WatchDirProcessOutcome,
)
from app.application.services.smartread.watch_service import SmartReadWatchService


class SmartReadService(
    SmartReadConfigService,
    SmartReadTaskService,
    SmartReadAnalyzeService,
    SmartReadWatchService,
    SmartReadClientService,
    SmartReadExportService,
    SmartReadRequestService,
    SmartReadBaseService,
):
    """SmartRead OCRサービス.

    SmartRead APIを使用したOCR処理と結果のエクスポートを提供。
    """

    def __init__(self, session: Session) -> None:
        """初期化.

        Args:
            session: DBセッション
        """
        super().__init__(session)


__all__ = [
    "AnalyzeResult",
    "ExportResult",
    "SmartReadService",
    "WatchDirProcessOutcome",
]
