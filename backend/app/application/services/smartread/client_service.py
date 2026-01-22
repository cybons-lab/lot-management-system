"""SmartRead client sync service."""

from __future__ import annotations

import logging
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
        timeout_sec: float = 300.0,
        force: bool = False,
    ) -> dict[str, Any] | None:
        """タスクの結果をAPIから同期してDBに保存.

        Args:
            config_id: 設定ID
            task_id: タスクID
            export_type: エクスポート形式
            timeout_sec: タイムアウト秒数
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

        client, _ = self._get_client(config_id)
        if not client:
            logger.error(f"[SmartRead] Could not initialize client for config {config_id}")
            return None

        # 1. タスク内requestの完了確認（追加）
        logger.info(f"[SmartRead] Checking request status for task {task_id}...")
        try:
            requests = await client.get_task_requests(task_id)

            # request状態を集計
            total = len(requests)
            completed = sum(
                1
                for r in requests
                if r.get("status") in ["succeeded", "completed", "SUCCEEDED", "COMPLETED"]
            )
            failed = sum(1 for r in requests if r.get("status") in ["failed", "FAILED"])
            running = total - completed - failed

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

            # 進行中requestがある場合は準備中を返す
            if running > 0:
                logger.info(
                    f"[SmartRead] Task {task_id} has {running} running requests. Returning PENDING state.",
                    extra={
                        "task_id": task_id,
                        "config_id": config_id,
                        "running_requests": running,
                    },
                )
                return {
                    "state": "PENDING",
                    "message": "OCR処理がまだ完了していません",
                    "requests_status": {
                        "total": total,
                        "completed": completed,
                        "running": running,
                        "failed": failed,
                    },
                    "wide_data": [],
                    "long_data": [],
                    "errors": [],
                    "filename": None,
                }

            # 全て失敗している場合
            if failed > 0 and completed == 0:
                logger.error(
                    f"[SmartRead] Task {task_id} has all requests failed.",
                    extra={
                        "task_id": task_id,
                        "config_id": config_id,
                        "failed_requests": failed,
                    },
                )
                return {
                    "state": "FAILED",
                    "message": "OCR処理が失敗しました",
                    "requests_status": {
                        "total": total,
                        "completed": completed,
                        "running": running,
                        "failed": failed,
                    },
                    "wide_data": [],
                    "long_data": [],
                    "errors": [],
                    "filename": None,
                }

        except Exception as e:
            logger.warning(
                f"[SmartRead] Could not check request status for task {task_id}: {e}. Proceeding with export...",
                extra={
                    "task_id": task_id,
                    "config_id": config_id,
                    "error": str(e),
                },
            )
            # request状態確認失敗時は従来通りexportを試みる（後方互換性）

        # 2. Exportを作成
        logger.info(f"[SmartRead] Creating export for task {task_id}...")
        export = await client.create_export(task_id, export_type)
        if not export:
            logger.error(f"[SmartRead] Failed to create export for task {task_id}")
            return None
        logger.info(f"[SmartRead] Export created: {export.export_id}")

        # 3. 完了まで待機
        logger.info(f"[SmartRead] Polling export {export.export_id} until ready...")
        export_ready = await client.poll_export_until_ready(task_id, export.export_id, timeout_sec)

        # APIによっては COMPLETED, SUCCEEDED のいずれかが返る
        if not export_ready or export_ready.state.upper() not in ["COMPLETED", "SUCCEEDED"]:
            logger.error(
                f"[SmartRead] Export did not complete for task {task_id}. State: {export_ready.state if export_ready else 'None'}"
            )
            return None
        logger.info(f"[SmartRead] Export is ready. State: {export_ready.state}")

        # 4. CSVデータを取得してDBに保存
        return await self.get_export_csv_data(
            config_id=config_id,
            task_id=task_id,
            export_id=export.export_id,
            save_to_db=True,
        )
