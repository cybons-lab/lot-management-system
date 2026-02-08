"""Execution Queue Service."""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any

from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from app.infrastructure.persistence.models.auth_models import User
from app.infrastructure.persistence.models.execution_queue_model import ExecutionQueue
from app.presentation.schemas.execution_queue_schema import (
    EnqueueResult,
    QueueEntryResponse,
    QueueStatusResponse,
)


class ExecutionQueueService:
    """実行キュー操作サービス."""

    def __init__(self, db: Session):
        self.db = db

    def enqueue(
        self,
        resource_type: str,
        resource_id: str,
        user_id: int,
        parameters: dict[str, Any],
        priority: int = 0,
        timeout_seconds: int = 300,
    ) -> EnqueueResult:
        """タスクをキューに追加."""
        # Check for running task
        running_task = self.db.execute(
            select(ExecutionQueue)
            .where(
                ExecutionQueue.resource_type == resource_type,
                ExecutionQueue.resource_id == resource_id,
                ExecutionQueue.status == "running",
            )
            .with_for_update()  # Lock to ensure consistency
        ).scalar_one_or_none()

        status = "pending"
        position = None
        running_by_user_name = None

        if running_task:
            # Already running, so queue it
            status = "pending"
            # Get max position
            max_pos = self.db.scalar(
                select(func.max(ExecutionQueue.position)).where(
                    ExecutionQueue.resource_type == resource_type,
                    ExecutionQueue.resource_id == resource_id,
                    ExecutionQueue.status == "pending",
                )
            )
            position = (max_pos or 0) + 1

            # Get running user name
            running_user = self.db.get(User, running_task.requested_by_user_id)
            if running_user:
                running_by_user_name = running_user.display_name
        else:
            # Not running, start immediately
            status = "running"
            position = 0  # 0 means running

        new_entry = ExecutionQueue(
            resource_type=resource_type,
            resource_id=resource_id,
            status=status,
            requested_by_user_id=user_id,
            parameters=parameters,
            priority=priority,
            position=position,
            started_at=datetime.now() if status == "running" else None,
            heartbeat_at=datetime.now() if status == "running" else None,
            timeout_seconds=timeout_seconds,
        )
        self.db.add(new_entry)
        self.db.commit()
        self.db.refresh(new_entry)

        return EnqueueResult(
            queue_entry=QueueEntryResponse.model_validate(new_entry),
            status=status,
            position=position,
            running_by_user_name=running_by_user_name,
        )

    def complete_task(
        self, queue_id: int, result_message: str | None = None
    ) -> ExecutionQueue | None:
        """タスクを完了し、次のタスクがあれば開始する."""
        task = self.db.get(ExecutionQueue, queue_id)
        if not task or task.status != "running":
            return None

        task.status = "completed"
        task.completed_at = datetime.now()
        task.result_message = result_message
        self.db.commit()

        # Process next
        return self.process_next(task.resource_type, task.resource_id)

    def fail_task(self, queue_id: int, error_message: str | None = None) -> ExecutionQueue | None:
        """タスクを失敗にし、次のタスクがあれば開始する."""
        task = self.db.get(ExecutionQueue, queue_id)
        if not task or task.status != "running":
            return None

        task.status = "failed"
        task.completed_at = datetime.now()
        task.error_message = error_message
        self.db.commit()

        # Process next
        return self.process_next(task.resource_type, task.resource_id)

    def process_next(self, resource_type: str, resource_id: str) -> ExecutionQueue | None:
        """次のpendingタスクを開始する."""
        # Find next pending task
        # Need to lock to ensure only one picks it up
        next_task = self.db.execute(
            select(ExecutionQueue)
            .where(
                ExecutionQueue.resource_type == resource_type,
                ExecutionQueue.resource_id == resource_id,
                ExecutionQueue.status == "pending",
            )
            .order_by(ExecutionQueue.priority.desc(), ExecutionQueue.created_at.asc())
            .limit(1)
            .with_for_update()
        ).scalar_one_or_none()

        if next_task:
            next_task.status = "running"
            next_task.started_at = datetime.now()
            next_task.heartbeat_at = datetime.now()
            next_task.position = 0

            self.db.commit()
            self.db.refresh(next_task)
            return next_task

        return None

    def get_status(
        self, resource_type: str, resource_id: str, user_id: int | None = None
    ) -> QueueStatusResponse:
        """キューの状態を取得."""
        running_task = self.db.execute(
            select(ExecutionQueue).where(
                ExecutionQueue.resource_type == resource_type,
                ExecutionQueue.resource_id == resource_id,
                ExecutionQueue.status == "running",
            )
        ).scalar_one_or_none()

        pending_count = (
            self.db.scalar(
                select(func.count(ExecutionQueue.id)).where(
                    ExecutionQueue.resource_type == resource_type,
                    ExecutionQueue.resource_id == resource_id,
                    ExecutionQueue.status == "pending",
                )
            )
            or 0
        )

        my_tasks = []
        my_position = None

        if user_id:
            my_tasks_models = self.db.scalars(
                select(ExecutionQueue)
                .where(
                    ExecutionQueue.resource_type == resource_type,
                    ExecutionQueue.resource_id == resource_id,
                    ExecutionQueue.requested_by_user_id == user_id,
                    ExecutionQueue.status.in_(["running", "pending"]),
                )
                .order_by(ExecutionQueue.created_at.asc())
            ).all()

            my_tasks = [QueueEntryResponse.model_validate(t) for t in my_tasks_models]

            # Calculate position of the first pending task
            first_pending = next((t for t in my_tasks_models if t.status == "pending"), None)
            if first_pending:
                # Count how many pending tasks are ahead of me
                ahead_count = (
                    self.db.scalar(
                        select(func.count(ExecutionQueue.id)).where(
                            ExecutionQueue.resource_type == resource_type,
                            ExecutionQueue.resource_id == resource_id,
                            ExecutionQueue.status == "pending",
                            ExecutionQueue.created_at < first_pending.created_at,
                        )
                    )
                    or 0
                )
                my_position = ahead_count + 1

        return QueueStatusResponse(
            resource_type=resource_type,
            resource_id=resource_id,
            current_running_task=QueueEntryResponse.model_validate(running_task)
            if running_task
            else None,
            queue_length=pending_count,
            my_position=my_position,
            my_tasks=my_tasks,
        )

    def cancel_pending(self, queue_id: int, user_id: int) -> bool:
        """タスクをキャンセル（pendingのみ）."""
        task = self.db.get(ExecutionQueue, queue_id)
        if not task or task.status != "pending":
            return False

        if task.requested_by_user_id != user_id:
            # Todo: Check if admin
            return False

        task.status = "cancelled"
        self.db.commit()
        return True

    def update_heartbeat(self, queue_id: int) -> None:
        """ハートビートを更新."""
        self.db.execute(
            update(ExecutionQueue)
            .where(ExecutionQueue.id == queue_id)
            .values(heartbeat_at=datetime.now())
        )
        self.db.commit()

    def detect_stale(self, stale_threshold_seconds: int = 600) -> list[ExecutionQueue]:
        """Staleタスクを検出して失敗にする."""
        threshold = datetime.now() - timedelta(seconds=stale_threshold_seconds)

        stale_tasks = self.db.scalars(
            select(ExecutionQueue).where(
                ExecutionQueue.status == "running", ExecutionQueue.heartbeat_at < threshold
            )
        ).all()

        processed = []
        for task in stale_tasks:
            task.status = "failed"
            task.completed_at = datetime.now()
            task.error_message = f"Stale task detected (no heartbeat since {task.heartbeat_at})"
            self.db.commit()

            # Try process next
            next_task = self.process_next(task.resource_type, task.resource_id)
            if next_task:
                processed.append(next_task)

        return processed
