# backend/app/api/routes/forecast.py
"""フォーキャスト管理のAPIエンドポイント."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.models import Customer, Forecast, Order, OrderLine, Product
from app.schemas import (
    ForecastActivateRequest,
    ForecastActivateResponse,
    ForecastBulkImportRequest,
    ForecastBulkImportResponse,
    ForecastCreate,
    ForecastItemOut,
    ForecastListResponse,
    ForecastMatchRequest,
    ForecastMatchResponse,
    ForecastMatchResult,
    ForecastResponse,
    ForecastUpdate,
    ForecastVersionInfo,
    ForecastVersionListResponse,
)
from app.services.forecast_service import (
    ForecastService,
    assign_auto_forecast_identifier,
)


router = APIRouter(prefix="/forecast", tags=["forecast"])


@router.get("/list", response_model=ForecastListResponse)
def list_forecast_summary(
    product_code: str | None = Query(default=None),
    supplier_code: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    """Forecast一覧（フロント表示用）."""
    # 🔽 [修正] join を isouter=True (LEFT OUTER JOIN) に変更
    stmt = (
        select(Forecast, Product.product_name)
        .join(Product, Forecast.product_id == Product.product_code, isouter=True)
        .order_by(Forecast.product_id, Forecast.version_no.desc())
    )

    if product_code:
        stmt = stmt.where(Forecast.product_id.ilike(f"%{product_code}%"))
    if supplier_code:
        stmt = stmt.where(Forecast.supplier_id.ilike(f"%{supplier_code}%"))

    results = db.execute(stmt.limit(50)).all()

    # --- ダミー集計データ ---
    daily = {str(d): 100.0 + (d % 5) * 10 for d in range(1, 31)}
    early = sum(v for k, v in daily.items() if 1 <= int(k) <= 10)
    middle = sum(v for k, v in daily.items() if 11 <= int(k) <= 20)
    late = sum(v for k, v in daily.items() if 21 <= int(k) <= 31)
    monthly_total = early + middle + late
    dekad_summary = {
        "early": early,
        "middle": middle,
        "late": late,
        "total": monthly_total,
    }
    version_history = [{"version_no": "v1.0 (dummy)", "updated_at": "2025-11-01"}]
    # --- ダミーここまで ---

    items: list[ForecastItemOut] = []
    for forecast, product_name in results:
        supplier_code = forecast.supplier_id or ""

        item = ForecastItemOut(
            id=forecast.id,
            product_code=forecast.product_id,
            product_name=product_name or " (製品マスタ未登録)",
            customer_code=forecast.customer_id,
            supplier_code=supplier_code or None,
            granularity=forecast.granularity,
            version_no=str(forecast.version_no),
            updated_at=forecast.updated_at,
            daily_data=daily if forecast.granularity == "daily" else None,
            dekad_data={"early": early, "middle": middle, "late": late}
            if forecast.granularity == "dekad"
            else None,
            monthly_data={"11": monthly_total} if forecast.granularity == "monthly" else None,
            dekad_summary=dekad_summary,
            customer_name=f"{forecast.customer_id} (ダミー)",
            supplier_name=f"{supplier_code or '未設定'} (ダミー)",
            unit="EA",
            version_history=version_history,
        )
        items.append(item)

    return ForecastListResponse(items=items)


# ===== Basic CRUD =====
@router.get("", response_model=list[ForecastResponse])
def list_forecasts(
    skip: int = 0,
    limit: int = 100,
    product_id: str | None = None,
    customer_id: str | None = None,
    product_code: str | None = None,
    customer_code: str | None = None,
    granularity: str | None = None,
    is_active: bool | None = None,
    version_no: int | None = None,
    db: Session = Depends(get_db),
):
    """フォーキャスト一覧取得 (生データ)."""
    query = db.query(Forecast)
    if product_code:
        normalized_code = product_code.strip()
        product_codes = {normalized_code}
        product = db.query(Product).filter(Product.product_code == normalized_code).first()
        if product:
            product_codes.add(product.product_code)
        query = query.filter(Forecast.product_id.in_(product_codes))
    elif product_id:
        query = query.filter(Forecast.product_id == product_id)

    if customer_code:
        normalized_customer = customer_code.strip()
        customer_codes = {normalized_customer}
        customer = db.query(Customer).filter(Customer.customer_code == normalized_customer).first()
        if customer:
            customer_codes.add(customer.customer_code)
        query = query.filter(Forecast.customer_id.in_(customer_codes))
    elif customer_id:
        query = query.filter(Forecast.customer_id == customer_id)
    if granularity:
        query = query.filter(Forecast.granularity == granularity)
    if is_active is not None:
        query = query.filter(Forecast.is_active == is_active)
    if version_no:
        query = query.filter(Forecast.version_no == version_no)

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
    """フォーキャスト単一登録."""
    _validate_granularity_fields(forecast)
    db_forecast = Forecast(**forecast.model_dump())
    db.add(db_forecast)
    db.flush()
    assign_auto_forecast_identifier(db_forecast)
    db.commit()
    db.refresh(db_forecast)
    return db_forecast


@router.get("/{forecast_id}", response_model=ForecastResponse)
def get_forecast(forecast_id: int, db: Session = Depends(get_db)):
    """フォーキャスト詳細取得."""
    forecast = db.query(Forecast).filter(Forecast.id == forecast_id).first()
    if not forecast:
        raise HTTPException(status_code=404, detail="フォーキャストが見つかりません")
    return forecast


@router.put("/{forecast_id}", response_model=ForecastResponse)
def update_forecast(forecast_id: int, forecast: ForecastUpdate, db: Session = Depends(get_db)):
    """フォーキャスト更新."""
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
    """フォーキャスト削除."""
    db_forecast = db.query(Forecast).filter(Forecast.id == forecast_id).first()
    if not db_forecast:
        raise HTTPException(status_code=404, detail="フォーキャストが見つかりません")

    db.delete(db_forecast)
    db.commit()
    return None


# ===== Bulk Import =====
@router.post("/bulk", response_model=ForecastBulkImportResponse, status_code=201)
def bulk_import_forecasts(request: ForecastBulkImportRequest, db: Session = Depends(get_db)):
    """フォーキャスト一括登録."""
    imported_count = 0
    skipped_count = 0
    error_count = 0
    error_details = []

    if request.deactivate_old_version:
        db.query(Forecast).filter(
            Forecast.version_no < request.version_no, Forecast.is_active
        ).update({"is_active": False})

    for index, forecast_data in enumerate(request.forecasts, start=1):
        try:
            _validate_granularity_fields(forecast_data)

            forecast_dict = forecast_data.model_dump()
            forecast_dict["version_no"] = request.version_no
            forecast_dict["version_issued_at"] = request.version_issued_at
            forecast_dict["source_system"] = request.source_system

            db_forecast = Forecast(**forecast_dict)
            db.add(db_forecast)
            db.flush()
            assign_auto_forecast_identifier(db_forecast)
            imported_count += 1

            db.commit()

        except Exception as e:
            error_count += 1
            db.rollback()
            error_details.append(f"record #{index}: {str(e)}")

    if skipped_count == 0 and imported_count == 0 and request.deactivate_old_version:
        # deactivateのみ実行された場合は、前段のupdateを反映させる
        db.commit()

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
    """フォーキャストバージョン一覧取得."""
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
    """指定バージョンをアクティブ化."""
    target_forecasts = db.query(Forecast).filter(Forecast.version_no == request.version_no).all()
    if not target_forecasts:
        raise HTTPException(
            status_code=404, detail=f"バージョン {request.version_no} が見つかりません"
        )

    deactivated_versions = []

    if request.deactivate_others:
        other_versions = (
            db.query(Forecast.version_no)
            .filter(Forecast.version_no != request.version_no, Forecast.is_active)
            .distinct()
            .all()
        )
        deactivated_versions = [v[0] for v in other_versions]

        db.query(Forecast).filter(
            Forecast.version_no != request.version_no, Forecast.is_active
        ).update({"is_active": False})

    db.query(Forecast).filter(Forecast.version_no == request.version_no).update({"is_active": True})

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
    """フォーキャストと受注明細の手動マッチング."""
    matcher = ForecastService(db)

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

    if not request.force_rematch:
        query = query.filter(OrderLine.forecast_id.is_(None))

    order_lines = query.all()

    results = []
    matched_count = 0

    for line in order_lines:
        order = line.order
        # Get product_code from relationship (DDL v2.2: maker_part_code)
        product_code = line.product.maker_part_code if line.product else "UNKNOWN"

        if not order.order_date:
            results.append(
                ForecastMatchResult(
                    order_line_id=line.id,
                    order_no=order.order_number,
                    line_no=line.id,  # DDL v2.2: line_no doesn't exist, use id
                    product_code=product_code,
                    matched=False,
                )
            )
            continue

        success = matcher.apply_forecast_to_order_line(
            order_line=line,
            product_code=product_code,
            customer_code=order.customer_code,
            order_date=order.order_date,
        )

        results.append(
            ForecastMatchResult(
                order_line_id=line.id,
                order_no=order.order_number,
                line_no=line.id,  # DDL v2.2: line_no doesn't exist, use id
                product_code=product_code,
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
    """粒度別フィールドの整合性チェック."""
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
