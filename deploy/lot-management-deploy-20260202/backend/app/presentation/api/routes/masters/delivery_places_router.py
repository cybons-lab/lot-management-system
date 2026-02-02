"""Delivery place CRUD endpoints.

Supports soft delete (validity period-based deletion) for delivery_places.
"""

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.application.services.common.export_service import ExportService
from app.core.database import get_db
from app.infrastructure.persistence.models import Customer, DeliveryPlace
from app.infrastructure.persistence.models.auth_models import User
from app.presentation.api.routes.auth.auth_router import get_current_admin
from app.presentation.schemas.masters.masters_schema import (
    DeliveryPlaceCreate,
    DeliveryPlaceResponse,
    DeliveryPlaceUpdate,
)


router = APIRouter(prefix="/delivery-places", tags=["delivery-places"])


@router.get("/template/download")
def download_delivery_places_template(format: str = "xlsx", include_sample: bool = True):
    """納入先インポートテンプレートをダウンロード.

    Args:
        format: ファイル形式（'csv' または 'xlsx'、デフォルト: xlsx）
        include_sample: サンプル行を含めるか（デフォルト: True）

    Returns:
        納入先インポート用のテンプレートファイル
    """
    return ExportService.export_template(
        "delivery_places", format=format, include_sample=include_sample
    )


@router.get("/export/download")
def export_delivery_places(format: str = "xlsx", db: Session = Depends(get_db)):
    """納入先をエクスポート.

    Args:
        format: エクスポート形式（'csv' または 'xlsx'）
        db: データベースセッション

    Returns:
        Excel形式またはCSV形式のファイルレスポンス
    """
    query = db.query(DeliveryPlace).filter(DeliveryPlace.valid_to > func.current_date())
    places = query.order_by(DeliveryPlace.id).all()
    data = [DeliveryPlaceResponse.model_validate(p).model_dump() for p in places]

    if format == "xlsx":
        return ExportService.export_to_excel(data, "delivery_places")
    return ExportService.export_to_csv(data, "delivery_places")


@router.get("", response_model=list[DeliveryPlaceResponse])
def list_delivery_places(
    skip: int = 0,
    limit: int = 100,
    customer_id: int | None = Query(None, description="Filter by customer ID"),
    include_inactive: bool = Query(False, description="Include soft-deleted places"),
    db: Session = Depends(get_db),
):
    """納入先一覧を取得.

    デフォルトでは有効な納入先のみを返します。
    オプションで得意先IDによるフィルタリングが可能です。

    Args:
        skip: スキップ件数（ページネーション用）
        limit: 取得件数上限
        customer_id: 得意先IDでフィルタ
        include_inactive: 論理削除済み納入先を含めるか（デフォルト: False）
        db: データベースセッション

    Returns:
        納入先のリスト
    """
    query = db.query(DeliveryPlace)

    # Filter out soft-deleted records by default
    if not include_inactive:
        query = query.filter(DeliveryPlace.valid_to > func.current_date())

    if customer_id is not None:
        query = query.filter(DeliveryPlace.customer_id == customer_id)

    places = query.order_by(DeliveryPlace.id).offset(skip).limit(limit).all()
    return places


@router.get("/{delivery_place_id}", response_model=DeliveryPlaceResponse)
def get_delivery_place(delivery_place_id: int, db: Session = Depends(get_db)):
    """納入先詳細を取得.

    Args:
        delivery_place_id: 納入先ID
        db: データベースセッション

    Returns:
        DeliveryPlaceResponse: 納入先詳細

    Raises:
        HTTPException: 納入先が見つからない場合は404
    """
    place = db.query(DeliveryPlace).filter(DeliveryPlace.id == delivery_place_id).first()
    if not place:
        raise HTTPException(status_code=404, detail="Delivery place not found")
    return place


@router.post("", response_model=DeliveryPlaceResponse, status_code=status.HTTP_201_CREATED)
def create_delivery_place(data: DeliveryPlaceCreate, db: Session = Depends(get_db)):
    """納入先を新規作成.

    得意先の存在確認と納入先コードの重複チェックを行います。

    Args:
        data: 納入先作成データ
        db: データベースセッション

    Returns:
        DeliveryPlaceResponse: 作成された納入先情報

    Raises:
        HTTPException: 得意先が見つからない場合は400
        HTTPException: 納入先コードが既に存在する場合は400
    """
    # Check customer exists
    customer = db.query(Customer).filter(Customer.id == data.customer_id).first()
    if not customer:
        raise HTTPException(status_code=400, detail="Customer not found")

    # Check unique delivery_place_code
    existing = (
        db.query(DeliveryPlace)
        .filter(DeliveryPlace.delivery_place_code == data.delivery_place_code)
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="Delivery place code already exists")

    place = DeliveryPlace(**data.model_dump())
    db.add(place)
    db.commit()
    db.refresh(place)
    return place


@router.put("/{delivery_place_id}", response_model=DeliveryPlaceResponse)
def update_delivery_place(
    delivery_place_id: int, data: DeliveryPlaceUpdate, db: Session = Depends(get_db)
):
    """納入先を更新.

    得意先IDを変更する場合は、得意先の存在確認を行います。

    Args:
        delivery_place_id: 納入先ID
        data: 更新データ
        db: データベースセッション

    Returns:
        DeliveryPlaceResponse: 更新後の納入先情報

    Raises:
        HTTPException: 納入先が見つからない場合は404
        HTTPException: 得意先が見つからない場合は400
    """
    place = db.query(DeliveryPlace).filter(DeliveryPlace.id == delivery_place_id).first()
    if not place:
        raise HTTPException(status_code=404, detail="Delivery place not found")

    update_data = data.model_dump(exclude_unset=True)

    # If updating customer_id, verify customer exists
    if "customer_id" in update_data and update_data["customer_id"]:
        customer = db.query(Customer).filter(Customer.id == update_data["customer_id"]).first()
        if not customer:
            raise HTTPException(status_code=400, detail="Customer not found")

    for field, value in update_data.items():
        setattr(place, field, value)

    try:
        db.commit()
        db.refresh(place)
        return place
    except Exception as e:
        db.rollback()
        # Basic check for unique constraint violation
        if "unique constraint" in str(e).lower() or "integrity" in str(e).lower():
            raise HTTPException(status_code=400, detail="Delivery place code already exists")
        raise e


@router.delete("/{delivery_place_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_delivery_place(
    delivery_place_id: int,
    end_date: date | None = Query(None, description="Valid until date (defaults to yesterday)"),
    db: Session = Depends(get_db),
):
    """納入先を論理削除（valid_toを設定して無効化）.

    Args:
        delivery_place_id: 納入先ID
        end_date: 有効終了日（省略時は昨日）
        db: データベースセッション

    Returns:
        None

    Raises:
        HTTPException: 納入先が見つからない場合は404
    """
    place = db.query(DeliveryPlace).filter(DeliveryPlace.id == delivery_place_id).first()
    if not place:
        raise HTTPException(status_code=404, detail="Delivery place not found")

    # Use SoftDeleteMixin method
    place.soft_delete(end_date)
    db.commit()
    return None


@router.delete("/{delivery_place_id}/permanent", status_code=status.HTTP_204_NO_CONTENT)
def permanent_delete_delivery_place(
    delivery_place_id: int,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """納入先を物理削除（管理者のみ）.

    他のテーブルから参照されていない場合のみ削除可能です。

    Args:
        delivery_place_id: 納入先ID
        current_user: 認証済み管理者ユーザー
        db: データベースセッション

    Returns:
        None

    Raises:
        HTTPException: 納入先が見つからない場合は404
        HTTPException: 他のデータから参照されている場合は409

    """
    place = db.query(DeliveryPlace).filter(DeliveryPlace.id == delivery_place_id).first()
    if not place:
        raise HTTPException(status_code=404, detail="Delivery place not found")

    # Check for references in forecast_current, customer_items, etc.
    # This would fail on FK constraint if references exist
    try:
        db.delete(place)
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="この納入先は他のデータから参照されているため削除できません",
        )
    return None


@router.post("/{delivery_place_id}/restore", response_model=DeliveryPlaceResponse)
def restore_delivery_place(
    delivery_place_id: int,
    db: Session = Depends(get_db),
):
    """論理削除された納入先を復元.

    Args:
        delivery_place_id: 納入先ID
        db: データベースセッション

    Returns:
        DeliveryPlaceResponse: 復元された納入先情報

    Raises:
        HTTPException: 納入先が見つからない場合は404
    """
    place = db.query(DeliveryPlace).filter(DeliveryPlace.id == delivery_place_id).first()
    if not place:
        raise HTTPException(status_code=404, detail="Delivery place not found")

    # Use SoftDeleteMixin method
    place.restore()
    db.commit()
    db.refresh(place)
    return place
