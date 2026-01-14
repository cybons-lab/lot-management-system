"""SmartRead OCR router - PDFインポートAPI."""

from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.application.services.common.uow_service import UnitOfWork
from app.application.services.smartread import SmartReadService
from app.infrastructure.persistence.models import User
from app.presentation.api.deps import get_db, get_uow
from app.presentation.api.routes.auth.auth_router import get_current_user
from app.presentation.schemas.smartread_schema import (
    SmartReadAnalyzeResponse,
    SmartReadConfigCreate,
    SmartReadConfigResponse,
    SmartReadConfigUpdate,
)


router = APIRouter(prefix="/rpa/smartread", tags=["smartread"])


# --- 設定CRUD ---


@router.get("/configs", response_model=list[SmartReadConfigResponse])
def get_configs(
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
) -> list[SmartReadConfigResponse]:
    """全設定一覧を取得."""
    service = SmartReadService(db)
    configs = service.get_all_configs()
    return [SmartReadConfigResponse.model_validate(c) for c in configs]


@router.get("/configs/{config_id}", response_model=SmartReadConfigResponse)
def get_config(
    config_id: int,
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
) -> SmartReadConfigResponse:
    """設定を取得."""
    service = SmartReadService(db)
    config = service.get_config(config_id)
    if not config:
        raise HTTPException(status_code=404, detail="設定が見つかりません")
    return SmartReadConfigResponse.model_validate(config)


@router.post(
    "/configs", response_model=SmartReadConfigResponse, status_code=status.HTTP_201_CREATED
)
def create_config(
    request: SmartReadConfigCreate,
    uow: UnitOfWork = Depends(get_uow),
    _current_user: User = Depends(get_current_user),
) -> SmartReadConfigResponse:
    """設定を作成."""
    service = SmartReadService(uow.session)
    config = service.create_config(
        endpoint=request.endpoint,
        api_key=request.api_key,
        name=request.name,
        request_type=request.request_type,
        template_ids=request.template_ids,
        export_type=request.export_type,
        aggregation_type=request.aggregation_type,
        watch_dir=request.watch_dir,
        export_dir=request.export_dir,
        input_exts=request.input_exts,
        description=request.description,
        is_active=request.is_active,
    )
    uow.session.commit()
    return SmartReadConfigResponse.model_validate(config)


@router.put("/configs/{config_id}", response_model=SmartReadConfigResponse)
def update_config(
    config_id: int,
    request: SmartReadConfigUpdate,
    uow: UnitOfWork = Depends(get_uow),
    _current_user: User = Depends(get_current_user),
) -> SmartReadConfigResponse:
    """設定を更新."""
    service = SmartReadService(uow.session)
    update_data = request.model_dump(exclude_unset=True)
    config = service.update_config(config_id, **update_data)
    if not config:
        raise HTTPException(status_code=404, detail="設定が見つかりません")
    uow.commit()
    return SmartReadConfigResponse.model_validate(config)


@router.delete("/configs/{config_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_config(
    config_id: int,
    uow: UnitOfWork = Depends(get_uow),
    _current_user: User = Depends(get_current_user),
) -> None:
    """設定を削除."""
    service = SmartReadService(uow.session)
    if not service.delete_config(config_id):
        raise HTTPException(status_code=404, detail="設定が見つかりません")
    uow.commit()


# --- PDF解析 ---


@router.post("/analyze", response_model=SmartReadAnalyzeResponse)
async def analyze_file(
    file: Annotated[UploadFile, File(description="解析するファイル（PDF, PNG, JPG）")],
    config_id: int = Query(..., description="使用する設定のID"),
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
) -> SmartReadAnalyzeResponse:
    """ファイルをSmartRead APIで解析.

    アップロードされたファイルをSmartRead OCR APIに送信し、
    解析結果を返します。
    """
    # ファイル読み込み
    file_content = await file.read()
    filename = file.filename or "unknown"

    service = SmartReadService(db)
    result = await service.analyze_file(config_id, file_content, filename)

    return SmartReadAnalyzeResponse(
        success=result.success,
        filename=result.filename,
        data=result.data,
        error_message=result.error_message,
    )


# --- エクスポート ---


@router.post("/export/json")
def export_to_json(
    data: list[dict],
    filename: str = Query(default="export.json", description="出力ファイル名"),
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
) -> Response:
    """データをJSONでダウンロード."""
    service = SmartReadService(db)
    result = service.export_to_json(data, filename)

    return Response(
        content=result.content,
        media_type=result.content_type,
        headers={"Content-Disposition": f'attachment; filename="{result.filename}"'},
    )


@router.post("/export/csv")
def export_to_csv(
    data: list[dict],
    filename: str = Query(default="export.csv", description="出力ファイル名"),
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
) -> Response:
    """データをCSVでダウンロード."""
    service = SmartReadService(db)
    result = service.export_to_csv(data, filename)

    return Response(
        content=result.content,
        media_type=result.content_type,
        headers={"Content-Disposition": f'attachment; filename="{result.filename}"'},
    )
