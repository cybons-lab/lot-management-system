"""SmartRead watch dir auto sync runner."""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass
from datetime import date, datetime, time
from pathlib import Path

from app.application.services.smartread.smartread_service import SmartReadService
from app.core.config import settings
from app.core.database import SessionLocal


logger = logging.getLogger(__name__)


@dataclass
class PendingTask:
    """Pending SmartRead task tracked by the auto sync loop."""

    config_id: int
    task_date: date


class SmartReadAutoSyncRunner:
    """Auto sync SmartRead watch dir contents on a schedule."""

    def __init__(self) -> None:
        self._stop_event = asyncio.Event()
        self._task: asyncio.Task[None] | None = None
        self._pending_tasks: dict[str, PendingTask] = {}
        self._window_start = self._parse_time(settings.SMARTREAD_AUTO_SYNC_WINDOW_START)
        self._window_end = self._parse_time(settings.SMARTREAD_AUTO_SYNC_WINDOW_END)

    def start(self) -> None:
        """Start the background loop."""
        if self._task is None:
            self._task = asyncio.create_task(self._run_loop())
            logger.info("[SmartRead AutoSync] Background loop started")

    async def stop(self) -> None:
        """Stop the background loop."""
        if self._task is None:
            return
        self._stop_event.set()
        await self._task
        self._task = None
        logger.info("[SmartRead AutoSync] Background loop stopped")

    async def _run_loop(self) -> None:
        while not self._stop_event.is_set():
            try:
                await self.run_once()
            except Exception:
                logger.exception("[SmartRead AutoSync] Unexpected error in auto sync loop")

            try:
                await asyncio.wait_for(
                    self._stop_event.wait(),
                    timeout=settings.SMARTREAD_AUTO_SYNC_INTERVAL_SECONDS,
                )
            except TimeoutError:
                continue

    async def run_once(self) -> None:
        """Run a single auto sync pass."""
        if not self._is_within_window(datetime.now()):
            return

        with SessionLocal() as session:
            service = SmartReadService(session)
            configs = service.get_active_configs()

            for config in configs:
                files = service.list_files_in_watch_dir(config.id)
                if not files:
                    continue

                logger.info(
                    "[SmartRead AutoSync] Processing watch directory files",
                    extra={
                        "config_id": config.id,
                        "watch_dir": str(config.watch_dir) if config.watch_dir else None,
                        "file_count": len(files),
                        "files": [f[1] for f in files][:10],  # Log first 10 filenames
                    },
                )

                task_id, results, watch_dir = await service.process_watch_dir_files_with_task(
                    config.id, files
                )

                if task_id:
                    logger.info(
                        "[SmartRead AutoSync] Task created for watch directory",
                        extra={
                            "config_id": config.id,
                            "task_id": task_id,
                            "file_count": len(files),
                        },
                    )
                    self._pending_tasks[task_id] = PendingTask(
                        config_id=config.id,
                        task_date=date.today(),
                    )

                if settings.SMARTREAD_AUTO_SYNC_MOVE_PROCESSED and watch_dir and results:
                    logger.info(
                        "[SmartRead AutoSync] Moving processed files",
                        extra={
                            "config_id": config.id,
                            "task_id": task_id,
                            "file_count": len(files),
                        },
                    )
                    self._move_processed_files(watch_dir, results)

            await self._sync_pending_tasks(service, session)

    async def _sync_pending_tasks(self, service: SmartReadService, session) -> None:
        today = date.today()
        task_items = list(self._pending_tasks.items())
        for task_id, pending in task_items:
            if pending.task_date != today:
                self._pending_tasks.pop(task_id, None)
                continue

            try:
                result = await service.sync_task_results(
                    pending.config_id,
                    task_id,
                    force=True,
                )
            except Exception:
                logger.exception(
                    "[SmartRead AutoSync] Failed to sync task",
                    extra={"task_id": task_id, "config_id": pending.config_id},
                )
                session.rollback()
                continue

            if not result:
                logger.warning(
                    "[SmartRead AutoSync] Sync returned no result",
                    extra={"task_id": task_id, "config_id": pending.config_id},
                )
                session.rollback()
                continue

            state = result.get("state")
            if state in {"PENDING"}:
                logger.debug(
                    "[SmartRead AutoSync] Task still pending",
                    extra={"task_id": task_id, "config_id": pending.config_id, "state": state},
                )
                continue
            if state in {"FAILED", "EMPTY"}:
                logger.warning(
                    "[SmartRead AutoSync] Task failed or empty, removing from pending",
                    extra={
                        "task_id": task_id,
                        "config_id": pending.config_id,
                        "state": state,
                        "error_message": result.get("error_message"),
                    },
                )
                self._pending_tasks.pop(task_id, None)
                continue

            logger.info(
                "[SmartRead AutoSync] Task completed successfully",
                extra={
                    "task_id": task_id,
                    "config_id": pending.config_id,
                    "state": state,
                    "wide_row_count": len(result.get("wide_data", [])),
                    "long_row_count": len(result.get("long_data", [])),
                },
            )
            session.commit()
            self._pending_tasks.pop(task_id, None)

    def _move_processed_files(self, watch_dir: Path, results) -> None:
        processed_dir = watch_dir / "processed"
        processed_dir.mkdir(exist_ok=True)

        for result in results:
            if not result.success or not result.filename:
                continue
            source = watch_dir / result.filename
            if not source.exists():
                continue
            destination = processed_dir / result.filename
            try:
                source.replace(destination)
            except OSError as exc:
                logger.warning(
                    "[SmartRead AutoSync] Failed to move processed file",
                    extra={
                        "source": str(source),
                        "destination": str(destination),
                        "error": str(exc),
                    },
                )

    def _is_within_window(self, now: datetime) -> bool:
        start = self._window_start
        end = self._window_end
        current = now.time()

        if start <= end:
            return start <= current <= end
        return current >= start or current <= end

    @staticmethod
    def _parse_time(value: str) -> time:
        try:
            return datetime.strptime(value, "%H:%M").time()
        except ValueError as exc:
            raise ValueError(
                f"Invalid time format for SmartRead auto sync window: {value}"
            ) from exc
