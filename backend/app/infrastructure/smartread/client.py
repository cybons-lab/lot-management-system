"""SmartRead OCR API Client.

SmartRead APIと通信し、PDF/画像のOCR処理を行う。
"""

from __future__ import annotations

import base64
import logging
from dataclasses import dataclass
from typing import Any

import httpx


logger = logging.getLogger(__name__)


@dataclass
class SmartReadResult:
    """SmartRead OCR解析結果."""

    success: bool
    data: list[dict[str, Any]]
    raw_response: dict[str, Any]
    error_message: str | None = None


class SmartReadClient:
    """SmartRead OCR APIクライアント.

    SmartRead APIを使用してPDF/画像のOCR処理を実行する。
    """

    def __init__(
        self,
        endpoint: str,
        api_key: str,
        template_ids: list[str] | None = None,
        request_type: str = "sync",
    ) -> None:
        """初期化.

        Args:
            endpoint: SmartRead APIエンドポイント
            api_key: APIキー
            template_ids: テンプレートID（帳票認識用）
            request_type: リクエストタイプ（sync/async）
        """
        self.endpoint = endpoint.rstrip("/")
        self.api_key = api_key
        self.template_ids = template_ids or []
        self.request_type = request_type

    async def analyze_file(
        self,
        file_content: bytes,
        filename: str,
        timeout: float = 120.0,
    ) -> SmartReadResult:
        """ファイルをSmartRead APIで解析.

        Args:
            file_content: ファイルのバイナリデータ
            filename: ファイル名
            timeout: タイムアウト秒数

        Returns:
            SmartReadResult: 解析結果
        """
        try:
            # Base64エンコード
            file_base64 = base64.b64encode(file_content).decode("utf-8")

            # リクエストペイロード構築
            payload: dict[str, Any] = {
                "file": file_base64,
                "filename": filename,
            }

            if self.template_ids:
                payload["template_ids"] = self.template_ids

            if self.request_type:
                payload["request_type"] = self.request_type
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.api_key}",
            }

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.endpoint}/analyze",
                    json=payload,
                    headers=headers,
                    timeout=timeout,
                )
                response.raise_for_status()
                result = response.json()

            return SmartReadResult(
                success=True,
                data=self._extract_data(result),
                raw_response=result,
            )

        except httpx.HTTPStatusError as e:
            logger.error(f"SmartRead API error: {e.response.status_code} - {e.response.text}")
            return SmartReadResult(
                success=False,
                data=[],
                raw_response={},
                error_message=f"API Error: {e.response.status_code}",
            )
        except httpx.RequestError as e:
            logger.error(f"SmartRead request error: {e}")
            return SmartReadResult(
                success=False,
                data=[],
                raw_response={},
                error_message=f"Request Error: {e!s}",
            )
        except Exception as e:
            logger.error(f"SmartRead unexpected error: {e}")
            return SmartReadResult(
                success=False,
                data=[],
                raw_response={},
                error_message=f"Unexpected Error: {e!s}",
            )

    def _extract_data(self, response: dict[str, Any]) -> list[dict[str, Any]]:
        """APIレスポンスからデータを抽出.

        SmartReadのレスポンス構造に応じてデータを抽出する。
        一般的な構造: {"results": [...], "pages": [...]}

        Args:
            response: APIレスポンス

        Returns:
            抽出されたデータのリスト
        """
        # SmartReadのレスポンス形式に応じて調整
        if "results" in response:
            return response["results"]
        if "data" in response:
            return response["data"]
        if "pages" in response:
            # ページ単位の結果を統合
            return [{"page": i + 1, "content": page} for i, page in enumerate(response["pages"])]
        # そのまま返す
        return [response] if response else []

    async def check_health(self) -> bool:
        """API疎通確認.

        Returns:
            True: 疎通OK、False: 疎通NG
        """
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.endpoint}/health",
                    headers={"Authorization": f"Bearer {self.api_key}"},
                    timeout=10.0,
                )
                return response.status_code == 200
        except Exception as e:
            logger.warning(f"SmartRead health check failed: {e}")
            return False
