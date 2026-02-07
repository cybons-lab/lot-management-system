# backend/app/services/job_tracker.py
"""In-memory job tracking for async seed data generation."""

from __future__ import annotations

import uuid
from enum import StrEnum
from threading import Lock
from typing import Any

from app.core.time_utils import utcnow


class JobStatus(StrEnum):
    """ジョブステータス."""

    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class JobPhase(StrEnum):
    """ジョブフェーズ（進捗段階）."""

    RESET = "reset"
    MASTERS = "masters"
    STOCK = "stock"
    ORDERS = "orders"
    ALLOCATIONS = "allocations"
    POSTCHECK = "postcheck"
    SNAPSHOT = "snapshot"
    DONE = "done"


class JobInfo:
    """ジョブ情報."""

    def __init__(self, task_id: str):
        self.task_id = task_id
        self.status = JobStatus.PENDING
        self.phase = JobPhase.RESET
        self.progress_pct = 0
        self.logs: list[str] = []
        self.result: dict[str, Any] | None = None
        self.error: str | None = None
        self.created_at = utcnow()
        self.updated_at = utcnow()

    def add_log(self, message: str):
        """ログを追加."""
        self.logs.append(f"[{utcnow().isoformat()}] {message}")
        self.updated_at = utcnow()

    def update_progress(self, phase: JobPhase, pct: int):
        """進捗を更新."""
        self.phase = phase
        self.progress_pct = pct
        self.updated_at = utcnow()

    def set_completed(self, result: dict[str, Any]):
        """完了を設定."""
        self.status = JobStatus.COMPLETED
        self.phase = JobPhase.DONE
        self.progress_pct = 100
        self.result = result
        self.updated_at = utcnow()

    def set_failed(self, error: str):
        """失敗を設定."""
        self.status = JobStatus.FAILED
        self.error = error
        self.updated_at = utcnow()

    def to_dict(self) -> dict[str, Any]:
        """辞書に変換."""
        return {
            "task_id": self.task_id,
            "status": self.status.value,
            "phase": self.phase.value,
            "progress_pct": self.progress_pct,
            "logs": self.logs,
            "result": self.result,
            "error": self.error,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }


class JobTracker:
    """シングルトンのジョブトラッカー（メモリベース）."""

    def __init__(self):
        self._jobs: dict[str, JobInfo] = {}
        self._lock = Lock()

    def create_job(self) -> str:
        """新しいジョブを作成し、task_idを返す."""
        task_id = str(uuid.uuid4())
        with self._lock:
            self._jobs[task_id] = JobInfo(task_id)
        return task_id

    def get_job(self, task_id: str) -> JobInfo | None:
        """ジョブ情報を取得."""
        with self._lock:
            return self._jobs.get(task_id)

    def update_job(self, task_id: str, **kwargs):
        """ジョブ情報を更新."""
        with self._lock:
            job = self._jobs.get(task_id)
            if not job:
                return
            for key, value in kwargs.items():
                if hasattr(job, key):
                    setattr(job, key, value)
            job.updated_at = utcnow()

    def add_log(self, task_id: str, message: str):
        """ログを追加."""
        with self._lock:
            job = self._jobs.get(task_id)
            if job:
                job.add_log(message)

    def update_progress(self, task_id: str, phase: JobPhase, pct: int):
        """進捗を更新."""
        with self._lock:
            job = self._jobs.get(task_id)
            if job:
                job.update_progress(phase, pct)

    def set_running(self, task_id: str):
        """ジョブを実行中にする."""
        with self._lock:
            job = self._jobs.get(task_id)
            if job:
                job.status = JobStatus.RUNNING
                job.updated_at = utcnow()

    def set_completed(self, task_id: str, result: dict[str, Any]):
        """ジョブを完了にする."""
        with self._lock:
            job = self._jobs.get(task_id)
            if job:
                job.set_completed(result)

    def set_failed(self, task_id: str, error: str):
        """ジョブを失敗にする."""
        with self._lock:
            job = self._jobs.get(task_id)
            if job:
                job.set_failed(error)


# グローバルシングルトン
_tracker = JobTracker()


def get_job_tracker() -> JobTracker:
    """ジョブトラッカーのシングルトンを取得."""
    return _tracker
