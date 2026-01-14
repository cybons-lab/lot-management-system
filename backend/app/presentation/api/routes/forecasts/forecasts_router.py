"""Forecast API endpoints for v2.4 schema (forecast_current /
forecast_history).
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.application.services.common.export_service import ExportService
from app.application.services.forecasts.forecast_import_service import ForecastImportService
from app.application.services.forecasts.forecast_service import ForecastService
from app.presentation.api.deps import get_db
from app.presentation.schemas.forecasts.forecast_schema import (
    ForecastBulkImportRequest,
    ForecastBulkImportSummary,
    ForecastCreate,
    ForecastHistoryResponse,
    ForecastListResponse,
    ForecastResponse,
    ForecastUpdate,
)


router = APIRouter(prefix="/forecasts", tags=["forecasts"])


# ============================================================
# Export Schema for cleaner Excel output
# ============================================================


class ForecastExportRow:
    """フォーキャストエクスポート用の軽量データクラス."""

    def __init__(self, forecast: ForecastResponse, group_snapshot_at: str | None = None):
        self.得意先コード = forecast.customer_code or ""
        self.得意先名 = forecast.customer_name or ""
        self.納入先コード = forecast.delivery_place_code or ""
        self.納入先名 = forecast.delivery_place_name or ""
        self.先方品番 = forecast.product_code or ""
        self.商品名 = forecast.product_name or ""
        self.予測日 = str(forecast.forecast_date)
        self.予測数量 = float(forecast.forecast_quantity)
        self.単位 = forecast.unit or ""
        self.予測期間 = forecast.forecast_period or ""
        self.スナップショット日時 = group_snapshot_at or ""

    def model_dump(self):
        """Pydantic互換のdictメソッド."""
        return {
            "得意先コード": self.得意先コード,
            "得意先名": self.得意先名,
            "納入先コード": self.納入先コード,
            "納入先名": self.納入先名,
            "先方品番": self.先方品番,
            "商品名": self.商品名,
            "予測日": self.予測日,
            "予測数量": self.予測数量,
            "単位": self.単位,
            "予測期間": self.予測期間,
            "スナップショット日時": self.スナップショット日時,
        }


@router.get("", response_model=ForecastListResponse)
def list_forecasts(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=1000),
    customer_id: int | None = None,
    delivery_place_id: int | None = None,
    product_id: int | None = None,
    db: Session = Depends(get_db),
):
    """フォーキャスト一覧取得（顧客×納入先×製品でグループ化）.

    Args:
        skip: スキップ件数（ページネーション用）
        limit: 取得件数上限
        customer_id: 得意先IDでフィルタ
        delivery_place_id: 納入先IDでフィルタ
        product_id: 製品IDでフィルタ
        db: データベースセッション

    Returns:
        グループ化されたフォーキャストリスト
    """
    service = ForecastService(db)
    return service.get_forecasts(
        skip=skip,
        limit=limit,
        customer_id=customer_id,
        delivery_place_id=delivery_place_id,
        product_id=product_id,
    )


@router.get("/export/download")
def export_forecasts(
    customer_id: int | None = None,
    delivery_place_id: int | None = None,
    product_id: int | None = None,
    db: Session = Depends(get_db),
):
    """フォーキャストをExcelでエクスポート.

    グループ化されたフォーキャストを明細レベルに展開してExcelファイルとして出力します。

    Args:
        customer_id: 得意先IDでフィルタ
        delivery_place_id: 納入先IDでフィルタ
        product_id: 製品IDでフィルタ
        db: データベースセッション

    Returns:
        StreamingResponse: Excelファイル
    """
    service = ForecastService(db)
    result = service.get_forecasts(
        skip=0,
        limit=10000,  # エクスポート用に大きめの上限
        customer_id=customer_id,
        delivery_place_id=delivery_place_id,
        product_id=product_id,
    )

    # グループを展開して明細レベルに変換
    export_data = []
    for group in result.items:
        snapshot_str = group.snapshot_at.isoformat() if group.snapshot_at else ""
        for forecast in group.forecasts:
            export_data.append(ForecastExportRow(forecast, snapshot_str))

    return ExportService.export_to_excel(export_data, "forecasts")


@router.get("/history", response_model=list[ForecastHistoryResponse])
def list_forecast_history(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=1000),
    customer_id: int | None = None,
    delivery_place_id: int | None = None,
    product_id: int | None = None,
    db: Session = Depends(get_db),
):
    """フォーキャスト履歴取得.

    Args:
        skip: スキップ件数
        limit: 取得件数上限
        customer_id: 得意先IDでフィルタ
        delivery_place_id: 納入先IDでフィルタ
        product_id: 製品IDでフィルタ
        db: データベースセッション

    Returns:
        アーカイブ済みフォーキャストリスト
    """
    service = ForecastService(db)
    return service.get_history(
        customer_id=customer_id,
        delivery_place_id=delivery_place_id,
        product_id=product_id,
        skip=skip,
        limit=limit,
    )


@router.get("/{forecast_id}", response_model=ForecastResponse)
def get_forecast(
    forecast_id: int,
    db: Session = Depends(get_db),
):
    """フォーキャスト詳細取得.

    Args:
        forecast_id: フォーキャストID
        db: データベースセッション

    Returns:
        フォーキャスト

    Raises:
        HTTPException: 見つからない場合は404
    """
    service = ForecastService(db)
    forecast = service.get_forecast_by_id(forecast_id)
    if not forecast:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Forecast with id={forecast_id} not found",
        )
    return forecast


@router.post(
    "",
    response_model=ForecastResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_forecast(
    data: ForecastCreate,
    db: Session = Depends(get_db),
):
    """フォーキャスト作成.

    Args:
        data: フォーキャスト作成データ
        db: データベースセッション

    Returns:
        作成されたフォーキャスト
    """
    service = ForecastService(db)
    return service.create_forecast(data)


@router.put("/{forecast_id}", response_model=ForecastResponse)
def update_forecast(
    forecast_id: int,
    data: ForecastUpdate,
    db: Session = Depends(get_db),
):
    """フォーキャスト更新.

    Args:
        forecast_id: フォーキャストID
        data: 更新データ
        db: データベースセッション

    Returns:
        更新後のフォーキャスト

    Raises:
        HTTPException: 見つからない場合は404
    """
    service = ForecastService(db)
    updated = service.update_forecast(forecast_id, data)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Forecast with id={forecast_id} not found",
        )
    return updated


@router.delete("/{forecast_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_forecast(
    forecast_id: int,
    db: Session = Depends(get_db),
):
    """フォーキャスト削除.

    Args:
        forecast_id: フォーキャストID
        db: データベースセッション

    Returns:
        None

    Raises:
        HTTPException: 見つからない場合は404
    """
    service = ForecastService(db)
    deleted = service.delete_forecast(forecast_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Forecast with id={forecast_id} not found",
        )
    return None


@router.post(
    "/bulk-import",
    response_model=ForecastBulkImportSummary,
    status_code=status.HTTP_201_CREATED,
)
def bulk_import_forecasts(
    request: ForecastBulkImportRequest,
    db: Session = Depends(get_db),
):
    """フォーキャスト一括インポート.

    CSVデータからフォーキャストを一括登録します。
    replace_existing=True の場合、同じ顧客×納入先×製品の既存データを
    履歴テーブルにアーカイブしてから新データを登録します。

    Args:
        request: インポートリクエスト（items + replace_existing）
        db: データベースセッション

    Returns:
        インポート結果サマリ
    """
    service = ForecastImportService(db)
    return service.bulk_import(
        items=request.items,
        replace_existing=request.replace_existing,
    )
