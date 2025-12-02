"""RPA router."""

from fastapi import APIRouter, status

from app.schemas.rpa_schema import (
    MaterialDeliveryDocumentRequest,
    MaterialDeliveryDocumentResponse,
)
from app.services.rpa import RPAService, get_lock_manager

router = APIRouter(prefix="/rpa", tags=["rpa"])


@router.post(
    "/material-delivery-document",
    response_model=MaterialDeliveryDocumentResponse,
    status_code=status.HTTP_200_OK,
)
def execute_material_delivery_document(request: MaterialDeliveryDocumentRequest):
    """
    素材納品書発行を実行.

    Args:
        request: リクエスト（開始日・終了日）

    Returns:
        実行結果
    """
    lock_manager = get_lock_manager()
    service = RPAService(lock_manager)

    result = service.execute_material_delivery_document(
        start_date=str(request.start_date),
        end_date=str(request.end_date),
        user="system",  # TODO: 認証実装後にログインユーザーを使用
    )

    # ロック中の場合はステータスコード409を返す
    if result["status"] == "locked":
        from fastapi import HTTPException

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=result["message"],
        )

    return MaterialDeliveryDocumentResponse(**result)
