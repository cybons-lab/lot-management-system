# backend/app/api/routes/forecast.py
"""
フォーキャスト管理のAPIエンドポイント
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.models import Forecast, Order, OrderLine
from app.schemas.forecast import (
    ForecastActivateRequest,
    ForecastActivateResponse,
    ForecastBulkImportRequest,
    ForecastBulkImportResponse,
    ForecastCreate,
    ForecastMatchRequest,
    ForecastMatchResponse,
    ForecastMatchResult,
    ForecastResponse,
    ForecastUpdate,
    ForecastVersionInfo,
    ForecastVersionListResponse,
)
from app.services.forecast import ForecastMatcher

router = APIRouter(prefix="/forecast", tags=["forecast"])


# ===== Basic CRUD =====
@router.get("", response_model=List[ForecastResponse])
def list_forecasts(
    skip: int = 0,
    limit: int = 100,
    product_id: Optional[str] = None,
    client_id: Optional[str] = None,
    granularity: Optional[str] = None,
    is_active: Optional[bool] = True,
    version_no: Optional[int] = None,
    db: Session = Depends(get_db),
):
    """
    フォーキャスト一覧取得

    Args:
        skip: スキップ件数
        limit: 取得件数
        product_id: 製品IDでフィルタ
        client_id: 得意先IDでフィルタ
        granularity: 粒度でフィルタ (daily/dekad/monthly)
        is_active: アクティブ状態でフィルタ
        version_no: バージョン番号でフィルタ
    """
    query = db.query(Forecast)

    # フィルタ適用
    if product_id:
        query = query.filter(Forecast.product_id == product_id)
    if client_id:
        query = query.filter(Forecast.client_id == client_id)
    if granularity:
        query = query.filter(Forecast.granularity == granularity)
    if is_active is not None:
        query = query.filter(Forecast.is_active == is_active)
    if version_no:
        query = query.filter(Forecast.version_no == version_no)

    # ソート: バージョン降順 → 日付昇順
    query = query.order_by(
        Forecast.version_no.desc(),
        Forecast.date_day.asc().nullslast(),
        Forecast.date_dekad_start.asc().nullslast(),
        Forecast.year_month.asc().nullslast(),
    )

    forecasts = query.offset(skip).limit(limit).all()
    return forecasts


@router.post("", response_model=ForecastResponse, status_code=201)
def create_forecast(forecast: ForecastCreate, db: Session = Depends(get_db)):
    """
    フォーキャスト単一登録
    """
    # 重複チェック（同じforecast_idは登録不可）
    existing = (
        db.query(Forecast).filter(Forecast.forecast_id == forecast.forecast_id).first()
    )
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"forecast_id '{forecast.forecast_id}' は既に存在します",
        )

    # 粒度別フィールドの整合性チェック
    _validate_granularity_fields(forecast)

    db_forecast = Forecast(**forecast.model_dump())
    db.add(db_forecast)
    db.commit()
    db.refresh(db_forecast)
    return db_forecast


@router.get("/{forecast_id}", response_model=ForecastResponse)
def get_forecast(forecast_id: int, db: Session = Depends(get_db)):
    """フォーキャスト詳細取得"""
    forecast = db.query(Forecast).filter(Forecast.id == forecast_id).first()
    if not forecast:
        raise HTTPException(status_code=404, detail="フォーキャストが見つかりません")
    return forecast


@router.put("/{forecast_id}", response_model=ForecastResponse)
def update_forecast(
    forecast_id: int, forecast: ForecastUpdate, db: Session = Depends(get_db)
):
    """フォーキャスト更新"""
    db_forecast = db.query(Forecast).filter(Forecast.id == forecast_id).first()
    if not db_forecast:
        raise HTTPException(status_code=404, detail="フォーキャストが見つかりません")

    for key, value in forecast.model_dump(exclude_unset=True).items():
        setattr(db_forecast, key, value)

    db.commit()
    db.refresh(db_forecast)
    return db_forecast


@router.delete("/{forecast_id}", status_code=204)
def delete_forecast(forecast_id: int, db: Session = Depends(get_db)):
    """フォーキャスト削除"""
    db_forecast = db.query(Forecast).filter(Forecast.id == forecast_id).first()
    if not db_forecast:
        raise HTTPException(status_code=404, detail="フォーキャストが見つかりません")

    db.delete(db_forecast)
    db.commit()
    return None


# ===== Bulk Import =====
@router.post("/bulk", response_model=ForecastBulkImportResponse, status_code=201)
def bulk_import_forecasts(
    request: ForecastBulkImportRequest, db: Session = Depends(get_db)
):
    """
    フォーキャスト一括登録

    週次更新を想定した一括インポート機能。
    新バージョンとして登録し、必要に応じて旧バージョンを非アクティブ化。
    """
    imported_count = 0
    skipped_count = 0
    error_count = 0
    error_details = []

    # 旧バージョンの非アクティブ化
    if request.deactivate_old_version:
        db.query(Forecast).filter(
            Forecast.version_no < request.version_no, Forecast.is_active == True
        ).update({"is_active": False})

    # 各フォーキャストを登録
    for forecast_data in request.forecasts:
        try:
            # 重複チェック
            existing = (
                db.query(Forecast)
                .filter(Forecast.forecast_id == forecast_data.forecast_id)
                .first()
            )
            if existing:
                skipped_count += 1
                error_details.append(
                    f"forecast_id '{forecast_data.forecast_id}' は既に存在します（スキップ）"
                )
                continue

            # 粒度別フィールドの整合性チェック
            _validate_granularity_fields(forecast_data)

            # バージョン情報を上書き
            forecast_dict = forecast_data.model_dump()
            forecast_dict["version_no"] = request.version_no
            forecast_dict["version_issued_at"] = request.version_issued_at
            forecast_dict["source_system"] = request.source_system

            db_forecast = Forecast(**forecast_dict)
            db.add(db_forecast)
            imported_count += 1

        except Exception as e:
            error_count += 1
            error_details.append(f"forecast_id '{forecast_data.forecast_id}': {str(e)}")

    db.commit()

    status = (
        "success" if error_count == 0 else "partial" if imported_count > 0 else "failed"
    )

    return ForecastBulkImportResponse(
        success=(error_count == 0),
        message=f"インポート完了: {imported_count}件成功, {skipped_count}件スキップ, {error_count}件失敗",
        version_no=request.version_no,
        imported_count=imported_count,
        skipped_count=skipped_count,
        error_count=error_count,
        error_details="\n".join(error_details) if error_details else None,
    )


# ===== Version Management =====
@router.get("/versions", response_model=ForecastVersionListResponse)
def list_versions(db: Session = Depends(get_db)):
    """
    フォーキャストバージョン一覧取得
    """
    # バージョンごとの集計
    versions = (
        db.query(
            Forecast.version_no,
            Forecast.version_issued_at,
            Forecast.is_active,
            Forecast.source_system,
            func.count(Forecast.id).label("forecast_count"),
        )
        .group_by(
            Forecast.version_no,
            Forecast.version_issued_at,
            Forecast.is_active,
            Forecast.source_system,
        )
        .order_by(Forecast.version_no.desc())
        .all()
    )

    version_list = [
        ForecastVersionInfo(
            version_no=v.version_no,
            version_issued_at=v.version_issued_at,
            is_active=v.is_active,
            forecast_count=v.forecast_count,
            source_system=v.source_system,
        )
        for v in versions
    ]

    return ForecastVersionListResponse(versions=version_list)


@router.post("/activate", response_model=ForecastActivateResponse)
def activate_version(request: ForecastActivateRequest, db: Session = Depends(get_db)):
    """
    指定バージョンをアクティブ化
    """
    # 対象バージョンの存在チェック
    target_forecasts = (
        db.query(Forecast).filter(Forecast.version_no == request.version_no).all()
    )
    if not target_forecasts:
        raise HTTPException(
            status_code=404, detail=f"バージョン {request.version_no} が見つかりません"
        )

    deactivated_versions = []

    # 他のバージョンを非アクティブ化
    if request.deactivate_others:
        other_versions = (
            db.query(Forecast.version_no)
            .filter(
                Forecast.version_no != request.version_no, Forecast.is_active == True
            )
            .distinct()
            .all()
        )
        deactivated_versions = [v[0] for v in other_versions]

        db.query(Forecast).filter(
            Forecast.version_no != request.version_no, Forecast.is_active == True
        ).update({"is_active": False})

    # 対象バージョンをアクティブ化
    db.query(Forecast).filter(Forecast.version_no == request.version_no).update(
        {"is_active": True}
    )

    db.commit()

    return ForecastActivateResponse(
        success=True,
        message=f"バージョン {request.version_no} をアクティブ化しました",
        activated_version=request.version_no,
        deactivated_versions=deactivated_versions,
    )


# ===== Matching =====
@router.post("/match", response_model=ForecastMatchResponse)
def match_forecasts(request: ForecastMatchRequest, db: Session = Depends(get_db)):
    """
    フォーキャストと受注明細の手動マッチング

    用途:
    - フォーキャストバージョン更新後の再マッチング
    - 特定受注のマッチング状態修正
    """
    matcher = ForecastMatcher(db)

    # 対象受注明細の取得
    query = db.query(OrderLine).join(Order)

    if request.order_id:
        query = query.filter(OrderLine.order_id == request.order_id)
    elif request.order_ids:
        query = query.filter(OrderLine.order_id.in_(request.order_ids))
    elif request.date_from or request.date_to:
        if request.date_from:
            query = query.filter(Order.order_date >= request.date_from)
        if request.date_to:
            query = query.filter(Order.order_date <= request.date_to)
    else:
        raise HTTPException(
            status_code=400,
            detail="order_id, order_ids, または date_from/date_to のいずれかを指定してください",
        )

    # 既にマッチ済みの明細をスキップ（force_rematch=Falseの場合）
    if not request.force_rematch:
        query = query.filter(OrderLine.forecast_id.is_(None))

    order_lines = query.all()

    # マッチング実行
    results = []
    matched_count = 0

    for line in order_lines:
        order = line.order
        if not order.order_date:
            results.append(
                ForecastMatchResult(
                    order_line_id=line.id,
                    order_no=order.order_no,
                    line_no=line.line_no,
                    product_code=line.product_code,
                    matched=False,
                )
            )
            continue

        success = matcher.apply_forecast_to_order_line(
            order_line=line,
            product_code=line.product_code,
            client_code=order.customer_code,
            order_date=order.order_date,
        )

        results.append(
            ForecastMatchResult(
                order_line_id=line.id,
                order_no=order.order_no,
                line_no=line.line_no,
                product_code=line.product_code,
                matched=success,
                forecast_id=line.forecast_id,
                forecast_granularity=line.forecast_granularity,
                forecast_match_status=line.forecast_match_status,
                forecast_qty=line.forecast_qty,
            )
        )

        if success:
            matched_count += 1

    db.commit()

    return ForecastMatchResponse(
        success=True,
        message=f"マッチング完了: {matched_count}/{len(order_lines)}件マッチ",
        total_lines=len(order_lines),
        matched_lines=matched_count,
        unmatched_lines=len(order_lines) - matched_count,
        results=results,
    )


# ===== Helper Functions =====
def _validate_granularity_fields(forecast_data):
    """
    粒度別フィールドの整合性チェック
    """
    granularity = forecast_data.granularity
    date_day = forecast_data.date_day
    date_dekad_start = forecast_data.date_dekad_start
    year_month = forecast_data.year_month

    if granularity == "daily":
        if not date_day or date_dekad_start or year_month:
            raise HTTPException(
                status_code=400,
                detail="daily粒度の場合、date_dayのみ設定してください",
            )
    elif granularity == "dekad":
        if not date_dekad_start or date_day or year_month:
            raise HTTPException(
                status_code=400,
                detail="dekad粒度の場合、date_dekad_startのみ設定してください",
            )
    elif granularity == "monthly":
        if not year_month or date_day or date_dekad_start:
            raise HTTPException(
                status_code=400,
                detail="monthly粒度の場合、year_monthのみ設定してください",
            )
