"""Material Order Forecast API router."""

import logging
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from sqlalchemy.orm import Session

from app.application.services.material_order_forecast_service import (
    MaterialOrderForecastService,
)
from app.infrastructure.persistence.models import Maker
from app.presentation.api.deps import get_db
from app.presentation.api.routes.auth.auth_router import get_current_user
from app.presentation.schemas.material_order_forecast_schema import (
    MakerCreateRequest,
    MakerResponse,
    MakerUpdateRequest,
    MaterialOrderForecastImportResponse,
    MaterialOrderForecastListResponse,
    MaterialOrderForecastResponse,
)


logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/material-order-forecasts", tags=["material_order_forecasts"])
maker_router = APIRouter(prefix="/api/makers", tags=["makers"])


# ===========================
# Material Order Forecast API
# ===========================


@router.post("/import", response_model=MaterialOrderForecastImportResponse)
async def import_forecast_csv(
    file: Annotated[UploadFile, File(description="CSV file (ヘッダーなし)")],
    target_month: Annotated[str | None, Form()] = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    材料発注フォーキャストCSVインポート.

    Args:
        file: CSV file (ヘッダーなし、1行目からデータ、60列)
        target_month: 対象月（YYYY-MM、省略時はCSV A列から自動取得）
        db: Database session
        current_user: Current authenticated user

    Returns:
        ImportResponse: インポート結果 + 警告リスト
    """
    if not file.filename or not file.filename.endswith(".csv"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="CSVファイルのみ受け付けます",
        )

    try:
        service = MaterialOrderForecastService(db)
        result = service.import_from_csv(
            file=file.file,
            target_month=target_month,
            user_id=current_user.id,
            filename=file.filename,
        )
        return result
    except ValueError as e:
        logger.error(f"CSV import validation error: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception:
        logger.exception("CSV import failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="CSVインポート中にエラーが発生しました",
        )


@router.get("", response_model=MaterialOrderForecastListResponse)
def get_forecasts(
    target_month: str | None = Query(None, description="対象月（YYYY-MM）"),
    material_code: str | None = Query(None, description="材質コード（部分一致）"),
    maker_code: str | None = Query(None, description="メーカーコード"),
    jiku_code: str | None = Query(None, description="次区コード"),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    _current_user=Depends(get_current_user),
):
    """
    フォーキャストデータ取得（フィルタリング付き）.

    Args:
        target_month: 対象月フィルタ
        material_code: 材質コードフィルタ（部分一致）
        maker_code: メーカーコードフィルタ
        jiku_code: 次区コードフィルタ
        limit: 取得件数
        offset: オフセット
        db: Database session
        _current_user: Current authenticated user (unused)

    Returns:
        フォーキャストデータリスト
    """
    service = MaterialOrderForecastService(db)
    forecasts = service.get_forecasts(
        target_month=target_month,
        material_code=material_code,
        maker_code=maker_code,
        jiku_code=jiku_code,
        limit=limit,
        offset=offset,
    )

    # TODO: total_count を効率的に取得（同一クエリのcount()）
    total_count = len(forecasts)

    return MaterialOrderForecastListResponse(
        total_count=total_count,
        items=[MaterialOrderForecastResponse.model_validate(f) for f in forecasts],
    )


# ===========================
# Maker Master API
# ===========================


@maker_router.get("", response_model=list[MakerResponse])
def get_makers(
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    _current_user=Depends(get_current_user),
):
    """メーカーマスタ一覧取得."""
    makers = db.query(Maker).order_by(Maker.maker_code).limit(limit).offset(offset).all()
    return [MakerResponse.model_validate(m) for m in makers]


@maker_router.post("", response_model=MakerResponse, status_code=status.HTTP_201_CREATED)
def create_maker(
    request: MakerCreateRequest,
    db: Session = Depends(get_db),
    _current_user=Depends(get_current_user),
):
    """メーカーマスタ新規作成."""
    # 重複チェック
    existing = db.query(Maker).filter(Maker.maker_code == request.maker_code).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"メーカーコード '{request.maker_code}' は既に存在します",
        )

    maker = Maker(
        maker_code=request.maker_code,
        maker_name=request.maker_name,
        display_name=request.display_name,
        short_name=request.short_name,
        notes=request.notes,
    )
    db.add(maker)
    db.commit()
    db.refresh(maker)

    logger.info(f"Maker created: {maker.maker_code}")
    return MakerResponse.model_validate(maker)


@maker_router.get("/{maker_id}", response_model=MakerResponse)
def get_maker(
    maker_id: int,
    db: Session = Depends(get_db),
    _current_user=Depends(get_current_user),
):
    """メーカーマスタ詳細取得."""
    maker = db.query(Maker).filter(Maker.id == maker_id).first()
    if not maker:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="メーカーが見つかりません"
        )
    return MakerResponse.model_validate(maker)


@maker_router.put("/{maker_id}", response_model=MakerResponse)
def update_maker(
    maker_id: int,
    request: MakerUpdateRequest,
    db: Session = Depends(get_db),
    _current_user=Depends(get_current_user),
):
    """メーカーマスタ更新."""
    maker = db.query(Maker).filter(Maker.id == maker_id).first()
    if not maker:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="メーカーが見つかりません"
        )

    if request.maker_name is not None:
        maker.maker_name = request.maker_name
    if request.display_name is not None:
        maker.display_name = request.display_name
    if request.short_name is not None:
        maker.short_name = request.short_name
    if request.notes is not None:
        maker.notes = request.notes

    db.commit()
    db.refresh(maker)

    logger.info(f"Maker updated: {maker.maker_code}")
    return MakerResponse.model_validate(maker)


@maker_router.delete("/{maker_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_maker(
    maker_id: int,
    db: Session = Depends(get_db),
    _current_user=Depends(get_current_user),
):
    """メーカーマスタ削除（論理削除）."""
    maker = db.query(Maker).filter(Maker.id == maker_id).first()
    if not maker:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="メーカーが見つかりません"
        )

    maker.soft_delete()
    db.commit()

    logger.info(f"Maker soft-deleted: {maker.maker_code}")
    return None
