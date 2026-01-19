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
    request_id: str | None = None
    filename: str | None = None


@dataclass
class SmartReadMultiResult:
    """SmartRead OCR複数ファイル解析結果."""

    task_id: str
    results: list[SmartReadResult]


@dataclass
class SmartReadTask:
    """SmartReadタスク情報."""

    task_id: str
    name: str
    status: str  # RUNNING | SUCCEEDED | FAILED
    created_at: str | None = None
    request_count: int = 0


@dataclass
class SmartReadExport:
    """SmartReadエクスポート情報."""

    export_id: str
    state: str  # RUNNING | SUCCEEDED | FAILED
    task_id: str | None = None
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

    def _build_api_url(self, path: str) -> str:
        """APIパスを構築.

        エンドポイントに既にバージョン（/v3, /v4等）が含まれている場合は
        pathからバージョン部分を削除して重複を防ぐ。

        Args:
            path: APIパス（例: /v3/task）

        Returns:
            完全なURL
        """
        import re

        # エンドポイントの末尾がバージョンパターン（/v3, /v4等）かチェック
        version_pattern = r"/v\d+$"
        if re.search(version_pattern, self.endpoint):
            # エンドポイントにバージョンが含まれている場合、pathからバージョン部分を削除
            path = re.sub(r"^/v\d+", "", path)
        return f"{self.endpoint}{path}"

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
        url = self._build_api_url("/v3/task")

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
        url = self._build_api_url(f"/v3/task/{task_id}/request")
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

        url = self._build_api_url(f"/v3/request/{request_id}/results")
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

    async def analyze_files(
        self,
        files: list[tuple[bytes, str]],
        timeout: float = 300.0,
    ) -> SmartReadMultiResult:
        """複数ファイルを1タスクでSmartRead API (v3) で解析.

        1タスクに複数ファイルを投入し、各ファイルの結果をまとめて返す。

        Args:
            files: (ファイルデータ, ファイル名) のタプルリスト
            timeout: タイムアウト秒数

        Returns:
            SmartReadMultiResult: タスクIDと各ファイルの解析結果
        """
        results: list[SmartReadResult] = []
        task_id = ""

        if not files:
            return SmartReadMultiResult(task_id="", results=[])

        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                # 1. Task作成（1回だけ）
                task_id = await self._create_task(client)

                # 2. 各ファイルを投入
                request_ids: list[tuple[str, str]] = []  # (request_id, filename)
                for file_content, filename in files:
                    try:
                        request_id = await self._upload_file(
                            client, task_id, file_content, filename
                        )
                        request_ids.append((request_id, filename))
                    except Exception as e:
                        logger.error(f"Failed to upload file {filename}: {e}")
                        results.append(
                            SmartReadResult(
                                success=False,
                                data=[],
                                raw_response={},
                                error_message=f"Upload failed: {e!s}",
                                filename=filename,
                            )
                        )

                # 3. 各ファイルの結果を取得
                for request_id, filename in request_ids:
                    result = await self._poll_results(client, request_id, timeout)
                    result.filename = filename
                    result.request_id = request_id
                    results.append(result)

        except httpx.HTTPStatusError as e:
            logger.error(f"SmartRead API error: {e.response.status_code} - {e.response.text}")
            # タスク作成に失敗した場合、未処理ファイルのみエラー結果を追加
            processed_filenames = {r.filename for r in results}
            for _, filename in files:
                if filename not in processed_filenames:
                    results.append(
                        SmartReadResult(
                            success=False,
                            data=[],
                            raw_response={},
                            error_message=f"API Error: {e.response.status_code}",
                            filename=filename,
                        )
                    )
        except Exception as e:
            logger.error(f"SmartRead unexpected error: {e}")
            # 未処理ファイルのみエラー結果を追加（既存の成功結果は保持）
            processed_filenames = {r.filename for r in results}
            for _, filename in files:
                if filename not in processed_filenames:
                    results.append(
                        SmartReadResult(
                            success=False,
                            data=[],
                            raw_response={},
                            error_message=f"Unexpected Error: {e!s}",
                            filename=filename,
                        )
                    )

        return SmartReadMultiResult(task_id=task_id, results=results)

    # ==================== タスク一覧・Export API ====================

    async def get_tasks(self, timeout: float = 30.0) -> list[SmartReadTask]:
        """タスク一覧を取得.

        GET /v3/task

        Returns:
            タスク一覧
        """
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                url = self._build_api_url("/v3/task")
                headers = self._get_headers()
                logger.info(f"Fetching tasks from SmartRead API: {url}")

                response = await client.get(url, headers=headers)

                if response.status_code != 200:
                    logger.error(f"SmartRead API Error: {response.status_code} - {response.text}")

                response.raise_for_status()
                json_data = response.json()
                logger.info(f"Fetched {len(json_data.get('data', []))} tasks from SmartRead API")

                tasks = []
                for item in json_data.get("data", []):
                    tasks.append(
                        SmartReadTask(
                            task_id=item.get("taskId", ""),
                            name=item.get("name", ""),
                            status=item.get(
                                "state", "UNKNOWN"
                            ),  # 'status' -> 'state' based on sample? Sample says "state": "OCR_RUNNING".
                            created_at=item.get("created"),  # 'created_at' -> 'created'
                            request_count=item.get(
                                "numOfRequests", 0
                            ),  # 'requestCount' -> 'numOfRequests'
                        )
                    )
                return tasks

        except httpx.HTTPStatusError as e:
            logger.error(f"Failed to get tasks: {e.response.status_code} - {e.response.text}")
            return []
        except Exception as e:
            logger.error(f"Failed to get tasks: {e}")
            import traceback

            logger.error(traceback.format_exc())
            return []

    async def get_task_requests(self, task_id: str, timeout: float = 30.0) -> list[dict[str, Any]]:
        """タスク内のリクエスト一覧を取得.

        GET /v3/task/{taskId}/request

        Args:
            task_id: タスクID
            timeout: タイムアウト秒数

        Returns:
            リクエスト一覧
        """
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                url = self._build_api_url(f"/v3/task/{task_id}/request")
                headers = self._get_headers()
                response = await client.get(url, headers=headers)
                response.raise_for_status()
                data = response.json()
                return cast(list[dict[str, Any]], data.get("requests", []))

        except Exception as e:
            logger.error(f"Failed to get task requests: {e}")
            return []

    async def create_export(
        self,
        task_id: str,
        export_type: str = "csv",
        timeout: float = 30.0,
    ) -> SmartReadExport | None:
        """Export作成.

        POST /v3/task/{taskId}/export

        Args:
            task_id: タスクID
            export_type: エクスポート形式 (csv, json等)
            timeout: タイムアウト秒数

        Returns:
            エクスポート情報
        """
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                url = self._build_api_url(f"/v3/task/{task_id}/export")
                headers = self._get_headers()
                payload = {"exportType": export_type}
                response = await client.post(url, json=payload, headers=headers)
                response.raise_for_status()
                data = response.json()

                return SmartReadExport(
                    export_id=data.get("exportId", ""),
                    state=data.get("state", "RUNNING"),
                    task_id=task_id,
                )

        except httpx.HTTPStatusError as e:
            logger.error(f"Failed to create export: {e.response.status_code}")
            return None
        except Exception as e:
            logger.error(f"Failed to create export: {e}")
            return None

    async def get_export_status(
        self,
        task_id: str,
        export_id: str,
        timeout: float = 30.0,
    ) -> SmartReadExport | None:
        """Export状態を取得.

        GET /v3/task/{taskId}/export/{exportId}

        Args:
            task_id: タスクID
            export_id: エクスポートID
            timeout: タイムアウト秒数

        Returns:
            エクスポート情報
        """
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                url = self._build_api_url(f"/v3/task/{task_id}/export/{export_id}")
                headers = self._get_headers()
                response = await client.get(url, headers=headers)
                response.raise_for_status()
                data = response.json()

                return SmartReadExport(
                    export_id=export_id,
                    state=data.get("state", "UNKNOWN"),
                    task_id=task_id,
                    error_message=data.get("errorMessage"),
                )

        except Exception as e:
            logger.error(f"Failed to get export status: {e}")
            return None

    async def download_export(
        self,
        task_id: str,
        export_id: str,
        timeout: float = 120.0,
    ) -> bytes | None:
        """Exportをダウンロード（ZIP形式）.

        GET /v3/task/{taskId}/export/{exportId}/download

        Args:
            task_id: タスクID
            export_id: エクスポートID
            timeout: タイムアウト秒数

        Returns:
            ZIPファイルのバイナリデータ
        """
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                url = self._build_api_url(f"/v3/task/{task_id}/export/{export_id}/download")
                headers = {"Authorization": f"apikey {self.api_key}"}
                response = await client.get(url, headers=headers)
                response.raise_for_status()
                logger.info(f"Download response status: {response.status_code}")
                logger.info(f"Download content-type: {response.headers.get('content-type')}")
                logger.info(f"Download content-length: {len(response.content)} bytes")
                return response.content

        except Exception as e:
            logger.error(f"Failed to download export: {e}")
            return None

    async def poll_export_until_ready(
        self,
        task_id: str,
        export_id: str,
        timeout_sec: float = 300.0,
        poll_interval: float = 5.0,
    ) -> SmartReadExport | None:
        """Export完了までポーリング.

        Args:
            task_id: タスクID
            export_id: エクスポートID
            timeout_sec: タイムアウト秒数
            poll_interval: ポーリング間隔

        Returns:
            完了したエクスポート情報、またはNone（タイムアウト/失敗）
        """
        import asyncio
        import time

        start_time = time.time()

        while True:
            if time.time() - start_time > timeout_sec:
                logger.error("Export polling timeout")
                return None

            export = await self.get_export_status(task_id, export_id)
            if export is None:
                return None

            if export.state == "SUCCEEDED":
                return export
            elif export.state == "FAILED":
                logger.error(f"Export failed: {export.error_message}")
                return export

            await asyncio.sleep(poll_interval)
