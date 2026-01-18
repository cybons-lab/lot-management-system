import threading
import uuid
from datetime import datetime
from typing import Any


class JobManager:
    """Simple in-memory job manager for background tasks."""

    _instance = None
    _jobs: dict[str, dict[str, Any]] = {}
    _lock = threading.Lock()

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def create_job(self) -> str:
        with self._lock:
            job_id = str(uuid.uuid4())
            self._jobs[job_id] = {
                "status": "pending",
                "progress": 0,
                "message": "Initializing...",
                "created_at": datetime.now(),
                "result": None,
                "error": None,
            }
            return job_id

    def update_job(self, job_id: str, **kwargs):
        with self._lock:
            if job_id in self._jobs:
                self._jobs[job_id].update(kwargs)

    def get_job(self, job_id: str) -> dict[str, Any] | None:
        with self._lock:
            return self._jobs.get(job_id)


job_manager = JobManager()
