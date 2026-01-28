"""Supplier items router (仕入先品目ルーター).

supplier_items テーブルから仕入先品目情報を取得。
旧: supplier_products_router.py (ProductSupplier → SupplierItem へリネーム)
"""

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.application.services.common.export_service import ExportService
from app.core.database import get_db
from app.infrastructure.persistence.models.auth_models import User
from app.infrastructure.persistence.models.masters_models import ProductGroup, Supplier
from app.infrastructure.persistence.models.supplier_item_model import SupplierItem
from app.presentation.api.routes.auth.auth_router import (
    get_current_admin,
    get_current_user_optional,
)
from app.presentation.schemas.masters.supplier_items_schema import (
    SupplierItemCreate,
    SupplierItemResponse,
    SupplierItemUpdate,
)


router = APIRouter(prefix="/supplier-items", tags=["masters"])


@router.get("")
def list_supplier_items(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    supplier_id: int | None = Query(None),
    include_inactive: bool = Query(False),
    db: Session = Depends(get_db),
):
    """仕入先品目一覧を取得.

    supplier_itemsテーブルから仕入先品目情報を取得します。
    デフォルトでは有効なレコードのみを返します。

    Args:
        skip: スキップ件数（ページネーション用）
        limit: 取得件数上限（最大1000件）
        supplier_id: 仕入先IDでフィルタ
        include_inactive: 論理削除済みレコードを含めるか（デフォルト: False）
        db: データベースセッション

    Returns:
        仕入先品目のリスト（製品情報と仕入先情報を含む）
    """
    query = (
        select(
            SupplierItem.id,
            SupplierItem.product_group_id,
            SupplierItem.supplier_id,
            SupplierItem.maker_part_no,
            SupplierItem.is_primary,
            SupplierItem.lead_time_days,
            SupplierItem.display_name,
            SupplierItem.notes,
            ProductGroup.maker_part_code,
            ProductGroup.product_name,
            Supplier.supplier_code,
            Supplier.supplier_name,
            SupplierItem.valid_to,
        )
        .join(ProductGroup, SupplierItem.product_group_id == ProductGroup.id)
        .join(Supplier, SupplierItem.supplier_id == Supplier.id)
    )

    if supplier_id is not None:
        query = query.where(SupplierItem.supplier_id == supplier_id)

    if not include_inactive:
        query = query.where(SupplierItem.get_active_filter())

    query = query.offset(skip).limit(limit)
    results = db.execute(query).all()

    return [
        {
            "id": r.id,
            "product_group_id": r.product_group_id,
            "supplier_id": r.supplier_id,
            "maker_part_no": r.maker_part_no,
            "is_primary": r.is_primary,
            "lead_time_days": r.lead_time_days,
            "display_name": r.display_name,
            "notes": r.notes,
            "product_code": r.maker_part_code,
            "product_name": r.product_name,
            "supplier_code": r.supplier_code,
            "supplier_name": r.supplier_name,
            "valid_to": r.valid_to,
        }
        for r in results
    ]


@router.get("/export/download")
def export_supplier_items(format: str = "csv", db: Session = Depends(get_db)):
    """仕入先品目をエクスポート.

    Args:
        format: エクスポート形式（"csv" または "xlsx"）
        db: データベースセッション

    Returns:
        Excel形式またはCSV形式のファイルレスポンス
    """
    query = (
        select(
            SupplierItem.id,
            SupplierItem.product_group_id,
            SupplierItem.supplier_id,
            SupplierItem.maker_part_no,
            SupplierItem.is_primary,
            SupplierItem.lead_time_days,
            SupplierItem.display_name,
            SupplierItem.notes,
            ProductGroup.maker_part_code,
            ProductGroup.product_name,
            Supplier.supplier_code,
            Supplier.supplier_name,
        )
        .join(ProductGroup, SupplierItem.product_group_id == ProductGroup.id)
        .join(Supplier, SupplierItem.supplier_id == Supplier.id)
    )
    results = db.execute(query).all()

    data = [
        {
            "id": r.id,
            "product_group_id": r.product_group_id,
            "supplier_id": r.supplier_id,
            "maker_part_no": r.maker_part_no,
            "is_primary": r.is_primary,
            "lead_time_days": r.lead_time_days,
            "display_name": r.display_name,
            "notes": r.notes,
            "product_code": r.maker_part_code,
            "product_name": r.product_name,
            "supplier_code": r.supplier_code,
            "supplier_name": r.supplier_name,
        }
        for r in results
    ]

    if format == "xlsx":
        return ExportService.export_to_excel(data, "supplier_items")
    return ExportService.export_to_csv(data, "supplier_items")


@router.get("/{id}", response_model=SupplierItemResponse)
def get_supplier_item(id: int, db: Session = Depends(get_db)):
    """仕入先品目詳細を取得.

    Args:
        id: 仕入先品目ID
        db: データベースセッション

    Returns:
        SupplierItemResponse: 仕入先品目詳細（製品情報と仕入先情報を含む）

    Raises:
        HTTPException: レコードが見つからない場合は404
    """
    si = db.query(SupplierItem).filter(SupplierItem.id == id).first()
    if not si:
        raise HTTPException(status_code=404, detail="Supplier item not found")

    # Reload relationships to ensure we have product and supplier info
    db.refresh(si)

    return {
        "id": si.id,
        "product_group_id": si.product_group_id,
        "supplier_id": si.supplier_id,
        "maker_part_no": si.maker_part_no,
        "is_primary": si.is_primary,
        "lead_time_days": si.lead_time_days,
        "display_name": si.display_name,
        "notes": si.notes,
        "product_code": si.product_group.maker_part_code,
        "product_name": si.product_group.product_name,
        "supplier_code": si.supplier.supplier_code,
        "supplier_name": si.supplier.supplier_name,
        "created_at": si.created_at,
        "updated_at": si.updated_at,
        "valid_to": si.valid_to,
    }


@router.post("", response_model=SupplierItemResponse, status_code=status.HTTP_201_CREATED)
def create_supplier_item(data: SupplierItemCreate, db: Session = Depends(get_db)):
    """仕入先品目を新規作成.

    仕入先と品目（メーカー品番）の関連を登録します。

    Args:
        data: 仕入先品目作成データ
        db: データベースセッション

    Returns:
        SupplierItemResponse: 作成された仕入先品目情報

    Raises:
        HTTPException: 仕入先-製品のペアが既に存在する場合は400
    """
    # Check for existing (business key: supplier_id + maker_part_no)
    existing = (
        db.query(SupplierItem)
        .filter(
            SupplierItem.supplier_id == data.supplier_id,
            SupplierItem.maker_part_no == data.maker_part_no,
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=400,
            detail="This supplier-maker_part_no pair already exists",
        )

    si = SupplierItem(
        supplier_id=data.supplier_id,
        maker_part_no=data.maker_part_no,
        display_name=data.display_name,
        base_unit=data.base_unit,
        lead_time_days=data.lead_time_days,
        notes=data.notes,
    )
    db.add(si)
    db.commit()
    db.refresh(si)

    return {
        "id": si.id,
        "supplier_id": si.supplier_id,
        "maker_part_no": si.maker_part_no,
        "display_name": si.display_name,
        "base_unit": si.base_unit,
        "lead_time_days": si.lead_time_days,
        "notes": si.notes,
        "supplier_code": si.supplier.supplier_code,
        "supplier_name": si.supplier.supplier_name,
        "created_at": si.created_at,
        "updated_at": si.updated_at,
        "valid_to": si.valid_to,
    }


@router.put("/{id}", response_model=SupplierItemResponse)
def update_supplier_item(
    id: int,
    data: SupplierItemUpdate,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    """仕入先品目を更新.

    maker_part_no の変更は管理者のみ許可されています。

    Args:
        id: 仕入先品目ID
        data: 更新データ
        db: データベースセッション
        current_user: 認証済みユーザー（オプション）

    Returns:
        SupplierItemResponse: 更新後の仕入先品目情報

    Raises:
        HTTPException: レコードが見つからない場合は404
        HTTPException: maker_part_no変更時に管理者でない場合は403
    """
    si = db.query(SupplierItem).filter(SupplierItem.id == id).first()
    if not si:
        raise HTTPException(status_code=404, detail="Supplier item not found")

    update_data = data.model_dump(exclude_unset=True)

    # maker_part_no 変更時のチェック
    if "maker_part_no" in update_data and update_data["maker_part_no"] != si.maker_part_no:
        # 管理者権限チェック
        is_admin = False
        if current_user:
            roles = [ur.role.role_code for ur in current_user.user_roles]
            is_admin = "admin" in roles

        if not is_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="メーカー品番の変更は管理者のみ許可されています。",
            )

        # 重複チェック（同一仕入先内での重複）
        existing = (
            db.query(SupplierItem)
            .filter(
                SupplierItem.supplier_id == si.supplier_id,
                SupplierItem.maker_part_no == update_data["maker_part_no"],
                SupplierItem.id != id,
            )
            .first()
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"メーカー品番 '{update_data['maker_part_no']}' は既に存在します。",
            )

    for field, value in update_data.items():
        setattr(si, field, value)

    db.commit()
    db.refresh(si)

    return {
        "id": si.id,
        "product_group_id": si.product_group_id,
        "supplier_id": si.supplier_id,
        "maker_part_no": si.maker_part_no,
        "is_primary": si.is_primary,
        "lead_time_days": si.lead_time_days,
        "display_name": si.display_name,
        "notes": si.notes,
        "product_code": si.product_group.maker_part_code,
        "product_name": si.product_group.product_name,
        "supplier_code": si.supplier.supplier_code,
        "supplier_name": si.supplier.supplier_name,
        "created_at": si.created_at,
        "updated_at": si.updated_at,
        "valid_to": si.valid_to,
    }


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_supplier_item(
    id: int,
    end_date: date | None = Query(None),
    db: Session = Depends(get_db),
):
    """仕入先品目を論理削除（無効化）.

    Args:
        id: 仕入先品目ID
        end_date: 終了日（省略時は今日の日付）
        db: データベースセッション

    Returns:
        None

    Raises:
        HTTPException: レコードが見つからない場合は404
    """
    si = db.query(SupplierItem).filter(SupplierItem.id == id).first()
    if not si:
        raise HTTPException(status_code=404, detail="Supplier item not found")

    si.soft_delete(end_date)
    db.commit()
    return None


@router.delete("/{id}/permanent", status_code=status.HTTP_204_NO_CONTENT)
def permanent_delete_supplier_item(
    id: int,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """仕入先品目を物理削除.

    Args:
        id: 仕入先品目ID
        current_user: 認証済み管理者ユーザー
        db: データベースセッション

    Returns:
        None

    Raises:
        HTTPException: レコードが見つからない場合は404
    """
    si = db.query(SupplierItem).filter(SupplierItem.id == id).first()
    if not si:
        raise HTTPException(status_code=404, detail="Supplier item not found")

    db.delete(si)
    db.commit()
    return None


@router.post("/{id}/restore", response_model=SupplierItemResponse)
def restore_supplier_item(id: int, db: Session = Depends(get_db)):
    """論理削除された仕入先品目を復元.

    Args:
        id: 仕入先品目ID
        db: データベースセッション

    Returns:
        SupplierItemResponse: 復元された仕入先品目情報

    Raises:
        HTTPException: レコードが見つからない場合は404
    """
    si = db.query(SupplierItem).filter(SupplierItem.id == id).first()
    if not si:
        raise HTTPException(status_code=404, detail="Supplier item not found")

    si.restore()
    db.commit()
    db.refresh(si)

    return {
        "id": si.id,
        "product_group_id": si.product_group_id,
        "supplier_id": si.supplier_id,
        "maker_part_no": si.maker_part_no,
        "is_primary": si.is_primary,
        "lead_time_days": si.lead_time_days,
        "display_name": si.display_name,
        "notes": si.notes,
        "product_code": si.product_group.maker_part_code,
        "product_name": si.product_group.product_name,
        "supplier_code": si.supplier.supplier_code,
        "supplier_name": si.supplier.supplier_name,
        "created_at": si.created_at,
        "updated_at": si.updated_at,
        "valid_to": si.valid_to,
    }
