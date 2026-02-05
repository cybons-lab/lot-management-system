"""SmartRead Task Service.

タスク管理関連の操作を提供する。
"""

from __future__ import annotations

import logging
from datetime import date, datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import select, update

from app.application.services.smartread.base import SmartReadBaseService
from app.infrastructure.persistence.models.smartread_models import (
    SmartReadRequest,
    SmartReadTask,
)


if TYPE_CHECKING:
    pass

logger = logging.getLogger(__name__)


class SmartReadTaskService(SmartReadBaseService):
    """SmartReadタスクサービス.

    タスクの作成・取得・更新を提供。
    """

    def get_or_create_task(
        self,
        config_id: int,
        task_id: str,
        task_date: date,
        name: str | None = None,
        state: str | None = None,
    ) -> SmartReadTask:
        """タスクを取得または作成.

        Args:
            config_id: 設定ID
            task_id: タスクID
            task_date: タスク日付
            name: タスク名
            state: タスク状態

        Returns:
            タスク
        """
        logger.debug(f"タスク取得/作成: task_id={task_id}, config_id={config_id}")
        stmt = select(SmartReadTask).where(SmartReadTask.task_id == task_id)
        result = self.session.execute(stmt)
        task = result.scalar_one_or_none()

        if task:
            # Update existing task
            if name and task.name != name:
                task.name = name
            if state and task.state != state:
                task.state = state
            logger.debug(f"既存タスク更新: task_id={task_id}")
            return task

        # Create new task
        task = SmartReadTask(
            config_id=config_id,
            task_id=task_id,
            task_date=task_date,
            name=name,
            state=state,
        )
        self.session.add(task)
        self.session.flush()
        logger.info(f"新規タスク作成: task_id={task_id}, config_id={config_id}")
        return task

    def update_task_synced_at(self, task_id: str) -> None:
        """タスクの同期日時を更新.

        Args:
            task_id: タスクID
        """
        logger.debug(f"タスク同期日時更新: task_id={task_id}")
        stmt = select(SmartReadTask).where(SmartReadTask.task_id == task_id)
        result = self.session.execute(stmt)
        task = result.scalar_one_or_none()
        if task:
            task.synced_at = datetime.now()
            self.session.flush()
            logger.debug(f"タスク同期日時更新完了: task_id={task_id}")

    def bump_data_version(self, task_id: str, expected_version: int | None = None) -> int | None:
        """タスクデータのバージョンを更新.

        Args:
            task_id: タスクID
            expected_version: 期待する現行バージョン（指定時は一致した場合のみ更新）

        Returns:
            更新後のバージョン。更新できなかった場合はNone。
        """
        stmt = update(SmartReadTask).where(SmartReadTask.task_id == task_id)
        if expected_version is not None:
            stmt = stmt.where(SmartReadTask.data_version == expected_version)

        stmt = stmt.values(data_version=SmartReadTask.data_version + 1).returning(
            SmartReadTask.data_version
        )
        result = self.session.execute(stmt)
        return result.scalar_one_or_none()

    def get_task_by_date(self, config_id: int, task_date: date) -> SmartReadTask | None:
        """日付でタスクを取得.

        Args:
            config_id: 設定ID
            task_date: タスク日付

        Returns:
            タスク、存在しない場合はNone
        """
        logger.debug(f"日付でタスク取得: config_id={config_id}, task_date={task_date}")
        stmt = select(SmartReadTask).where(
            SmartReadTask.config_id == config_id,
            SmartReadTask.task_date == task_date,
        )
        result = self.session.execute(stmt)
        return result.scalar_one_or_none()

    def should_skip_today(self, task_id: str) -> bool:
        """今日スキップすべきか確認.

        Args:
            task_id: タスクID

        Returns:
            スキップすべきならTrue
        """
        stmt = select(SmartReadTask).where(SmartReadTask.task_id == task_id)
        result = self.session.execute(stmt)
        task = result.scalar_one_or_none()
        return task.skip_today if task else False

    def set_skip_today(self, task_id: str, skip: bool) -> None:
        """skip_todayフラグを設定.

        Args:
            task_id: タスクID
            skip: スキップするかどうか
        """
        logger.info(f"skip_today設定: task_id={task_id}, skip={skip}")
        stmt = select(SmartReadTask).where(SmartReadTask.task_id == task_id)
        result = self.session.execute(stmt)
        task = result.scalar_one_or_none()
        if task:
            task.skip_today = skip
            self.session.flush()
            logger.info(f"skip_today設定完了: task_id={task_id}, skip={skip}")

    def update_skip_today(self, task_id: str, skip_today: bool) -> dict[str, Any]:
        """skip_todayを更新して結果を返す.

        Args:
            task_id: タスクID
            skip_today: スキップするかどうか

        Returns:
            更新後のタスク情報
        """
        logger.info(f"skip_today更新: task_id={task_id}, skip_today={skip_today}")
        stmt = select(SmartReadTask).where(SmartReadTask.task_id == task_id)
        result = self.session.execute(stmt)
        task = result.scalar_one_or_none()

        if not task:
            logger.warning(f"タスク未検出: task_id={task_id}")
            raise ValueError(f"Task not found: {task_id}")

        task.skip_today = skip_today
        self.session.flush()
        logger.info(f"skip_today更新完了: task_id={task_id}, skip_today={skip_today}")

        return {
            "id": task.id,
            "config_id": task.config_id,
            "task_id": task.task_id,
            "task_date": task.task_date.isoformat() if task.task_date else None,
            "name": task.name,
            "state": task.state,
            "synced_at": task.synced_at.isoformat() if task.synced_at else None,
            "skip_today": task.skip_today,
            "created_at": task.created_at.isoformat() if task.created_at else None,
        }

    def get_managed_tasks(self, config_id: int) -> list[dict[str, Any]]:
        """管理タスク一覧を取得.

        Args:
            config_id: 設定ID

        Returns:
            タスク情報のリスト
        """
        logger.debug(f"管理タスク一覧取得: config_id={config_id}")
        stmt = (
            select(SmartReadTask)
            .where(SmartReadTask.config_id == config_id)
            .order_by(SmartReadTask.task_date.desc())
        )
        result = self.session.execute(stmt)
        tasks = result.scalars().all()

        task_list = [
            {
                "id": task.id,
                "config_id": task.config_id,
                "task_id": task.task_id,
                "task_date": task.task_date.isoformat() if task.task_date else None,
                "name": task.name,
                "state": task.state,
                "synced_at": task.synced_at.isoformat() if task.synced_at else None,
                "skip_today": task.skip_today,
                "created_at": task.created_at.isoformat() if task.created_at else None,
            }
            for task in tasks
        ]
        logger.debug(f"管理タスク数: {len(task_list)}")
        return task_list

    def get_pending_requests(self, config_id: int) -> list[SmartReadRequest]:
        """処理待ちリクエストを取得.

        Args:
            config_id: 設定ID

        Returns:
            処理待ちリクエストのリスト
        """
        logger.debug(f"処理待ちリクエスト取得: config_id={config_id}")
        stmt = (
            select(SmartReadRequest)
            .where(
                SmartReadRequest.config_id == config_id,
                SmartReadRequest.state.in_(["PENDING", "OCR_RUNNING"]),
            )
            .order_by(SmartReadRequest.submitted_at)
        )
        result = self.session.execute(stmt)
        requests = list(result.scalars().all())
        logger.debug(f"処理待ちリクエスト数: {len(requests)}")
        return requests

    def get_request_by_id(self, request_id: str) -> SmartReadRequest | None:
        """リクエストIDでリクエストを取得.

        Args:
            request_id: リクエストID

        Returns:
            リクエスト、存在しない場合はNone
        """
        stmt = select(SmartReadRequest).where(SmartReadRequest.request_id == request_id)
        result = self.session.execute(stmt)
        return result.scalar_one_or_none()
