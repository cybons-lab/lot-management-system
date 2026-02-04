"""RPA router."""

import logging

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.application.services.rpa import RPAService, get_lock_manager
from app.core.database import get_db
from app.infrastructure.persistence.models.auth_models import User
from app.presentation.api.routes.auth.auth_router import get_current_user_optional
from app.presentation.schemas.rpa_schema import (
    MaterialDeliveryDocumentRequest,
    MaterialDeliveryDocumentResponse,
)


logger = logging.getLogger(__name__)
router = APIRouter(prefix="/rpa", tags=["rpa"])


@router.post(
    "/material-delivery-document",
    response_model=MaterialDeliveryDocumentResponse,
    status_code=status.HTTP_200_OK,
)
def execute_material_delivery_document(
    request: MaterialDeliveryDocumentRequest,
    current_user: User | None = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    """素材納品書発行を実行.

    Args:
        request: リクエスト（開始日・終了日）
        current_user: ログインユーザー（オプション）
        db: データベースセッション

    Returns:
        実行結果
    """
    user_name = current_user.username if current_user else "system"
    logger.info(
        "Material delivery document execution requested",
        extra={
            "start_date": str(request.start_date),
            "end_date": str(request.end_date),
            "user": user_name,
        },
    )

    lock_manager = get_lock_manager()
    service = RPAService(lock_manager, db)

    result = service.execute_material_delivery_document(
        start_date=str(request.start_date),
        end_date=str(request.end_date),
        user=user_name,
    )

    # ロック中の場合はステータスコード409を返す
    if result["status"] == "locked":
        from fastapi import HTTPException

        logger.warning("Material delivery document locked", extra={"user": user_name})
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=result["message"],
        )

    logger.info(
        "Material delivery document completed",
        extra={"status": result["status"], "user": user_name},
    )
    return MaterialDeliveryDocumentResponse(**result)
