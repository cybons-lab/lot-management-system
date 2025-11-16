# backend/app/api/routes/admin_simulate_router.py
"""Admin simulation endpoints for test data generation with GUI."""

from __future__ import annotations

import logging

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Path
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.repositories.seed_snapshot_repo import SeedSnapshotRepository
from app.schemas.admin_simulate_schema import (
    SeedSnapshotCreateRequest,
    SeedSnapshotCreateResponse,
    SeedSnapshotListResponse,
    SeedSnapshotRestoreResponse,
    SimulateProgressResponse,
    SimulateResultResponse,
    SimulateSeedRequest,
    SimulateSeedResponse,
)
from app.services.job_tracker import get_job_tracker
from app.services.seed_simulate_service import run_seed_simulation


logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["admin"])


def _run_simulation_task(req: SimulateSeedRequest, task_id: str):
    """
    バックグラウンドでシミュレーションを実行.

    重要: バックグラウンドタスクでは新しいDBセッションを作成する必要があります。
    リクエストのセッションはレスポンス返却後にクローズされるため、
    既存セッションを使用するとcommitが正しく機能しません。
    """
    from app.core.database import SessionLocal

    db = SessionLocal()
    try:
        run_seed_simulation(db, req, task_id)
        db.commit()  # 最終コミット
    except Exception as e:
        logger.error(f"Simulation task failed: {e}")
        db.rollback()
        # エラーは service 内で tracker に記録済み
    finally:
        db.close()


@router.post("/simulate-seed-data", response_model=SimulateSeedResponse)
def simulate_seed_data(
    req: SimulateSeedRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
) -> SimulateSeedResponse:
    """
    テストデータシミュレーションを開始.

    - Reset → Insert を一括実行
    - バックグラウンドでジョブを起動
    - task_id を返す
    """
    tracker = get_job_tracker()

    # 最後のスナップショットを使用する場合
    if req.use_last_snapshot:
        snapshot_repo = SeedSnapshotRepository(db)
        last_snapshot = snapshot_repo.get_latest()
        if last_snapshot and last_snapshot.params_json:
            # スナップショットのパラメータで上書き
            req = SimulateSeedRequest.model_validate(last_snapshot.params_json)
            logger.info(f"Using last snapshot parameters: {last_snapshot.name}")

    # ジョブ作成
    task_id = tracker.create_job()
    tracker.add_log(task_id, f"Simulation started with profile: {req.profile}")
    tracker.add_log(
        task_id,
        f"Parameters: warehouses={req.warehouses}, lot_split_max={req.lot_split_max_per_line}",
    )

    # バックグラウンドタスクで実行（新しいセッションを作成）
    background_tasks.add_task(_run_simulation_task, req, task_id)

    return SimulateSeedResponse(
        task_id=task_id,
        message="Seed simulation started (reset → insert)",
    )


@router.get("/simulate-progress/{task_id}", response_model=SimulateProgressResponse)
def get_simulate_progress(
    task_id: str = Path(..., description="タスクID"),
) -> SimulateProgressResponse:
    """
    テストデータシミュレーションの進捗を取得.

    - ポーリングJSONで進捗を返す（3〜5秒間隔でクライアントが呼び出す想定）
    """
    tracker = get_job_tracker()
    job = tracker.get_job(task_id)

    if not job:
        raise HTTPException(status_code=404, detail="Task not found")

    return SimulateProgressResponse(
        task_id=job.task_id,
        status=job.status.value,
        phase=job.phase.value,
        progress_pct=job.progress_pct,
        logs=job.logs,
        error=job.error,
    )


@router.get("/simulate-result/{task_id}", response_model=SimulateResultResponse)
def get_simulate_result(
    task_id: str = Path(..., description="タスクID"),
) -> SimulateResultResponse:
    """
    テストデータシミュレーションの結果を取得.

    - 完了サマリを返す
    """
    tracker = get_job_tracker()
    job = tracker.get_job(task_id)

    if not job:
        raise HTTPException(status_code=404, detail="Task not found")

    if job.status.value == "failed":
        return SimulateResultResponse(
            success=False,
            error=job.error,
        )

    if job.status.value != "completed":
        raise HTTPException(status_code=400, detail="Task not completed yet")

    if not job.result:
        raise HTTPException(status_code=500, detail="Result not found")

    return SimulateResultResponse(**job.result)


@router.get("/seed-snapshots", response_model=SeedSnapshotListResponse)
def list_seed_snapshots(
    db: Session = Depends(get_db),
) -> SeedSnapshotListResponse:
    """スナップショット一覧を取得."""
    snapshot_repo = SeedSnapshotRepository(db)
    snapshots = snapshot_repo.get_all()

    return SeedSnapshotListResponse(
        snapshots=[
            {
                "id": s.id,
                "name": s.name,
                "created_at": s.created_at,
                "params_json": s.params_json or {},
                "summary_json": s.summary_json or {},
            }
            for s in snapshots
        ]
    )


@router.post("/seed-snapshots", response_model=SeedSnapshotCreateResponse)
def create_seed_snapshot(
    req: SeedSnapshotCreateRequest,
    db: Session = Depends(get_db),
) -> SeedSnapshotCreateResponse:
    """スナップショットを手動作成."""
    snapshot_repo = SeedSnapshotRepository(db)
    snapshot = snapshot_repo.create(
        name=req.name,
        params_json=req.params_json,
        profile_json=req.profile_json,
        summary_json=req.summary_json,
    )

    return SeedSnapshotCreateResponse(
        id=snapshot.id,
        name=snapshot.name,
        created_at=snapshot.created_at,
    )


@router.delete("/seed-snapshots/{snapshot_id}")
def delete_seed_snapshot(
    snapshot_id: int = Path(..., description="スナップショットID"),
    db: Session = Depends(get_db),
):
    """スナップショットを削除."""
    snapshot_repo = SeedSnapshotRepository(db)
    success = snapshot_repo.delete(snapshot_id)

    if not success:
        raise HTTPException(status_code=404, detail="Snapshot not found")

    return {"success": True, "message": "Snapshot deleted"}


@router.post("/seed-snapshots/{snapshot_id}/restore", response_model=SeedSnapshotRestoreResponse)
def restore_seed_snapshot(
    background_tasks: BackgroundTasks,
    snapshot_id: int = Path(..., description="スナップショットID"),
    db: Session = Depends(get_db),
) -> SeedSnapshotRestoreResponse:
    """
    スナップショットから復元.

    - 保存されたパラメータで Reset → Insert を実行
    - task_id を返す
    """
    snapshot_repo = SeedSnapshotRepository(db)
    snapshot = snapshot_repo.get_by_id(snapshot_id)

    if not snapshot:
        raise HTTPException(status_code=404, detail="Snapshot not found")

    # パラメータを復元
    req = SimulateSeedRequest.model_validate(snapshot.params_json)

    # ジョブ作成
    tracker = get_job_tracker()
    task_id = tracker.create_job()
    tracker.add_log(task_id, f"Restoring from snapshot: {snapshot.name}")

    # バックグラウンドタスクで実行（新しいセッションを作成）
    background_tasks.add_task(_run_simulation_task, req, task_id)

    return SeedSnapshotRestoreResponse(
        task_id=task_id,
        message=f"Restoring from snapshot: {snapshot.name}",
    )
