"""SmartRead OCR router - PDFインポートAPI."""

import logging
from datetime import date
from typing import Annotated

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    HTTPException,
    Query,
    UploadFile,
    status,
)
from fastapi.responses import JSONResponse, Response
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
    SmartReadDiagnoseRequest,
    SmartReadDiagnoseResponse,
    SmartReadExportRequest,
    SmartReadExportResponse,
    SmartReadLongDataListResponse,
    SmartReadLongDataResponse,
    SmartReadPadRunListItem,
    SmartReadPadRunListResponse,
    SmartReadPadRunRetryResponse,
    SmartReadPadRunStartRequest,
    SmartReadPadRunStartResponse,
    SmartReadPadRunStatusResponse,
    SmartReadProcessRequest,
    SmartReadRequestListResponse,
    SmartReadRequestResponse,
    SmartReadResetResponse,
    SmartReadSaveLongDataRequest,
    SmartReadSaveLongDataResponse,
    SmartReadSkipTodayRequest,
    SmartReadTaskDetailResponse,
    SmartReadTaskListResponse,
    SmartReadTaskResponse,
    SmartReadTransformRequest,
    SmartReadTransformResponse,
    SmartReadValidationError,
)


logger = logging.getLogger(__name__)

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
    logger.debug("SmartRead configs listed", extra={"count": len(configs)})
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
        logger.warning("SmartRead config not found", extra={"config_id": config_id})
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
    logger.info("Creating SmartRead config", extra={"config_name": request.name})
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
    logger.info(
        "SmartRead config created", extra={"config_id": config.id, "config_name": config.name}
    )
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
    logger.info(
        "Updating SmartRead config",
        extra={"config_id": config_id, "fields": list(update_data.keys())},
    )
    config = service.update_config(config_id, **update_data)
    if not config:
        logger.warning("SmartRead config not found for update", extra={"config_id": config_id})
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
    logger.info("Deleting SmartRead config", extra={"config_id": config_id})
    service = SmartReadService(uow.session)
    if not service.delete_config(config_id):
        logger.warning("SmartRead config not found for delete", extra={"config_id": config_id})
        raise HTTPException(status_code=404, detail="設定が見つかりません")
    uow.session.commit()
    logger.info("SmartRead config deleted", extra={"config_id": config_id})


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
    files = service.list_files_in_watch_dir(config_id)
    logger.debug(
        "Watch dir files listed",
        extra={"config_id": config_id, "file_count": len(files)},
    )
    return files


@router.post("/configs/{config_id}/process", response_model=list[SmartReadAnalyzeResponse])
async def process_files(
    config_id: int,
    request: SmartReadProcessRequest,
    background_tasks: BackgroundTasks,
    _current_user: User = Depends(get_current_user),
) -> list[SmartReadAnalyzeResponse]:
    """監視フォルダ内の指定ファイルを処理 (バックグラウンド処理)."""
    from app.application.services.smartread.request_service import process_files_background

    logger.info(
        "Processing files in background",
        extra={"config_id": config_id, "file_count": len(request.filenames)},
    )
    # ファイルを処理（バックグラウンドで処理）
    background_tasks.add_task(process_files_background, config_id, request.filenames)

    return [
        SmartReadAnalyzeResponse(
            success=True,
            filename=filename,
            data=None,
            error_message=None,
        )
        for filename in request.filenames
    ]


@router.post("/configs/{config_id}/diagnose", response_model=SmartReadDiagnoseResponse)
async def diagnose_watch_dir_file(
    config_id: int,
    request: SmartReadDiagnoseRequest,
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
) -> SmartReadDiagnoseResponse:
    """SmartRead API送信を診断."""
    assert db is not None
    logger.info(
        "Diagnosing watch dir file",
        extra={"config_id": config_id, "file_name": request.filename},
    )
    service = SmartReadService(db)
    result = await service.diagnose_watch_dir_file(config_id, request.filename)
    return SmartReadDiagnoseResponse(**result)


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
    logger.info(
        "Analyzing file via SmartRead API",
        extra={"config_id": config_id, "file_name": filename, "size_bytes": len(file_content)},
    )

    service = SmartReadService(db)
    assert db is not None
    result = await service.analyze_file(config_id, file_content, filename)

    return SmartReadAnalyzeResponse(
        success=result.success,
        filename=result.filename,
        data=result.data,
        error_message=result.error_message,
    )


@router.post("/analyze-simple")
async def analyze_file_simple(
    file: Annotated[UploadFile, File(description="解析するファイル（PDF, PNG, JPG）")],
    background_tasks: BackgroundTasks,
    config_id: int = Query(..., description="使用する設定のID"),
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
) -> JSONResponse:
    """ファイルをSmartRead APIで解析（バックグラウンド処理）.

    即座にレスポンスを返し、バックグラウンドで処理を実行。
    処理完了後、結果はDBに保存される。

    Returns:
        処理開始のレスポンス（task_idを含む）
    """
    file_content = await file.read()
    filename = file.filename or "unknown"
    logger.info(
        "Starting simple analyze in background",
        extra={"config_id": config_id, "file_name": filename, "size_bytes": len(file_content)},
    )

    # バックグラウンドで処理を開始
    background_tasks.add_task(
        _run_simple_sync_background,
        config_id=config_id,
        file_content=file_content,
        filename=filename,
        user_id=_current_user.id,
    )

    return JSONResponse(
        status_code=202,
        content={
            "message": f"処理を開始しました: {filename}",
            "filename": filename,
            "status": "processing",
        },
    )


async def _run_simple_sync_background(
    config_id: int,
    file_content: bytes,
    filename: str,
    user_id: int,
) -> None:
    """バックグラウンドでシンプル同期フローを実行."""
    import logging

    from app.application.services.common.uow_service import UnitOfWork
    from app.application.services.notification_service import NotificationService
    from app.core.database import SessionLocal
    from app.presentation.schemas.notification_schema import NotificationCreate

    logger = logging.getLogger(__name__)
    logger.info(f"[SimpleSync Background] Starting processing: {filename}")

    try:
        with UnitOfWork(SessionLocal) as uow:
            assert uow.session is not None
            service = SmartReadService(uow.session)

            result = await service.sync_with_simple_flow(
                config_id=config_id,
                file_content=file_content,
                filename=filename,
                user_id=user_id,
            )

            logger.info(
                f"[SimpleSync Background] Completed: {filename}, "
                f"{len(result['wide_data'])} wide rows, "
                f"{len(result['long_data'])} long rows"
            )

    except Exception as e:
        logger.error(f"[SimpleSync Background] Failed: {filename}, error: {e}")

        # エラー通知を別トランザクションで作成
        try:
            with UnitOfWork(SessionLocal) as error_uow:
                assert error_uow.session is not None
                notif_service = NotificationService(error_uow.session)
                notif_service.create_notification(
                    NotificationCreate(
                        user_id=user_id,
                        title="SmartRead処理失敗",
                        message=f"ファイルの処理中にエラーが発生しました: {filename}\n{str(e)}",
                        type="error",
                        display_strategy="immediate",  # エラーは即座に確認が必要
                    )
                )
                error_uow.session.commit()
        except Exception as notify_error:
            logger.error(f"エラー通知の作成に失敗しました: {notify_error}")


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
    logger.info("Exporting data to JSON", extra={"file_name": filename, "row_count": len(data)})
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
    logger.info("Exporting data to CSV", extra={"file_name": filename, "row_count": len(data)})
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
    uow: UnitOfWork = Depends(get_uow),
    _current_user: User = Depends(get_current_user),
) -> SmartReadTaskListResponse:
    """タスク一覧を取得（自動的にDBと同期）."""
    assert uow.session is not None
    service = SmartReadService(uow.session)
    tasks = await service.get_tasks(config_id)
    uow.session.commit()
    logger.debug("Tasks listed", extra={"config_id": config_id, "count": len(tasks)})
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
    logger.info(
        "Creating task export",
        extra={"config_id": config_id, "task_id": task_id, "export_type": export_type},
    )
    export = await service.create_export(config_id, task_id, export_type)

    if not export:
        logger.error("Task export creation failed", extra={"task_id": task_id})
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
        logger.warning(
            "Export not found",
            extra={"task_id": task_id, "export_id": export_id},
        )
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
    save_to_db: bool = Query(default=True, description="DBに保存するか"),
    task_date: str | None = Query(default=None, description="タスク日付 (YYYY-MM-DD)"),
    uow: UnitOfWork = Depends(get_uow),
    _current_user: User = Depends(get_current_user),
) -> SmartReadCsvDataResponse:
    """エクスポートからCSVデータを取得し、横持ち・縦持ち両方を返す."""
    from datetime import date

    assert uow.session is not None
    service = SmartReadService(uow.session)

    # skip_todayチェック
    if service.should_skip_today(task_id):
        logger.warning("Task skipped today", extra={"task_id": task_id})
        raise HTTPException(
            status_code=403, detail="このタスクは今日スキップする設定になっています"
        )

    # task_dateをパース
    parsed_task_date = None
    if task_date:
        try:
            parsed_task_date = date.fromisoformat(task_date)
        except ValueError:
            raise HTTPException(status_code=400, detail="無効な日付形式です (YYYY-MM-DD)")

    logger.info(
        "Fetching export CSV data",
        extra={"config_id": config_id, "task_id": task_id, "export_id": export_id},
    )
    result = await service.get_export_csv_data(
        config_id, task_id, export_id, save_to_db=save_to_db, task_date=parsed_task_date
    )

    if not result:
        logger.warning("CSV data not found", extra={"task_id": task_id, "export_id": export_id})
        raise HTTPException(status_code=404, detail="CSVデータの取得に失敗しました")

    if save_to_db:
        uow.session.commit()

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

    logger.debug("Transforming CSV wide→long", extra={"row_count": len(request.wide_data)})
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


# --- タスク管理 API ---


@router.get("/managed-tasks", response_model=list[SmartReadTaskDetailResponse])
def get_managed_tasks(
    config_id: int = Query(..., description="設定ID"),
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
) -> list[SmartReadTaskDetailResponse]:
    """管理されているタスク一覧を取得."""
    from app.infrastructure.persistence.models.smartread_models import SmartReadTask

    assert db is not None
    logger.debug("Listing managed tasks", extra={"config_id": config_id})
    stmt = (
        SmartReadTask.__table__.select()
        .where(SmartReadTask.config_id == config_id)
        .order_by(SmartReadTask.created_at.desc())
    )
    tasks = db.execute(stmt).fetchall()

    return [
        SmartReadTaskDetailResponse(
            id=t.id,
            config_id=t.config_id,
            task_id=t.task_id,
            task_date=t.task_date.isoformat(),
            name=t.name,
            state=t.state,
            synced_at=t.synced_at.isoformat() if t.synced_at else None,
            skip_today=t.skip_today,
            created_at=t.created_at.isoformat(),
        )
        for t in tasks
    ]


@router.put("/tasks/{task_id}/skip-today", response_model=SmartReadTaskDetailResponse)
def update_skip_today(
    task_id: str,
    request: SmartReadSkipTodayRequest,
    uow: UnitOfWork = Depends(get_uow),
    _current_user: User = Depends(get_current_user),
) -> SmartReadTaskDetailResponse:
    """skip_todayフラグを更新."""
    assert uow.session is not None
    logger.info(
        "Updating skip_today flag",
        extra={"task_id": task_id, "skip_today": request.skip_today},
    )
    service = SmartReadService(uow.session)
    service.set_skip_today(task_id, request.skip_today)
    task = service.get_or_create_task(
        config_id=0, task_id=task_id, task_date=date.today()
    )  # 日付などは既存レコードから引き継がれる
    uow.session.commit()
    return SmartReadTaskDetailResponse(
        id=task.id,
        config_id=task.config_id,
        task_id=task.task_id,
        task_date=task.task_date.isoformat(),
        name=task.name,
        state=task.state,
        synced_at=task.synced_at.isoformat() if task.synced_at else None,
        skip_today=task.skip_today,
        created_at=task.created_at.isoformat(),
    )


@router.post("/tasks/{task_id}/sync", response_model=None)
async def sync_task_results(
    task_id: str,
    config_id: int = Query(..., description="設定ID"),
    force: bool = Query(False, description="強制的に再取得するか"),
    uow: UnitOfWork = Depends(get_uow),
    _current_user: User = Depends(get_current_user),
):
    """タスクの結果をAPIから同期（ダウンロード & DB保存）."""
    assert uow.session is not None
    logger.info(
        "Syncing task results",
        extra={"config_id": config_id, "task_id": task_id, "force": force},
    )
    service = SmartReadService(uow.session)

    result = await service.sync_task_results(config_id, task_id, force=force)
    if not result:
        logger.error("Task sync failed", extra={"task_id": task_id})
        raise HTTPException(status_code=500, detail="同期処理に失敗しました")

    # PENDING状態の場合は202を返す
    if result.get("state") == "PENDING":
        logger.info("Task sync: PENDING state", extra={"task_id": task_id})
        return JSONResponse(
            status_code=202,
            content={
                "state": "PENDING",
                "message": result.get("message", "OCR処理中"),
                "requests_status": result.get("requests_status"),
                "wide_data": [],
                "long_data": [],
                "errors": [],
                "filename": None,
            },
        )

    # FAILED状態の場合は422を返す
    if result.get("state") == "FAILED":
        logger.warning("Task sync: FAILED state", extra={"task_id": task_id})
        return JSONResponse(
            status_code=422,
            content={
                "state": "FAILED",
                "message": result.get("message", "OCR処理失敗"),
                "requests_status": result.get("requests_status"),
                "wide_data": [],
                "long_data": [],
                "errors": [],
                "filename": None,
            },
        )

    # EMPTY状態の場合は200で返す（データなし）
    if result.get("state") == "EMPTY":
        logger.info("Task sync: EMPTY state", extra={"task_id": task_id})
        return JSONResponse(
            status_code=200,
            content={
                "state": "EMPTY",
                "message": result.get("message", "データがありません"),
                "wide_data": [],
                "long_data": [],
                "errors": [],
                "filename": result.get("filename"),
            },
        )

    uow.session.commit()

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


@router.post("/tasks/{task_id}/save-long-data", response_model=SmartReadSaveLongDataResponse)
async def save_long_data(
    task_id: str,
    request: SmartReadSaveLongDataRequest,
    uow: UnitOfWork = Depends(get_uow),
    _current_user: User = Depends(get_current_user),
) -> SmartReadSaveLongDataResponse:
    """フロントエンドで変換した縦持ちデータをDBに保存."""
    from datetime import datetime

    assert uow.session is not None
    logger.info(
        "Saving long data from frontend",
        extra={
            "task_id": task_id,
            "config_id": request.config_id,
            "wide_count": len(request.wide_data),
            "long_count": len(request.long_data),
        },
    )
    service = SmartReadService(uow.session)

    # task_dateをdate型に変換
    try:
        task_date = datetime.strptime(request.task_date, "%Y-%m-%d").date()
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid task_date format: {e}")

    # 横持ち・縦持ちデータをDBに保存
    try:
        service._save_wide_and_long_data(
            config_id=request.config_id,
            task_id=task_id,
            export_id=f"frontend_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            task_date=task_date,
            wide_data=request.wide_data,
            long_data=request.long_data,
            filename=request.filename,
        )
        uow.session.commit()

        return SmartReadSaveLongDataResponse(
            success=True,
            saved_wide_count=len(request.wide_data),
            saved_long_count=len(request.long_data),
            message=f"{len(request.long_data)}件の縦持ちデータを保存しました",
        )
    except Exception as e:
        logger.error(
            "Failed to save long data",
            extra={"task_id": task_id, "error": str(e)[:500]},
            exc_info=True,
        )
        uow.session.rollback()
        raise HTTPException(status_code=500, detail=f"保存に失敗しました: {str(e)}")


@router.delete(
    "/configs/{config_id}/reset-data",
    response_model=SmartReadResetResponse,
)
def reset_smartread_data(
    config_id: int,
    uow: UnitOfWork = Depends(get_uow),
    _current_user: User = Depends(get_current_user),
) -> SmartReadResetResponse:
    """SmartReadデータを初期化（テスト用）."""
    from app.infrastructure.persistence.models.smartread_models import (
        SmartReadExportHistory,
        SmartReadLongData,
        SmartReadRequest,
        SmartReadTask,
        SmartReadWideData,
    )

    assert uow.session is not None
    logger.warning("Resetting SmartRead data", extra={"config_id": config_id})

    deleted_long = (
        uow.session.query(SmartReadLongData)
        .filter(SmartReadLongData.config_id == config_id)
        .delete(synchronize_session=False)
    )
    deleted_wide = (
        uow.session.query(SmartReadWideData)
        .filter(SmartReadWideData.config_id == config_id)
        .delete(synchronize_session=False)
    )
    deleted_requests = (
        uow.session.query(SmartReadRequest)
        .filter(SmartReadRequest.config_id == config_id)
        .delete(synchronize_session=False)
    )
    deleted_tasks = (
        uow.session.query(SmartReadTask)
        .filter(SmartReadTask.config_id == config_id)
        .delete(synchronize_session=False)
    )
    deleted_exports = (
        uow.session.query(SmartReadExportHistory)
        .filter(SmartReadExportHistory.config_id == config_id)
        .delete(synchronize_session=False)
    )

    uow.session.commit()
    logger.warning(
        "SmartRead data reset completed",
        extra={
            "config_id": config_id,
            "deleted_long": deleted_long,
            "deleted_wide": deleted_wide,
            "deleted_requests": deleted_requests,
            "deleted_tasks": deleted_tasks,
            "deleted_exports": deleted_exports,
        },
    )

    return SmartReadResetResponse(
        success=True,
        deleted_long_count=deleted_long,
        deleted_wide_count=deleted_wide,
        deleted_request_count=deleted_requests,
        deleted_task_count=deleted_tasks,
        deleted_export_history_count=deleted_exports,
        message="SmartReadデータをリセットしました",
    )


# ==================== requestId/results ルート API ====================


@router.get(
    "/configs/{config_id}/requests",
    response_model=SmartReadRequestListResponse,
    summary="リクエスト一覧を取得",
)
def get_requests(
    config_id: int,
    state: str | None = Query(default=None, description="状態でフィルタ"),
    limit: int = Query(default=100, le=1000, description="取得件数"),
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
) -> SmartReadRequestListResponse:
    """リクエスト一覧を取得."""
    from sqlalchemy import select

    from app.infrastructure.persistence.models.smartread_models import SmartReadRequest

    assert db is not None
    logger.debug(
        "Listing SmartRead requests",
        extra={"config_id": config_id, "state_filter": state, "limit": limit},
    )

    stmt = (
        select(SmartReadRequest)
        .where(SmartReadRequest.config_id == config_id)
        .order_by(SmartReadRequest.created_at.desc())
        .limit(limit)
    )

    if state:
        stmt = stmt.where(SmartReadRequest.state == state)

    requests = db.execute(stmt).scalars().all()

    return SmartReadRequestListResponse(
        requests=[
            SmartReadRequestResponse(
                id=r.id,
                request_id=r.request_id,
                task_id=r.task_id,
                task_date=r.task_date.isoformat(),
                config_id=r.config_id,
                filename=r.filename,
                num_of_pages=r.num_of_pages,
                submitted_at=r.submitted_at.isoformat(),
                state=r.state,
                error_message=r.error_message,
                completed_at=r.completed_at.isoformat() if r.completed_at else None,
                created_at=r.created_at.isoformat(),
            )
            for r in requests
        ]
    )


@router.get(
    "/configs/{config_id}/long-data",
    response_model=SmartReadLongDataListResponse,
    summary="縦持ちデータ一覧を取得",
)
def get_long_data(
    config_id: int,
    task_id: str | None = Query(default=None, description="タスクIDでフィルタ"),
    limit: int = Query(default=100, le=1000, description="取得件数"),
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
) -> SmartReadLongDataListResponse:
    """縦持ちデータ一覧を取得."""
    assert db is not None
    logger.debug(
        "Listing long data",
        extra={"config_id": config_id, "task_id": task_id, "limit": limit},
    )
    service = SmartReadService(db)
    long_data = service.get_long_data_list(config_id, task_id=task_id, limit=limit)

    return SmartReadLongDataListResponse(
        data=[
            SmartReadLongDataResponse(
                id=d.id,
                config_id=d.config_id,
                task_id=d.task_id,
                task_date=d.task_date.isoformat(),
                request_id_ref=d.request_id_ref,
                row_index=d.row_index,
                content=d.content,
                status=d.status,
                error_reason=d.error_reason,
                created_at=d.created_at.isoformat(),
            )
            for d in long_data
        ],
        total=len(long_data),
    )


@router.get(
    "/configs/{config_id}/events",
    summary="SSEイベントストリーム（未実装）",
)
async def event_stream(
    config_id: int,
    _current_user: User = Depends(get_current_user),
) -> Response:
    """SSEイベントストリーム（将来実装）.

    現在はプレースホルダーです。フロントエンドポーリングで代用してください。
    """
    # TODO: SSE実装（Redis Pub/Sub or in-memory queue）
    # 現段階ではプレースホルダー
    return Response(
        content='event: connected\ndata: {"status": "connected"}\n\n',
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    )


# ==================== PAD互換ランナー API ====================
#
# PADスクリプトの手順（task→request→poll→export→download→CSV後処理）を
# サーバ側で確実に実行するためのAPI。
#
# See: docs/smartread/pad_runner_implementation_plan.md


@router.post(
    "/configs/{config_id}/pad-runs",
    response_model=SmartReadPadRunStartResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="PAD互換フローを開始",
)
def start_pad_run(
    config_id: int,
    request: SmartReadPadRunStartRequest,
    uow: UnitOfWork = Depends(get_uow),
    _current_user: User = Depends(get_current_user),
) -> SmartReadPadRunStartResponse:
    """PAD互換フローを開始（バックグラウンド処理）.

    監視フォルダ内のファイルを指定してPAD互換フローを開始します。
    処理はバックグラウンドスレッドで実行され、即座にrun_idを返します。

    進捗状況は GET /pad-runs/{run_id} で確認できます。
    """
    import threading

    from app.application.services.smartread.pad_runner_service import (
        SmartReadPadRunnerService,
    )
    from app.core.database import SessionLocal

    assert uow.session is not None
    logger.info(
        "Starting PAD run",
        extra={"config_id": config_id, "file_count": len(request.filenames)},
    )
    runner = SmartReadPadRunnerService(uow.session)

    # run_idを作成（DBに登録）
    run_id = runner.start_run(config_id, request.filenames)
    uow.session.commit()
    logger.info("PAD run started", extra={"run_id": run_id})

    # バックグラウンドスレッドで実行
    # Note: daemon=True なのでプロセス終了時にスレッドも終了する
    # heartbeat_at で生存確認し、一定時間更新がなければ STALE として検出する
    def run_in_background(run_id: str) -> None:
        import logging

        logger = logging.getLogger(__name__)
        logger.info(f"[PAD Run BG] Starting background thread for {run_id}")
        try:
            with SessionLocal() as session:
                bg_runner = SmartReadPadRunnerService(session)
                bg_runner.execute_run(run_id)
        except Exception as e:
            logger.exception(f"[PAD Run BG] Background thread failed: {e}")

    thread = threading.Thread(
        target=run_in_background,
        args=(run_id,),
        daemon=True,
        name=f"pad-run-{run_id[:8]}",
    )
    thread.start()

    return SmartReadPadRunStartResponse(
        run_id=run_id,
        status="RUNNING",
        message=f"PAD互換フローを開始しました ({len(request.filenames)}ファイル)",
    )


@router.get(
    "/configs/{config_id}/pad-runs",
    response_model=SmartReadPadRunListResponse,
    summary="PAD互換フロー一覧を取得",
)
def list_pad_runs(
    config_id: int,
    status_filter: str | None = Query(default=None, description="ステータスでフィルタ"),
    limit: int = Query(default=20, le=100, description="取得件数"),
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
) -> SmartReadPadRunListResponse:
    """PAD互換フロー一覧を取得."""
    from app.application.services.smartread.pad_runner_service import (
        SmartReadPadRunnerService,
    )

    assert db is not None
    logger.debug(
        "Listing PAD runs",
        extra={"config_id": config_id, "status_filter": status_filter, "limit": limit},
    )
    runner = SmartReadPadRunnerService(db)
    runs = runner.list_runs(config_id, limit=limit, status_filter=status_filter)

    return SmartReadPadRunListResponse(
        runs=[
            SmartReadPadRunListItem(
                run_id=r["run_id"],
                status=r["status"],
                step=r["step"],
                filenames=r["filenames"],
                wide_data_count=r["wide_data_count"],
                long_data_count=r["long_data_count"],
                created_at=r["created_at"],
                completed_at=r["completed_at"],
            )
            for r in runs
        ]
    )


@router.get(
    "/configs/{config_id}/pad-runs/{run_id}",
    response_model=SmartReadPadRunStatusResponse,
    summary="PAD互換フロー状態を取得",
)
def get_pad_run_status(
    config_id: int,
    run_id: str,
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
) -> SmartReadPadRunStatusResponse:
    """PAD互換フローの状態を取得（STALE検出を含む）.

    RUNNINGステータスの場合、heartbeat_atが一定時間（120秒）更新されていなければ
    STALEとしてマークされます。
    """
    from app.application.services.smartread.pad_runner_service import (
        SmartReadPadRunnerService,
    )

    assert db is not None
    runner = SmartReadPadRunnerService(db)
    result = runner.get_run_status(run_id)

    if not result:
        logger.warning("PAD run not found", extra={"run_id": run_id})
        raise HTTPException(status_code=404, detail="実行が見つかりません")

    if result["config_id"] != config_id:
        logger.warning(
            "PAD run config mismatch",
            extra={"run_id": run_id, "expected_config_id": config_id},
        )
        raise HTTPException(status_code=404, detail="実行が見つかりません")

    return SmartReadPadRunStatusResponse(
        run_id=result["run_id"],
        config_id=result["config_id"],
        status=result["status"],
        step=result["step"],
        task_id=result["task_id"],
        export_id=result["export_id"],
        filenames=result["filenames"],
        wide_data_count=result["wide_data_count"],
        long_data_count=result["long_data_count"],
        error_message=result["error_message"],
        created_at=result["created_at"],
        updated_at=result["updated_at"],
        heartbeat_at=result["heartbeat_at"],
        completed_at=result["completed_at"],
        can_retry=result["can_retry"],
        retry_count=result["retry_count"],
        max_retries=result["max_retries"],
    )


@router.post(
    "/configs/{config_id}/pad-runs/{run_id}/retry",
    response_model=SmartReadPadRunRetryResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="PAD互換フローをリトライ",
)
def retry_pad_run(
    config_id: int,
    run_id: str,
    uow: UnitOfWork = Depends(get_uow),
    _current_user: User = Depends(get_current_user),
) -> SmartReadPadRunRetryResponse:
    """失敗/Staleの実行をリトライ.

    同じ入力ファイルで新しい実行を開始します。
    リトライ回数には上限があります（デフォルト3回）。
    """
    import threading

    from app.application.services.smartread.pad_runner_service import (
        SmartReadPadRunnerService,
    )
    from app.core.database import SessionLocal

    assert uow.session is not None
    runner = SmartReadPadRunnerService(uow.session)

    logger.info("Retrying PAD run", extra={"run_id": run_id, "config_id": config_id})

    # リトライ前のバリデーション
    current_status = runner.get_run_status(run_id)
    if not current_status:
        logger.warning("PAD run not found for retry", extra={"run_id": run_id})
        raise HTTPException(status_code=404, detail="実行が見つかりません")

    if current_status["config_id"] != config_id:
        raise HTTPException(status_code=404, detail="実行が見つかりません")

    if current_status["status"] not in ("FAILED", "STALE"):
        logger.warning(
            "PAD run not retryable",
            extra={"run_id": run_id, "status": current_status["status"]},
        )
        raise HTTPException(
            status_code=400,
            detail=f"リトライできるのはFAILED/STALEステータスのみです（現在: {current_status['status']}）",
        )

    if not current_status["can_retry"]:
        logger.warning(
            "PAD run retry limit reached",
            extra={"run_id": run_id, "retry_count": current_status["retry_count"]},
        )
        raise HTTPException(
            status_code=400,
            detail=f"リトライ回数上限に達しています（{current_status['retry_count']}/{current_status['max_retries']}）",
        )

    # 新しいrun_idを作成
    new_run_id = runner.retry_run(run_id)
    if not new_run_id:
        logger.error("PAD run retry failed to start", extra={"run_id": run_id})
        raise HTTPException(status_code=500, detail="リトライの開始に失敗しました")

    uow.session.commit()
    logger.info(
        "PAD run retry started",
        extra={"original_run_id": run_id, "new_run_id": new_run_id},
    )

    # バックグラウンドスレッドで実行
    def run_in_background(new_run_id: str) -> None:
        import logging

        logger = logging.getLogger(__name__)
        logger.info(f"[PAD Run BG] Starting retry thread for {new_run_id}")
        try:
            with SessionLocal() as session:
                bg_runner = SmartReadPadRunnerService(session)
                bg_runner.execute_run(new_run_id)
        except Exception as e:
            logger.exception(f"[PAD Run BG] Retry thread failed: {e}")

    thread = threading.Thread(
        target=run_in_background,
        args=(new_run_id,),
        daemon=True,
        name=f"pad-run-retry-{new_run_id[:8]}",
    )
    thread.start()

    return SmartReadPadRunRetryResponse(
        new_run_id=new_run_id,
        original_run_id=run_id,
        message="リトライを開始しました",
    )
