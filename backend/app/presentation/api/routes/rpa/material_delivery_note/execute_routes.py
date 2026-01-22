"""Material Delivery Note execution endpoints."""

import json
import logging

from fastapi import Depends, HTTPException, status

from app.application.services.rpa import call_power_automate_flow, get_lock_manager
from app.infrastructure.persistence.models.auth_models import User
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
    current_user: User | None = Depends(get_current_user_optional),
):
    """Power Automate Cloud Flowを呼び出して素材納品書発行を実行.

    既存の「素材納品書発行」ボタンの機能を拡張し、
    URL/JSONを指定してFlowをトリガーする。
    """
    lock_manager = get_lock_manager()
    user_name = current_user.username if current_user else "system"

    # ロック取得を試行
    if not lock_manager.acquire_lock(user=user_name, duration_seconds=60):
        remaining = lock_manager.get_remaining_seconds()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"他のユーザーが実行中です。時間をおいて実施してください（残り{remaining}秒）",
        )

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

        # Call Power Automate Flow
        try:
            flow_response = await call_power_automate_flow(
                flow_url=request.flow_url,
                json_payload=json_payload,
            )
            return MaterialDeliveryNoteExecuteResponse(
                status="success",
                message="Power Automate Flowの呼び出しが完了しました",
                flow_response=flow_response,
            )
        except Exception as e:
            logger.exception("Power Automate Flow呼び出しエラー")
            return MaterialDeliveryNoteExecuteResponse(
                status="error",
                message=f"Flow呼び出しに失敗しました: {e!s}",
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
