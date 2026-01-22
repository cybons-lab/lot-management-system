"""SmartRead analyze service."""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING

from app.application.services.smartread.base import SmartReadBaseService
from app.infrastructure.smartread.client import SmartReadClient, SmartReadResult

from .types import AnalyzeResult


if TYPE_CHECKING:
    from app.infrastructure.persistence.models import SmartReadConfig


logger = logging.getLogger(__name__)


class SmartReadAnalyzeService(SmartReadBaseService):
    """SmartRead OCR解析関連の処理."""

    if TYPE_CHECKING:

        def get_config(self, config_id: int) -> SmartReadConfig | None: ...

    async def analyze_file(
        self,
        config_id: int,
        file_content: bytes,
        filename: str,
    ) -> AnalyzeResult:
        """ファイルをOCR解析.

        Args:
            config_id: 設定ID
            file_content: ファイルデータ
            filename: ファイル名

        Returns:
            解析結果
        """
        config = self.get_config(config_id)
        if not config:
            return AnalyzeResult(
                success=False,
                filename=filename,
                data=[],
                error_message="設定が見つかりません",
            )

        # テンプレートIDをパース
        template_ids = None
        if config.template_ids:
            template_ids = [t.strip() for t in config.template_ids.split(",") if t.strip()]

        client = SmartReadClient(
            endpoint=config.endpoint,
            api_key=config.api_key,
            template_ids=template_ids,
        )

        result: SmartReadResult = await client.analyze_file(file_content, filename)

        return AnalyzeResult(
            success=result.success,
            filename=filename,
            data=result.data,
            error_message=result.error_message,
        )
