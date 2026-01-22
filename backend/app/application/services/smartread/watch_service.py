"""SmartRead watch directory service."""

from __future__ import annotations

import json
import logging
from datetime import date, datetime
from pathlib import Path
from typing import TYPE_CHECKING, Any

from app.application.services.smartread.base import SmartReadBaseService
from app.infrastructure.smartread.client import SmartReadClient

from .types import AnalyzeResult, WatchDirProcessOutcome


if TYPE_CHECKING:
    from pathlib import Path

    from app.infrastructure.persistence.models import SmartReadConfig
    from app.infrastructure.persistence.models.smartread_models import SmartReadTask


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

        import os

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

        import os

        watch_dir = Path(config.watch_dir)
        export_dir = Path(config.export_dir) if config.export_dir else None

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

        # テンプレートIDをパース
        template_ids = None
        if config.template_ids:
            template_ids = [t.strip() for t in config.template_ids.split(",") if t.strip()]

        client = SmartReadClient(
            endpoint=config.endpoint,
            api_key=config.api_key,
            template_ids=template_ids,
        )

        # 複数ファイルを1タスクで処理
        multi_result = await client.analyze_files(files_to_process)

        # タスクをDBに保存
        task_date = date.today()
        task_name = f"Watch Dir: {', '.join(filenames[:3])}" + ("..." if len(filenames) > 3 else "")
        try:
            self.get_or_create_task(
                config_id=config_id,
                task_id=multi_result.task_id,
                task_date=task_date,
                name=task_name,
                state=None,  # SmartRead APIのステータスは不明なのでNone
            )
            self.session.commit()
            logger.info(
                f"[SmartRead] Task saved to DB: {multi_result.task_id}",
                extra={"config_id": config_id, "task_id": multi_result.task_id},
            )
        except Exception as e:
            logger.error(
                f"[SmartRead] Failed to save task to DB: {e}",
                extra={"config_id": config_id, "task_id": multi_result.task_id},
            )
            self.session.rollback()

        # 結果を変換
        for sr_result in multi_result.results:
            analyze_result = AnalyzeResult(
                success=sr_result.success,
                filename=sr_result.filename or "",
                data=sr_result.data,
                error_message=sr_result.error_message,
            )

            # JSON出力
            if analyze_result.success and export_dir and analyze_result.filename:
                if not export_dir.exists():
                    try:
                        os.makedirs(export_dir, exist_ok=True)
                    except OSError as e:
                        logger.error(f"Failed to create export dir: {e}")

                if export_dir.exists():
                    json_name = f"{Path(analyze_result.filename).stem}.json"
                    json_path = export_dir / json_name
                    with open(json_path, "w", encoding="utf-8") as f:
                        json.dump(analyze_result.data, f, ensure_ascii=False, indent=2)

            results.append(analyze_result)

        return WatchDirProcessOutcome(
            task_id=multi_result.task_id,
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
