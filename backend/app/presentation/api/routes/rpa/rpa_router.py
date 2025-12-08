"""RPA router."""

from fastapi import APIRouter, Depends, status

from app.application.services.rpa import RPAService, get_lock_manager
from app.infrastructure.persistence.models.auth_models import User
from app.presentation.api.routes.auth.auth_router import get_current_user_optional
from app.presentation.schemas.rpa_schema import (
    MaterialDeliveryDocumentRequest,
    MaterialDeliveryDocumentResponse,
)


router = APIRouter(prefix="/rpa", tags=["rpa"])


@router.post(
    "/material-delivery-document",
    response_model=MaterialDeliveryDocumentResponse,
    status_code=status.HTTP_200_OK,
)
def execute_material_delivery_document(
    request: MaterialDeliveryDocumentRequest,
    current_user: User | None = Depends(get_current_user_optional),
):
    """素材納品書発行を実行.

    Args:
        request: リクエスト（開始日・終了日）
        current_user: ログインユーザー（オプション）

    Returns:
        実行結果
    """
    lock_manager = get_lock_manager()
    service = RPAService(lock_manager)

    # ログインユーザーがいる場合はそのユーザー名を使用
    user_name = current_user.username if current_user else "system"

    result = service.execute_material_delivery_document(
        start_date=str(request.start_date),
        end_date=str(request.end_date),
        user=user_name,
    )

    # ロック中の場合はステータスコード409を返す
    if result["status"] == "locked":
        from fastapi import HTTPException

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=result["message"],
        )

    return MaterialDeliveryDocumentResponse(**result)
