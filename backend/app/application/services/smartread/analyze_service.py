"""SmartRead analyze service."""

from __future__ import annotations

import logging

from app.infrastructure.smartread.client import SmartReadClient, SmartReadResult

from .types import AnalyzeResult

logger = logging.getLogger(__name__)


class SmartReadAnalyzeService:
    """SmartRead OCR解析関連の処理."""

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
