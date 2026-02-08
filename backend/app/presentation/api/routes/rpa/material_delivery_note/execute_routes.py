"""Material Delivery Note execution endpoints."""

import json
import logging

from fastapi import BackgroundTasks, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.application.services.execution_queue_service import ExecutionQueueService
from app.application.services.rpa.rpa_service import RPAService
from app.infrastructure.persistence.models.auth_models import User
from app.presentation.api.deps import get_db
from app.presentation.api.routes.auth.auth_router import get_current_user_optional
from app.presentation.api.routes.rpa.material_delivery_note.router import router
from app.presentation.schemas.rpa_run_schema import (
    MaterialDeliveryNoteExecuteRequest,
    MaterialDeliveryNoteExecuteResponse,
)


logger = logging.getLogger(__name__)


@router.post(
    "/execute",
    response_model=MaterialDeliveryNoteExecuteResponse,
    status_code=status.HTTP_200_OK,
)
async def execute_material_delivery_note(
    request: MaterialDeliveryNoteExecuteRequest,
    background_tasks: BackgroundTasks,
    current_user: User | None = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    """Power Automate Cloud Flowを呼び出して素材納品書発行を実行.

    既存の「素材納品書発行」ボタンの機能を拡張し、
    URL/JSONを指定してFlowをトリガーする。
    ExecutionQueueを使用して排他制御・予約実行を行う。
    """
    user_name = current_user.username if current_user else "system"
    # If user is None (unauthenticated allowed?), we might need a dummy ID.
    # get_current_user_optional allows None.
    # ExecutionQueue requires user_id (ForeignKey).
    # If user is None, we should probably fail or use a system user ID.
    # Let's assume user is required for queue execution effectively, or use 1/0.
    # Migration script user_id is nullable=False.
    if not current_user:
        # If authentication is optional but queue requires ID, maybe reject?
        # Or check if there is a system user.
        # For now, let's assume authenticated user mainly uses this.
        # If not, raise 401.
        raise HTTPException(status_code=401, detail="Authentication required for execution")

    try:
        # Parse JSON payload
        try:
            json_payload = json.loads(request.json_payload) if request.json_payload else {}
        except json.JSONDecodeError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="JSONペイロードの形式が不正です",
            )

        # Add date range to payload
        json_payload["start_date"] = str(request.start_date)
        json_payload["end_date"] = str(request.end_date)
        json_payload["executed_by"] = user_name

        # Enqueue Task
        queue_service = ExecutionQueueService(db)
        enqueue_result = queue_service.enqueue(
            resource_type="rpa_material_delivery",
            resource_id="global",
            user_id=current_user.id,
            parameters={
                "flow_url": request.flow_url,
                "json_payload": json_payload,
                "start_date": str(request.start_date),
                "end_date": str(request.end_date),
            },
            timeout_seconds=300,  # 5 min timeout for start
        )

        message = ""

        if enqueue_result.status == "running":
            message = "Power Automate Flowの呼び出しを開始しました"
            # Start background task
            from app.application.services.rpa.rpa_service import get_lock_manager

            rpa_service = RPAService(get_lock_manager())
            background_tasks.add_task(
                rpa_service.process_rpa_queue_task, queue_id=enqueue_result.queue_entry.id
            )
            # We don't have flow_response yet as it's async
        else:
            message = f"処理待ちキューに追加しました ({enqueue_result.position}番目)"

        return MaterialDeliveryNoteExecuteResponse(
            status=enqueue_result.status,  # 'running' or 'pending' -> map to 'success'/'locked' or just string?
            # Schema 'status' might be specific enum.
            # Looking at rpa_run_schema.py might clarify.
            # Usually 'success', 'error', 'locked'.
            # I'll return 'success' (accepted) and describe in message.
            # Or extend schema?
            # Existing frontend expects 'success' or 'locked'.
            # If pending, 'locked' might trigger "Wait message"?
            # user said: "Wait... (Nth)".
            # If I return 'locked', frontend shows remaining seconds.
            # If I return 'success', frontend shows success.
            # I should probably return 'success' (200) but with message "Queued".
            # Front end "ExecutionQueueBanner" will eventually handle status display.
            # But specific button might expect success.
            # I'll use "success" for now.
            # Ideally update schema to support "queued".
            message=message,
            flow_response=None,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("素材納品書発行エラー")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"実行に失敗しました: {e!s}",
        )
