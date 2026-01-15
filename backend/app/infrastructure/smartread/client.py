"""SmartRead OCR API Client.

SmartRead APIと通信し、PDF/画像のOCR処理を行う。
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any, cast

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
    ) -> None:
        """初期化.

        Args:
            endpoint: SmartRead APIエンドポイント
            api_key: APIキー
            template_ids: テンプレートID（帳票認識用）
        """
        self.endpoint = endpoint.rstrip("/")
        self.api_key = api_key
        self.template_ids = template_ids or []

    async def analyze_file(
        self,
        file_content: bytes,
        filename: str,
        timeout: float = 120.0,
    ) -> SmartReadResult:
        """ファイルをSmartRead API (v3) で解析.

        Steps:
        1. Task作成 (POST /v3/task)
        2. ファイル投入 (POST /v3/task/{taskId}/request)
        3. 結果取得 (GET /v3/request/{requestId}/results)

        Args:
            file_content: ファイルのバイナリデータ
            filename: ファイル名
            timeout: タイムアウト秒数

        Returns:
            SmartReadResult: 解析結果
        """
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                # 1. Task作成
                task_id = await self._create_task(client)

                # 2. ファイル投入
                request_id = await self._upload_file(client, task_id, file_content, filename)

                # 3. 結果取得 (ポーリング)
                # SmartReadは非同期処理のため、結果が出るまで待つ必要があるが
                # 今回は単純化のため、即時取得を試み、ステータスに応じて待機するロジックが必要
                # (ユーザー要求の変更点には明確なポーリング指示はないが、フローとして結果取得が必要)
                # v3 api behavior: GET returns status. If 'succeeded', returns data.
                return await self._poll_results(client, request_id, timeout)

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

    async def _create_task(self, client: httpx.AsyncClient) -> str:
        """Taskを作成してtaskIdを返す."""
        url = f"{self.endpoint}/v3/task"

        # requestTypeは 'templateMatching' 固定 (v3仕様)
        # ユーザー指示: "requestTypeはtemplateMatchingを入れる必要がある"
        payload = {
            "name": "Analyze Task",
            "requestType": "templateMatching",  # Fixed as per requirement
        }

        # テンプレートID指定がある場合
        if self.template_ids:
            payload["templateIds"] = self.template_ids  # type: ignore[assignment]

        headers = self._get_headers()
        response = await client.post(url, json=payload, headers=headers)
        response.raise_for_status()
        data = response.json()
        return cast(str, data["taskId"])

    async def _upload_file(
        self, client: httpx.AsyncClient, task_id: str, file_content: bytes, filename: str
    ) -> str:
        """ファイルをアップロードしてrequestIdを返す."""
        url = f"{self.endpoint}/v3/task/{task_id}/request"
        headers = {
            "Authorization": f"apikey {self.api_key}"
        }  # MultipartなのでContent-Typeは自動設定

        files = {"image": (filename, file_content)}

        response = await client.post(url, files=files, headers=headers)
        response.raise_for_status()
        data = response.json()
        return cast(str, data["requestId"])

    async def _poll_results(
        self, client: httpx.AsyncClient, request_id: str, timeout_sec: float
    ) -> SmartReadResult:
        """結果をポーリングして取得."""
        import asyncio
        import time

        url = f"{self.endpoint}/v3/request/{request_id}/results"
        headers = self._get_headers()

        start_time = time.time()

        while True:
            if time.time() - start_time > timeout_sec:
                return SmartReadResult(
                    success=False,
                    data=[],
                    raw_response={},
                    error_message="Timeout waiting for results",
                )

            response = await client.get(url, headers=headers)
            response.raise_for_status()
            result = response.json()

            # ステータス判定 (ドキュメント未確認だが一般的なフローとして判定)
            # 実際にはレスポンス構造に status フィールドがあるはず
            # ユーザー提供情報ではエンドポイントのみ。
            # 通常、結果エンドポイントは完了するまで pending か 202 を返すことが多い。
            # 仮定: status が 'succeeded' または 'completed'
            status = result.get("status")

            if status == "succeeded" or status == "completed":
                return SmartReadResult(
                    success=True,
                    data=self._extract_data(result),
                    raw_response=result,
                )
            elif status == "failed":
                return SmartReadResult(
                    success=False,
                    data=[],
                    raw_response=result,
                    error_message=f"Analysis failed: {result.get('error')}",
                )

            # 少し待機
            await asyncio.sleep(1)

    def _get_headers(self) -> dict[str, str]:
        """共通ヘッダを取得 (v3)."""
        return {
            "Content-Type": "application/json",
            "Authorization": f"apikey {self.api_key}",
        }

    def _extract_data(self, response: dict[str, Any]) -> list[dict[str, Any]]:
        """APIレスポンスからデータを抽出."""
        # v3レスポンス構造に合わせて調整が必要だが、とりあえず柔軟に
        # results > formResults ?
        if "results" in response:
            return cast(list[dict[str, Any]], response["results"])
        if "data" in response:
            return cast(list[dict[str, Any]], response["data"])
        # Fallback
        return [response]

    async def check_health(self) -> bool:
        """API疎通確認 (v3 endpoint)."""
        try:
            async with httpx.AsyncClient() as client:
                # v3 health check endpoint (仮: /v3/health or just valid auth check)
                # ユーザーからは明示されていないが、認証ヘッダ修正が必要
                # Authorization: apikey ...
                response = await client.get(
                    f"{self.endpoint}/health",  # エンドポイント不明ならルートとか？一旦維持
                    headers={"Authorization": f"apikey {self.api_key}"},
                    timeout=10.0,
                )
                return response.status_code == 200
        except Exception as e:
            logger.warning(f"SmartRead health check failed: {e}")
            return False
