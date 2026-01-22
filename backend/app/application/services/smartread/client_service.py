"""SmartRead client sync service."""

from __future__ import annotations

import asyncio
import logging
import time
from datetime import date, datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import select

from app.application.services.smartread.base import SmartReadBaseService
from app.infrastructure.persistence.models import SmartReadConfig
from app.infrastructure.persistence.models.smartread_models import (
    SmartReadLongData,
    SmartReadWideData,
)
from app.infrastructure.smartread.client import SmartReadClient


if TYPE_CHECKING:
    from app.infrastructure.persistence.models.smartread_models import SmartReadTask


logger = logging.getLogger(__name__)


class SmartReadClientService(SmartReadBaseService):
    """SmartRead APIクライアント関連の処理."""

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

        async def get_export_csv_data(
            self,
            config_id: int,
            task_id: str,
            export_id: str,
            save_to_db: bool = True,
            task_date: date | None = None,
        ) -> dict[str, Any] | None: ...

    def _get_client(self, config_id: int) -> tuple[SmartReadClient | None, SmartReadConfig | None]:
        """設定からクライアントを取得."""
        config = self.get_config(config_id)
        if not config:
            return None, None

        template_ids = None
        if config.template_ids:
            template_ids = [t.strip() for t in config.template_ids.split(",") if t.strip()]

        client = SmartReadClient(
            endpoint=config.endpoint,
            api_key=config.api_key,
            template_ids=template_ids,
        )
        return client, config

    async def get_tasks(self, config_id: int) -> list:
        """タスク一覧を取得し、DBに同期.

        Args:
            config_id: 設定ID

        Returns:
            タスク一覧
        """
        client, _ = self._get_client(config_id)
        if not client:
            return []

        api_tasks = await client.get_tasks()

        # DBに同期
        for api_task in api_tasks:
            # 日付のパース
            task_date = date.today()
            if api_task.created_at:
                try:
                    # '2024-01-20T12:34:56.789Z'
                    dt = datetime.fromisoformat(api_task.created_at.replace("Z", "+00:00"))
                    task_date = dt.date()
                except (ValueError, TypeError):
                    pass

            self.get_or_create_task(
                config_id=config_id,
                task_id=api_task.task_id,
                task_date=task_date,
                name=api_task.name,
                state=api_task.status,
            )

        return api_tasks

    async def sync_task_results(
        self,
        config_id: int,
        task_id: str,
        export_type: str = "csv",
        timeout_sec: float = 240.0,
        force: bool = False,
    ) -> dict[str, Any] | None:
        """タスクの結果をAPIから同期してDBに保存.

        OCR処理には時間がかかるため、フロントエンドは5分のタイムアウトを設定。
        バックエンドは4分でリクエストポーリングをタイムアウトさせ、
        残り1分をエクスポート処理に充てる。

        Args:
            config_id: 設定ID
            task_id: タスクID
            export_type: エクスポート形式
            timeout_sec: リクエストポーリングタイムアウト秒数（デフォルト240秒）
            force: 強制的に再取得するか

        Returns:
            同期結果、またはNone
        """
        logger.info(f"[SmartRead] Starting sync for task {task_id} (config_id={config_id})")

        # 0. 既存データの確認 (force=Falseの場合)
        if not force:
            # WideDataがあるか確認
            stmt_wide = select(SmartReadWideData).where(SmartReadWideData.task_id == task_id)
            existing_wide = self.session.execute(stmt_wide).scalars().all()

            if existing_wide:
                logger.info(
                    f"[SmartRead] Task {task_id} already has {len(existing_wide)} wide rows in DB. Fetching long data..."
                )
                stmt_long = select(SmartReadLongData).where(SmartReadLongData.task_id == task_id)
                existing_long = self.session.execute(stmt_long).scalars().all()

                return {
                    "wide_data": [w.content for w in existing_wide],
                    "long_data": [l.content for l in existing_long],
                    "errors": [],
                    "filename": existing_wide[0].filename if existing_wide else None,
                    "from_cache": True,
                }

        client, config = self._get_client(config_id)
        if not client or not config:
            logger.error(f"[SmartRead] Could not initialize client for config {config_id}")
            return None

        # 1. タスク内requestの完了確認（ポーリング）
        logger.info(f"[SmartRead] Checking request status for task {task_id}...")
        request_summary = await self._poll_task_requests_until_ready(
            client=client,
            task_id=task_id,
            config_id=config_id,
            timeout_sec=timeout_sec,
        )

        if request_summary.get("state") in {"PENDING", "FAILED"}:
            return {
                "state": request_summary["state"],
                "message": request_summary["message"],
                "requests_status": request_summary["requests_status"],
                "wide_data": [],
                "long_data": [],
                "errors": [],
                "filename": None,
            }

        # 2. Exportを作成
        logger.info(f"[SmartRead] Creating export for task {task_id}...")
        export = await client.create_export(
            task_id,
            export_type=export_type,
            aggregation=config.aggregation_type,
        )
        if not export:
            logger.error(f"[SmartRead] Failed to create export for task {task_id}")
            return {
                "state": "PENDING",
                "message": "エクスポートの作成に失敗しました。再試行してください。",
                "requests_status": request_summary.get("requests_status", {}),
                "wide_data": [],
                "long_data": [],
                "errors": [],
                "filename": None,
            }
        logger.info(f"[SmartRead] Export created: {export.export_id}")

        # 3. 完了まで待機（エクスポートは通常速いので60秒のタイムアウト）
        export_timeout = 60.0
        logger.info(f"[SmartRead] Polling export {export.export_id} until ready...")
        export_ready = await client.poll_export_until_ready(
            task_id, export.export_id, export_timeout
        )

        # APIによっては COMPLETED, SUCCEEDED のいずれかが返る
        if not export_ready:
            logger.warning(
                f"[SmartRead] Export polling timed out for task {task_id}, export {export.export_id}"
            )
            return {
                "state": "PENDING",
                "message": "エクスポート処理中です。しばらくお待ちください。",
                "requests_status": request_summary.get("requests_status", {}),
                "wide_data": [],
                "long_data": [],
                "errors": [],
                "filename": None,
            }

        if export_ready.state.upper() not in ["COMPLETED", "SUCCEEDED"]:
            logger.error(
                f"[SmartRead] Export failed for task {task_id}. State: {export_ready.state}"
            )
            return {
                "state": "FAILED",
                "message": f"エクスポートが失敗しました: {export_ready.error_message or export_ready.state}",
                "requests_status": request_summary.get("requests_status", {}),
                "wide_data": [],
                "long_data": [],
                "errors": [],
                "filename": None,
            }
        logger.info(f"[SmartRead] Export is ready. State: {export_ready.state}")

        # 4. CSVデータを取得してDBに保存
        return await self.get_export_csv_data(
            config_id=config_id,
            task_id=task_id,
            export_id=export.export_id,
            save_to_db=True,
        )

    async def _poll_task_requests_until_ready(
        self,
        client: SmartReadClient,
        task_id: str,
        config_id: int,
        timeout_sec: float,
        poll_interval: float = 2.0,
    ) -> dict[str, Any]:
        """タスク内requestの完了をポーリングして状態を返す."""
        start_time = time.time()

        while True:
            elapsed = time.time() - start_time
            if elapsed > timeout_sec:
                logger.info(
                    f"[SmartRead] Request polling timeout for task {task_id} after {elapsed:.1f}s",
                    extra={"task_id": task_id, "config_id": config_id},
                )
                return {
                    "state": "PENDING",
                    "message": "OCR処理がまだ完了していません",
                    "requests_status": {
                        "total": 0,
                        "completed": 0,
                        "running": 0,
                        "failed": 0,
                    },
                }

            try:
                requests = await client.get_task_requests(task_id)
            except Exception as e:
                logger.warning(
                    f"[SmartRead] Could not check request status for task {task_id}: {e}",
                    extra={
                        "task_id": task_id,
                        "config_id": config_id,
                        "error": str(e),
                    },
                )
                return {
                    "state": "PENDING",
                    "message": "OCR処理状況の取得に失敗しました",
                    "requests_status": {
                        "total": 0,
                        "completed": 0,
                        "running": 0,
                        "failed": 0,
                    },
                }

            summary = self._summarize_request_status(task_id, config_id, requests)

            if summary["total"] == 0 or summary["running"] > 0:
                await asyncio.sleep(poll_interval)
                continue

            if summary["failed"] > 0 and summary["completed"] == 0:
                return {
                    "state": "FAILED",
                    "message": "OCR処理が失敗しました",
                    "requests_status": summary,
                }

            return {
                "state": "READY",
                "message": "OCR処理が完了しました",
                "requests_status": summary,
            }

    def _summarize_request_status(
        self,
        task_id: str,
        config_id: int,
        requests: list[dict[str, Any]],
    ) -> dict[str, int]:
        """リクエスト状態を集計."""
        total = len(requests)
        completed = 0
        failed = 0
        running = 0

        completed_states = {
            "SUCCEEDED",
            "COMPLETED",
            "OCR_COMPLETED",
            "OCR_VERIFICATION_COMPLETED",
            "SORTING_COMPLETED",
        }
        failed_states = {"FAILED", "OCR_FAILED", "SORTING_FAILED", "SORTING_DROPPED"}
        running_states = {"RUNNING", "OCR_RUNNING", "SORTING_RUNNING", "PENDING"}

        for request in requests:
            state_raw = request.get("status") or request.get("state") or ""
            state = str(state_raw).upper()

            if state in completed_states:
                completed += 1
            elif state in failed_states:
                failed += 1
            elif state in running_states or not state:
                running += 1
            else:
                running += 1

        logger.info(
            f"[SmartRead] Task {task_id} requests status: total={total}, completed={completed}, running={running}, failed={failed}",
            extra={
                "task_id": task_id,
                "config_id": config_id,
                "requests_total": total,
                "requests_completed": completed,
                "requests_running": running,
                "requests_failed": failed,
            },
        )

        return {
            "total": total,
            "completed": completed,
            "running": running,
            "failed": failed,
        }
