"""SmartRead watch directory service."""

from __future__ import annotations

import logging
import os
from datetime import datetime
from pathlib import Path
from typing import TYPE_CHECKING, Any

from app.application.services.smartread.base import SmartReadBaseService

from .types import AnalyzeResult, WatchDirProcessOutcome


if TYPE_CHECKING:
    from datetime import date
    from pathlib import Path

    from app.infrastructure.persistence.models import SmartReadConfig
    from app.infrastructure.persistence.models.smartread_models import SmartReadTask
    from app.infrastructure.smartread.client import SmartReadClient


logger = logging.getLogger(__name__)


class SmartReadWatchService(SmartReadBaseService):
    """監視フォルダ処理関連のサービス."""

    if TYPE_CHECKING:

        def get_config(self, config_id: int) -> SmartReadConfig | None: ...

        def get_or_create_task(
            self,
            config_id: int,
            task_id: str,
            task_date: date,
            name: str | None = None,
            state: str | None = None,
        ) -> SmartReadTask: ...

        def _get_client(
            self, config_id: int
        ) -> tuple[SmartReadClient | None, SmartReadConfig | None]: ...

        async def sync_with_simple_flow(
            self,
            config_id: int,
            file_content: bytes,
            filename: str,
            *,
            export_type_override: str | None = None,
            aggregation_override: str | None = None,
        ) -> dict[str, Any]: ...

    def list_files_in_watch_dir(self, config_id: int) -> list[str]:
        """監視ディレクトリ内のファイル一覧を取得.

        Args:
            config_id: 設定ID

        Returns:
            ファイル名のリスト
        """
        config = self.get_config(config_id)
        if not config or not config.watch_dir:
            logger.warning(
                "[SmartRead] Watch dir is not configured",
                extra={"config_id": config_id},
            )
            return []

        watch_dir = Path(config.watch_dir)
        if not watch_dir.exists() or not watch_dir.is_dir():
            logger.warning(
                "[SmartRead] Watch dir not found or not a directory",
                extra={"config_id": config_id, "watch_dir": str(watch_dir)},
            )
            return []

        extensions = set()
        if config.input_exts:
            extensions = {
                f".{ext.strip().lower().lstrip('.')}"
                for ext in config.input_exts.split(",")
                if ext.strip()
            }

        files = []
        try:
            for entry in os.scandir(watch_dir):
                if entry.is_file():
                    if not extensions or Path(entry.name).suffix.lower() in extensions:
                        files.append(entry.name)
        except OSError as e:
            logger.error(f"Error listing files in {watch_dir}: {e}")
            return []

        if not files:
            logger.info(
                "[SmartRead] Watch dir listed but no matching files found",
                extra={
                    "config_id": config_id,
                    "watch_dir": str(watch_dir),
                    "input_exts": config.input_exts,
                },
            )

        return sorted(files)

    async def process_watch_dir_files(
        self, config_id: int, filenames: list[str]
    ) -> list[AnalyzeResult]:
        """監視ディレクトリ内の指定ファイルを処理.

        複数ファイルを1タスクにまとめてSmartRead APIで処理する。

        Args:
            config_id: 設定ID
            filenames: 処理するファイル名のリスト

        Returns:
            解析結果のリスト
        """
        outcome = await self._process_watch_dir_files(config_id, filenames)
        return outcome.results

    async def process_watch_dir_files_with_task(
        self, config_id: int, filenames: list[str]
    ) -> tuple[str | None, list[AnalyzeResult], Path | None]:
        """監視ディレクトリ内の指定ファイルを処理し、タスクIDを返す."""
        outcome = await self._process_watch_dir_files(config_id, filenames)
        return outcome.task_id, outcome.results, outcome.watch_dir

    async def _process_watch_dir_files(
        self, config_id: int, filenames: list[str]
    ) -> WatchDirProcessOutcome:
        """監視ディレクトリ内の指定ファイルを処理する共通ロジック."""
        config = self.get_config(config_id)
        if not config or not config.watch_dir:
            logger.warning(
                "[SmartRead] Watch dir processing skipped because config/watch_dir is missing",
                extra={"config_id": config_id},
            )
            return WatchDirProcessOutcome(task_id=None, results=[], watch_dir=None)

        watch_dir = Path(config.watch_dir)
        # ファイルを読み込み
        files_to_process: list[tuple[bytes, str]] = []
        results: list[AnalyzeResult] = []

        for filename in filenames:
            file_path = watch_dir / filename
            if not file_path.exists():
                logger.warning(
                    "[SmartRead] Watch dir file not found",
                    extra={
                        "config_id": config_id,
                        "filename": filename,
                        "watch_dir": str(watch_dir),
                    },
                )
                results.append(AnalyzeResult(False, filename, [], "File not found"))
                continue

            try:
                with open(file_path, "rb") as f:
                    content = f.read()
                files_to_process.append((content, filename))
            except Exception as e:
                logger.error(f"Error reading file {filename}: {e}")
                results.append(AnalyzeResult(False, filename, [], str(e)))

        # ファイルがなければ終了
        if not files_to_process:
            return WatchDirProcessOutcome(task_id=None, results=results, watch_dir=watch_dir)

        task_id = None
        try:
            simple_result = await self.sync_watch_dir_files(
                config_id=config_id,
                files_to_process=files_to_process,
            )
            task_id = simple_result.get("task_id")
            for _, filename in files_to_process:
                results.append(
                    AnalyzeResult(
                        success=True,
                        filename=filename,
                        data=[],
                        error_message=None,
                    )
                )
        except Exception as e:
            for _, filename in files_to_process:
                results.append(AnalyzeResult(False, filename, [], str(e)))

        return WatchDirProcessOutcome(
            task_id=task_id,
            results=results,
            watch_dir=watch_dir,
        )

    async def diagnose_watch_dir_file(
        self,
        config_id: int,
        filename: str,
    ) -> dict[str, Any]:
        """SmartRead APIへの送信診断.

        requestId方式とexport方式の両方を試し、結果を返す。
        """
        config = self.get_config(config_id)
        if not config or not config.watch_dir:
            return {
                "request_flow": {
                    "success": False,
                    "error_message": "設定または監視フォルダが未設定です",
                    "response": None,
                },
                "export_flow": {
                    "success": False,
                    "error_message": "設定または監視フォルダが未設定です",
                    "response": None,
                },
            }

        watch_dir = Path(config.watch_dir)
        file_path = watch_dir / filename
        if not file_path.exists():
            error_message = f"ファイルが見つかりません: {file_path}"
            return {
                "request_flow": {
                    "success": False,
                    "error_message": error_message,
                    "response": None,
                },
                "export_flow": {
                    "success": False,
                    "error_message": error_message,
                    "response": None,
                },
            }

        try:
            file_content = file_path.read_bytes()
        except OSError as e:
            error_message = f"ファイル読み込み失敗: {e}"
            return {
                "request_flow": {
                    "success": False,
                    "error_message": error_message,
                    "response": None,
                },
                "export_flow": {
                    "success": False,
                    "error_message": error_message,
                    "response": None,
                },
            }

        client, _ = self._get_client(config_id)
        if not client:
            return {
                "request_flow": {
                    "success": False,
                    "error_message": "SmartRead設定が見つかりません",
                    "response": None,
                },
                "export_flow": {
                    "success": False,
                    "error_message": "SmartRead設定が見つかりません",
                    "response": None,
                },
            }

        request_flow: dict[str, Any] = {"success": False, "error_message": None, "response": None}
        export_flow: dict[str, Any] = {"success": False, "error_message": None, "response": None}

        try:
            task_id = await client.create_task_with_name(
                f"diagnose_request_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            )
            if not task_id:
                raise RuntimeError("タスク作成に失敗しました")

            request_id = await client.submit_request(task_id, file_content, filename)
            if not request_id:
                raise RuntimeError("リクエスト送信に失敗しました")

            status = await client.get_request_status(request_id)
            results_payload: dict[str, Any] | None = None
            if status and status.is_completed():
                results = await client.get_request_results(request_id)
                if results:
                    results_payload = results.raw_response

            request_flow = {
                "success": True,
                "error_message": None,
                "response": {
                    "task_id": task_id,
                    "request_id": request_id,
                    "status": status.__dict__ if status else None,
                    "results": results_payload,
                },
            }
        except Exception as e:
            request_flow = {
                "success": False,
                "error_message": str(e),
                "response": None,
            }

        try:
            task_id = await client.create_task_with_name(
                f"diagnose_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            )
            if not task_id:
                raise RuntimeError("タスク作成に失敗しました")

            request_id = await client.submit_request(task_id, file_content, filename)
            if not request_id:
                raise RuntimeError("リクエスト送信に失敗しました")

            export_type = config.export_type or "csv"
            export = await client.create_export(
                task_id,
                export_type=export_type,
                aggregation=config.aggregation_type,
            )
            if not export:
                raise RuntimeError("エクスポート作成に失敗しました")

            export_status = await client.poll_export_until_ready(
                task_id,
                export.export_id,
                timeout_sec=120.0,
                poll_interval=5.0,
            )
            downloaded_size = None
            if export_status and export_status.state.upper() in ("COMPLETED", "SUCCEEDED"):
                download = await client.download_export(task_id, export.export_id)
                if download is not None:
                    downloaded_size = len(download)

            export_flow = {
                "success": True,
                "error_message": None,
                "response": {
                    "task_id": task_id,
                    "request_id": request_id,
                    "export": export.__dict__,
                    "export_status": export_status.__dict__ if export_status else None,
                    "downloaded_size": downloaded_size,
                },
            }
        except Exception as e:
            export_flow = {
                "success": False,
                "error_message": str(e),
                "response": None,
            }

        return {
            "request_flow": request_flow,
            "export_flow": export_flow,
        }
