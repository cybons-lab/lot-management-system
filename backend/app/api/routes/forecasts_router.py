"""Forecast API endpoints with header/line structure."""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.schemas.forecast_schema import (
    ForecastHeaderCreate,
    ForecastHeaderDetailResponse,
    ForecastHeaderResponse,
    ForecastHeaderUpdate,
    ForecastLineCreate,
    ForecastLineResponse,
    ForecastLineUpdate,
)
from app.services.forecast_service import ForecastService


router = APIRouter(prefix="/forecasts", tags=["forecasts"])


# ===== Forecast Headers =====


@router.get("/headers", response_model=list[ForecastHeaderResponse])
def list_forecast_headers(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=1000),
    customer_id: int | None = None,
    delivery_place_id: int | None = None,
    status: str | None = None,
    db: Session = Depends(get_db),
):
    """
    フォーキャストヘッダ一覧取得.

    Args:
        skip: スキップ件数（ページネーション用）
        limit: 取得件数上限
        customer_id: 得意先IDでフィルタ
        delivery_place_id: 納入先IDでフィルタ
        status: ステータスでフィルタ（active/completed/cancelled）
        db: データベースセッション

    Returns:
        フォーキャストヘッダのリスト
    """
    service = ForecastService(db)
    return service.get_headers(
        skip=skip,
        limit=limit,
        customer_id=customer_id,
        delivery_place_id=delivery_place_id,
        status=status,
    )


@router.post(
    "/headers",
    response_model=ForecastHeaderDetailResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_forecast_header(
    header: ForecastHeaderCreate,
    db: Session = Depends(get_db),
):
    """
    フォーキャストヘッダ作成（明細も同時登録可能）.

    Args:
        header: フォーキャストヘッダ作成データ（明細含む）
        db: データベースセッション

    Returns:
        作成されたフォーキャストヘッダ（明細含む）
    """
    service = ForecastService(db)
    return service.create_header(header)


@router.get("/headers/{header_id}", response_model=ForecastHeaderDetailResponse)
def get_forecast_header(
    header_id: int,
    db: Session = Depends(get_db),
):
    """
    フォーキャストヘッダ詳細取得（明細含む）.

    Args:
        header_id: フォーキャストヘッダID
        db: データベースセッション

    Returns:
        フォーキャストヘッダ（明細含む）

    Raises:
        HTTPException: ヘッダが見つからない場合は404
    """
    service = ForecastService(db)
    header = service.get_header_by_id(header_id)
    if not header:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Forecast header with id={header_id} not found",
        )
    return header


@router.put("/headers/{header_id}", response_model=ForecastHeaderResponse)
def update_forecast_header(
    header_id: int,
    header: ForecastHeaderUpdate,
    db: Session = Depends(get_db),
):
    """
    フォーキャストヘッダ更新.

    Args:
        header_id: フォーキャストヘッダID
        header: 更新データ
        db: データベースセッション

    Returns:
        更新後のフォーキャストヘッダ

    Raises:
        HTTPException: ヘッダが見つからない場合は404
    """
    service = ForecastService(db)
    updated = service.update_header(header_id, header)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Forecast header with id={header_id} not found",
        )
    return updated


@router.delete("/headers/{header_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_forecast_header(
    header_id: int,
    db: Session = Depends(get_db),
):
    """
    フォーキャストヘッダ削除（カスケード削除：明細も削除される）.

    Args:
        header_id: フォーキャストヘッダID
        db: データベースセッション

    Returns:
        None

    Raises:
        HTTPException: ヘッダが見つからない場合は404
    """
    service = ForecastService(db)
    deleted = service.delete_header(header_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Forecast header with id={header_id} not found",
        )
    return None


# ===== Forecast Lines =====


@router.get("/headers/{header_id}/lines", response_model=list[ForecastLineResponse])
def list_forecast_lines(
    header_id: int,
    db: Session = Depends(get_db),
):
    """
    フォーキャスト明細一覧取得.

    Args:
        header_id: フォーキャストヘッダID
        db: データベースセッション

    Returns:
        フォーキャスト明細のリスト
    """
    service = ForecastService(db)
    return service.get_lines_by_header(header_id)


@router.post(
    "/headers/{header_id}/lines",
    response_model=ForecastLineResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_forecast_line(
    header_id: int,
    line: ForecastLineCreate,
    db: Session = Depends(get_db),
):
    """
    フォーキャスト明細追加.

    Args:
        header_id: フォーキャストヘッダID
        line: 明細作成データ
        db: データベースセッション

    Returns:
        作成された明細

    Raises:
        HTTPException: ヘッダが見つからない場合は404
    """
    service = ForecastService(db)
    return service.create_line(header_id, line)


@router.put("/lines/{line_id}", response_model=ForecastLineResponse)
def update_forecast_line(
    line_id: int,
    line: ForecastLineUpdate,
    db: Session = Depends(get_db),
):
    """
    フォーキャスト明細更新.

    Args:
        line_id: 明細ID
        line: 更新データ
        db: データベースセッション

    Returns:
        更新後の明細

    Raises:
        HTTPException: 明細が見つからない場合は404
    """
    service = ForecastService(db)
    updated = service.update_line(line_id, line)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Forecast line with id={line_id} not found",
        )
    return updated


@router.delete("/lines/{line_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_forecast_line(
    line_id: int,
    db: Session = Depends(get_db),
):
    """
    フォーキャスト明細削除.

    Args:
        line_id: 明細ID
        db: データベースセッション

    Returns:
        None

    Raises:
        HTTPException: 明細が見つからない場合は404
    """
    service = ForecastService(db)
    deleted = service.delete_line(line_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Forecast line with id={line_id} not found",
        )
    return None


# ===== Bulk Import =====


@router.post(
    "/headers/bulk-import",
    response_model=list[ForecastHeaderDetailResponse],
    status_code=status.HTTP_201_CREATED,
)
def bulk_import_forecasts(
    headers: list[ForecastHeaderCreate],
    db: Session = Depends(get_db),
):
    """
    フォーキャスト一括登録（ヘッダ・明細同時登録）.

    Args:
        headers: フォーキャストヘッダリスト（各ヘッダに明細を含む）
        db: データベースセッション

    Returns:
        作成されたフォーキャストヘッダリスト（明細含む）

    Note:
        - トランザクション単位で処理
        - エラーが発生した場合は全体をロールバック
    """
    service = ForecastService(db)
    return service.bulk_import_headers(headers)
