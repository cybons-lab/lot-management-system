"""OCR取込 APIルーター."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.application.services.ocr.ocr_import_service import OcrImportService
from app.core.database import get_db
from app.presentation.schemas.ocr_import_schema import (
    OcrImportRequest,
    OcrImportResponse,
)


router = APIRouter(prefix="/ocr", tags=["OCR"])


@router.post(
    "/import",
    response_model=OcrImportResponse,
    summary="OCRデータ取込",
    description="PADから送信されたOCRデータを受け取り、受注として登録。マスタから不足情報を補完。",
)
def import_ocr_data(
    request: OcrImportRequest,
    db: Session = Depends(get_db),
) -> OcrImportResponse:
    """OCRデータを取り込み、受注を作成.

    - 完全一致/前方一致の2段階検索で製品IDを解決
    - 未解決の場合もproduct_group_id=NULLで登録（後から手動補完可能）
    """
    try:
        service = OcrImportService(db)
        return service.import_ocr_data(request)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Import failed: {str(e)}")
