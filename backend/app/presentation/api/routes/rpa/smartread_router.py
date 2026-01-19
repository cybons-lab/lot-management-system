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
    SmartReadCsvDataResponse,
    SmartReadExportRequest,
    SmartReadExportResponse,
    SmartReadProcessRequest,
    SmartReadTaskListResponse,
    SmartReadTaskResponse,
    SmartReadTransformRequest,
    SmartReadTransformResponse,
    SmartReadValidationError,
)


router = APIRouter(prefix="/rpa/smartread", tags=["smartread"])


# --- 設定CRUD ---


@router.get("/configs", response_model=list[SmartReadConfigResponse])
def get_configs(
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
) -> list[SmartReadConfigResponse]:
    """全設定一覧を取得."""
    assert db is not None
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
    assert db is not None
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
    assert uow.session is not None
    service = SmartReadService(uow.session)
    config = service.create_config(
        endpoint=request.endpoint,
        api_key=request.api_key,
        name=request.name,
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
    assert uow.session is not None
    service = SmartReadService(uow.session)
    update_data = request.model_dump(exclude_unset=True)
    config = service.update_config(config_id, **update_data)
    if not config:
        raise HTTPException(status_code=404, detail="設定が見つかりません")
    uow.session.commit()
    return SmartReadConfigResponse.model_validate(config)


@router.delete("/configs/{config_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_config(
    config_id: int,
    uow: UnitOfWork = Depends(get_uow),
    _current_user: User = Depends(get_current_user),
) -> None:
    """設定を削除."""
    assert uow.session is not None
    service = SmartReadService(uow.session)
    if not service.delete_config(config_id):
        raise HTTPException(status_code=404, detail="設定が見つかりません")
    uow.session.commit()


# --- ファイル監視・一括処理 ---


@router.get("/configs/{config_id}/files", response_model=list[str])
def list_watch_dir_files(
    config_id: int,
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
) -> list[str]:
    """監視フォルダ内のファイル一覧を取得."""
    assert db is not None
    service = SmartReadService(db)
    return service.list_files_in_watch_dir(config_id)


@router.post("/configs/{config_id}/process", response_model=list[SmartReadAnalyzeResponse])
async def process_files(
    config_id: int,
    request: SmartReadProcessRequest,
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
) -> list[SmartReadAnalyzeResponse]:
    """監視フォルダ内の指定ファイルを処理."""
    assert db is not None
    service = SmartReadService(db)
    results = await service.process_watch_dir_files(config_id, request.filenames)

    return [
        SmartReadAnalyzeResponse(
            success=r.success,
            filename=r.filename,
            data=r.data,
            error_message=r.error_message,
        )
        for r in results
    ]


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
    assert db is not None
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
    assert db is not None
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
    assert db is not None
    service = SmartReadService(db)
    result = service.export_to_csv(data, filename)

    return Response(
        content=result.content,
        media_type=result.content_type,
        headers={"Content-Disposition": f'attachment; filename="{result.filename}"'},
    )


# --- タスク・Export API ---


@router.get("/tasks", response_model=SmartReadTaskListResponse)
async def get_tasks(
    config_id: int = Query(..., description="設定ID"),
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
) -> SmartReadTaskListResponse:
    """タスク一覧を取得."""
    assert db is not None
    service = SmartReadService(db)
    tasks = await service.get_tasks(config_id)
    return SmartReadTaskListResponse(
        tasks=[
            SmartReadTaskResponse(
                task_id=t.task_id,
                name=t.name,
                status=t.status,
                created_at=t.created_at,
                request_count=t.request_count,
            )
            for t in tasks
        ]
    )


@router.post("/tasks/{task_id}/export", response_model=SmartReadExportResponse)
async def create_task_export(
    task_id: str,
    config_id: int = Query(..., description="設定ID"),
    request: SmartReadExportRequest | None = None,
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
) -> SmartReadExportResponse:
    """タスクのエクスポートを作成."""
    assert db is not None
    service = SmartReadService(db)
    export_type = request.export_type if request else "csv"
    export = await service.create_export(config_id, task_id, export_type)

    if not export:
        raise HTTPException(status_code=500, detail="エクスポートの作成に失敗しました")

    return SmartReadExportResponse(
        export_id=export.export_id,
        state=export.state,
        task_id=export.task_id,
        error_message=export.error_message,
    )


@router.get("/tasks/{task_id}/export/{export_id}", response_model=SmartReadExportResponse)
async def get_export_status(
    task_id: str,
    export_id: str,
    config_id: int = Query(..., description="設定ID"),
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
) -> SmartReadExportResponse:
    """エクスポート状態を取得."""
    assert db is not None
    service = SmartReadService(db)
    export = await service.get_export_status(config_id, task_id, export_id)

    if not export:
        raise HTTPException(status_code=404, detail="エクスポートが見つかりません")

    return SmartReadExportResponse(
        export_id=export.export_id,
        state=export.state,
        task_id=export.task_id,
        error_message=export.error_message,
    )


@router.get("/tasks/{task_id}/export/{export_id}/csv", response_model=SmartReadCsvDataResponse)
async def get_export_csv(
    task_id: str,
    export_id: str,
    config_id: int = Query(..., description="設定ID"),
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
) -> SmartReadCsvDataResponse:
    """エクスポートからCSVデータを取得し、横持ち・縦持ち両方を返す."""
    assert db is not None
    service = SmartReadService(db)
    result = await service.get_export_csv_data(config_id, task_id, export_id)

    if not result:
        raise HTTPException(status_code=404, detail="CSVデータの取得に失敗しました")

    return SmartReadCsvDataResponse(
        wide_data=result["wide_data"],
        long_data=result["long_data"],
        errors=[
            SmartReadValidationError(
                row=e.row,
                field=e.field,
                message=e.message,
                value=e.value,
            )
            for e in result["errors"]
        ],
        filename=result.get("filename"),
    )


# --- CSV変換 API ---


@router.post("/transform", response_model=SmartReadTransformResponse)
def transform_csv(
    request: SmartReadTransformRequest,
    _current_user: User = Depends(get_current_user),
) -> SmartReadTransformResponse:
    """横持ちCSVを縦持ちに変換."""
    from app.application.services.smartread.csv_transformer import SmartReadCsvTransformer

    transformer = SmartReadCsvTransformer()
    result = transformer.transform_to_long(request.wide_data, skip_empty=request.skip_empty)

    return SmartReadTransformResponse(
        long_data=result.long_data,
        errors=[
            SmartReadValidationError(
                row=e.row,
                field=e.field,
                message=e.message,
                value=e.value,
            )
            for e in result.errors
        ],
    )
