"""Cloud Flow Service - ジョブキュー管理とフロー実行."""

from typing import Any

import httpx
from fastapi import BackgroundTasks, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.core.time_utils import utcnow
from app.infrastructure.persistence.models import (
    CloudFlowConfig,
    CloudFlowJob,
    CloudFlowJobStatus,
    User,
)


class CloudFlowService:
    """Cloud Flow実行サービス.

    ジョブキュー形式でクラウドフロー呼び出しを管理。
    同時実行を防止し、待ち順番を表示。
    """

    def __init__(self, db: Session, background_tasks: BackgroundTasks | None = None):
        """Initialize with database session."""
        self.db = db
        self.background_tasks = background_tasks

    def create_job(
        self,
        job_type: str,
        start_date: str,
        end_date: str,
        user: User,
    ) -> CloudFlowJob:
        """ジョブをキューに追加.

        Args:
            job_type: ジョブ種別 (例: 'progress_download')
            start_date: 開始日
            end_date: 終了日
            user: 実行ユーザー

        Returns:
            作成されたジョブ

        Raises:
            HTTPException: ゲストユーザーの場合
        """
        # ゲストユーザーは実行不可
        if getattr(user, "is_guest", False):
            raise HTTPException(status_code=403, detail="ゲストユーザーは実行できません")

        # 実行中のジョブがあるかチェック
        running_job = self.get_running_job(job_type)

        # ジョブを作成
        job = CloudFlowJob(
            job_type=job_type,
            status=CloudFlowJobStatus.PENDING if running_job else CloudFlowJobStatus.RUNNING,
            start_date=start_date,
            end_date=end_date,
            requested_by_user_id=user.id,
            requested_at=utcnow(),
            started_at=None if running_job else utcnow(),
        )
        self.db.add(job)
        self.db.commit()
        self.db.refresh(job)

        # 即実行の場合はフローを呼び出す（バックグラウンドタスクで実行すべきだが、簡易実装）
        if not running_job:
            self._execute_flow_async(job)

        return job

    def get_running_job(self, job_type: str) -> CloudFlowJob | None:
        """実行中のジョブを取得."""
        stmt = select(CloudFlowJob).where(
            CloudFlowJob.job_type == job_type,
            CloudFlowJob.status == CloudFlowJobStatus.RUNNING,
        )
        return self.db.execute(stmt).scalar_one_or_none()

    def get_pending_jobs(self, job_type: str) -> list[CloudFlowJob]:
        """待機中のジョブ一覧を取得."""
        stmt = (
            select(CloudFlowJob)
            .where(
                CloudFlowJob.job_type == job_type,
                CloudFlowJob.status == CloudFlowJobStatus.PENDING,
            )
            .order_by(CloudFlowJob.requested_at)
        )
        return list(self.db.execute(stmt).scalars().all())

    def get_queue_status(self, job_type: str, user_id: int | None = None) -> dict:
        """キュー状態を取得.

        Returns:
            {
                "current_job": 実行中ジョブ or None,
                "pending_jobs": 待機中ジョブリスト,
                "your_position": 自分の待ち順番 (None = 待ちなし)
            }
        """
        current_job = self.get_running_job(job_type)
        pending_jobs = self.get_pending_jobs(job_type)

        # 自分の待ち順番を計算
        your_position = None
        if user_id:
            for i, job in enumerate(pending_jobs):
                if job.requested_by_user_id == user_id:
                    your_position = i + 1  # 1-indexed
                    break

        return {
            "current_job": current_job,
            "pending_jobs": pending_jobs,
            "your_position": your_position,
        }

    def get_job_history(
        self,
        job_type: str,
        limit: int = 20,
        offset: int = 0,
    ) -> list[CloudFlowJob]:
        """ジョブ履歴を取得."""
        stmt = (
            select(CloudFlowJob)
            .where(CloudFlowJob.job_type == job_type)
            .order_by(CloudFlowJob.requested_at.desc())
            .limit(limit)
            .offset(offset)
        )
        return list(self.db.execute(stmt).scalars().all())

    def get_config(self, config_key: str) -> CloudFlowConfig | None:
        """設定を取得."""
        stmt = select(CloudFlowConfig).where(CloudFlowConfig.config_key == config_key)
        return self.db.execute(stmt).scalar_one_or_none()

    def set_config(
        self, config_key: str, config_value: str, description: str | None = None
    ) -> CloudFlowConfig:
        """設定を登録/更新."""
        config = self.get_config(config_key)
        if config:
            config.config_value = config_value
            if description:
                config.description = description
            config.updated_at = utcnow()
        else:
            config = CloudFlowConfig(
                config_key=config_key,
                config_value=config_value,
                description=description,
            )
            self.db.add(config)

        self.db.commit()
        self.db.refresh(config)
        return config

    def complete_job(
        self,
        job_id: int,
        success: bool,
        message: str | None = None,
    ) -> CloudFlowJob | None:
        """ジョブを完了状態に更新."""
        job = self.db.get(CloudFlowJob, job_id)
        if not job:
            return None

        job.status = CloudFlowJobStatus.COMPLETED if success else CloudFlowJobStatus.FAILED
        job.completed_at = utcnow()
        if success:
            job.result_message = message
        else:
            job.error_message = message

        self.db.commit()
        self.db.refresh(job)

        # 次の待機ジョブを開始
        self._start_next_pending_job(job.job_type)

        return job

    def _start_next_pending_job(self, job_type: str) -> None:
        """次の待機ジョブを開始.

        Note: このメソッドはジョブのステータスを RUNNING に更新するのみ。
        実際のフロー実行は _run_flow_job 内のループで行う。
        これにより再帰呼び出しを防ぎ、DBコネクション枯渇を回避する。
        """
        pending_jobs = self.get_pending_jobs(job_type)
        if pending_jobs:
            next_job = pending_jobs[0]
            next_job.status = CloudFlowJobStatus.RUNNING
            next_job.started_at = utcnow()
            self.db.commit()

    def _execute_flow_async(self, job: CloudFlowJob) -> None:
        """フローを非同期実行.

        BackgroundTasks でジョブ実行をバックグラウンドに回す。
        """
        if self.background_tasks:
            self.background_tasks.add_task(self._run_flow_job, job.id)
            return

        self._run_flow_job(job.id)

    @staticmethod
    def _run_flow_job(job_id: int) -> None:
        """バックグラウンドでフロー実行を行う.

        このメソッドでは単一DBセッションを使い、キュー内のジョブを
        ループで順次処理する。再帰呼び出しを避けることで、
        コネクション枯渇やスタックオーバーフローを防止する。
        """
        db = SessionLocal()
        try:
            service = CloudFlowService(db)
            job = db.get(CloudFlowJob, job_id)
            if not job:
                return

            # ジョブを実行し、完了後に次の待機ジョブを同じセッション内で処理
            while job:
                service.execute_flow(job)
                # 次の待機ジョブを取得（ループ内で再帰を回避）
                pending_jobs = service.get_pending_jobs(job.job_type)
                if not pending_jobs:
                    break
                next_job = pending_jobs[0]
                next_job.status = CloudFlowJobStatus.RUNNING
                next_job.started_at = utcnow()
                db.commit()
                job = next_job
        finally:
            db.close()

    def execute_flow(self, job: CloudFlowJob) -> dict[str, Any]:
        """フローを同期実行.

        4回同じURLを呼び出す（JSONが少し異なる）。
        設定からURLを取得して実行。
        """
        config = self.get_config(f"{job.job_type}_url")
        if not config:
            self.complete_job(job.id, success=False, message="Flow URLが設定されていません")
            return {"success": False, "error": "Flow URLが設定されていません"}

        flow_url = config.config_value
        results = []

        try:
            # 4回呼び出し（パターンが異なる）
            for i in range(4):
                payload = self._build_payload(job, i)
                with httpx.Client(timeout=120.0) as client:
                    response = client.post(flow_url, json=payload)
                    response.raise_for_status()
                    results.append({"step": i + 1, "status": "success"})

            self.complete_job(job.id, success=True, message="4回の呼び出しが成功しました")
            return {"success": True, "results": results}

        except httpx.HTTPError as e:
            error_msg = f"HTTP呼び出しエラー: {e!s}"
            self.complete_job(job.id, success=False, message=error_msg)
            return {"success": False, "error": error_msg}
        except Exception as e:
            error_msg = f"予期しないエラー: {e!s}"
            self.complete_job(job.id, success=False, message=error_msg)
            return {"success": False, "error": error_msg}

    def _build_payload(self, job: CloudFlowJob, step: int) -> dict:
        """各ステップ用のペイロードを構築."""
        return {
            "job_id": job.id,
            "job_type": job.job_type,
            "step": step + 1,
            "start_date": str(job.start_date),
            "end_date": str(job.end_date),
            "requested_by_user_id": job.requested_by_user_id,
            "requested_by": job.requested_by_user.display_name if job.requested_by_user else None,
            "requested_at": job.requested_at.isoformat() if job.requested_at else None,
            "triggered_at": utcnow().isoformat(),
        }
