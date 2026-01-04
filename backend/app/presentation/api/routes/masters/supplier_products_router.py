"""Supplier products router (仕入先商品ルーター).

product_suppliers テーブルから製品と仕入先の関連を取得。
"""

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.application.services.common.export_service import ExportService
from app.core.database import get_db
from app.infrastructure.persistence.models.auth_models import User
from app.infrastructure.persistence.models.masters_models import Product, Supplier
from app.infrastructure.persistence.models.product_supplier_models import ProductSupplier
from app.presentation.api.routes.auth.auth_router import get_current_admin
from app.presentation.schemas.masters.masters_schema import (
    SupplierProductCreate,
    SupplierProductResponse,
    SupplierProductUpdate,
)


router = APIRouter(prefix="/supplier-products", tags=["masters"])


@router.get("")
def list_supplier_products(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    supplier_id: int | None = Query(None),
    include_inactive: bool = Query(False),
    db: Session = Depends(get_db),
):
    """仕入先商品一覧を取得.

    product_suppliersテーブルから製品-仕入先の関連情報を取得します。
    デフォルトでは有効なレコードのみを返します。

    Args:
        skip: スキップ件数（ページネーション用）
        limit: 取得件数上限（最大1000件）
        supplier_id: 仕入先IDでフィルタ
        include_inactive: 論理削除済みレコードを含めるか（デフォルト: False）
        db: データベースセッション

    Returns:
        仕入先商品のリスト（製品情報と仕入先情報を含む）
    """
    query = (
        select(
            ProductSupplier.id,
            ProductSupplier.product_id,
            ProductSupplier.supplier_id,
            ProductSupplier.is_primary,
            ProductSupplier.lead_time_days,
            Product.maker_part_code,
            Product.product_name,
            Supplier.supplier_code,
            Supplier.supplier_name,
            ProductSupplier.valid_to,
        )
        .join(Product, ProductSupplier.product_id == Product.id)
        .join(Supplier, ProductSupplier.supplier_id == Supplier.id)
    )

    if supplier_id is not None:
        query = query.where(ProductSupplier.supplier_id == supplier_id)

    if not include_inactive:
        query = query.where(ProductSupplier.get_active_filter())

    query = query.offset(skip).limit(limit)
    results = db.execute(query).all()

    return [
        {
            "id": r.id,
            "product_id": r.product_id,
            "supplier_id": r.supplier_id,
            "is_primary": r.is_primary,
            "lead_time_days": r.lead_time_days,
            "product_code": r.maker_part_code,
            "product_name": r.product_name,
            "supplier_code": r.supplier_code,
            "supplier_name": r.supplier_name,
            "valid_to": r.valid_to,
        }
        for r in results
    ]


@router.get("/export/download")
def export_supplier_products(format: str = "csv", db: Session = Depends(get_db)):
    """仕入先商品をエクスポート.

    Args:
        format: エクスポート形式（"csv" または "xlsx"）
        db: データベースセッション

    Returns:
        Excel形式またはCSV形式のファイルレスポンス
    """
    query = (
        select(
            ProductSupplier.id,
            ProductSupplier.product_id,
            ProductSupplier.supplier_id,
            ProductSupplier.is_primary,
            ProductSupplier.lead_time_days,
            Product.maker_part_code,
            Product.product_name,
            Supplier.supplier_code,
            Supplier.supplier_name,
        )
        .join(Product, ProductSupplier.product_id == Product.id)
        .join(Supplier, ProductSupplier.supplier_id == Supplier.id)
    )
    results = db.execute(query).all()

    data = [
        {
            "id": r.id,
            "product_id": r.product_id,
            "supplier_id": r.supplier_id,
            "is_primary": r.is_primary,
            "lead_time_days": r.lead_time_days,
            "product_code": r.maker_part_code,
            "product_name": r.product_name,
            "supplier_code": r.supplier_code,
            "supplier_name": r.supplier_name,
        }
        for r in results
    ]

    if format == "xlsx":
        return ExportService.export_to_excel(data, "supplier_products")
    return ExportService.export_to_csv(data, "supplier_products")


@router.get("/{id}", response_model=SupplierProductResponse)
def get_supplier_product(id: int, db: Session = Depends(get_db)):
    """仕入先商品詳細を取得.

    Args:
        id: 仕入先商品ID
        db: データベースセッション

    Returns:
        SupplierProductResponse: 仕入先商品詳細（製品情報と仕入先情報を含む）

    Raises:
        HTTPException: レコードが見つからない場合は404
    """
    sp = db.query(ProductSupplier).filter(ProductSupplier.id == id).first()
    if not sp:
        raise HTTPException(status_code=404, detail="Supplier product not found")

    # Reload relationships to ensure we have product and supplier info
    db.refresh(sp)

    return {
        "id": sp.id,
        "product_id": sp.product_id,
        "supplier_id": sp.supplier_id,
        "is_primary": sp.is_primary,
        "lead_time_days": sp.lead_time_days,
        "product_code": sp.product.maker_part_code,
        "product_name": sp.product.product_name,
        "supplier_code": sp.supplier.supplier_code,
        "supplier_name": sp.supplier.supplier_name,
        "created_at": sp.created_at,
        "updated_at": sp.updated_at,
        "valid_to": sp.valid_to,
    }


@router.post("", response_model=SupplierProductResponse, status_code=status.HTTP_201_CREATED)
def create_supplier_product(data: SupplierProductCreate, db: Session = Depends(get_db)):
    """仕入先商品を新規作成.

    製品と仕入先の関連を登録します。
    is_primaryがTrueの場合、同一製品の他のレコードのis_primaryをFalseに更新します。

    Args:
        data: 仕入先商品作成データ
        db: データベースセッション

    Returns:
        SupplierProductResponse: 作成された仕入先商品情報

    Raises:
        HTTPException: 製品-仕入先のペアが既に存在する場合は400
    """
    # Check if exists (including inactive ones?)
    # Ideally should reactivate if exists and inactive, but for now duplicate error
    existing = (
        db.query(ProductSupplier)
        .filter(
            ProductSupplier.product_id == data.product_id,
            ProductSupplier.supplier_id == data.supplier_id,
        )
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="This product-supplier pair already exists")

    # If is_primary is True, unset others for this product
    if data.is_primary:
        db.query(ProductSupplier).filter(
            ProductSupplier.product_id == data.product_id, ProductSupplier.is_primary.is_(True)
        ).update({"is_primary": False})

    sp = ProductSupplier(
        product_id=data.product_id,
        supplier_id=data.supplier_id,
        is_primary=data.is_primary,
        lead_time_days=data.lead_time_days,
    )
    db.add(sp)
    db.commit()
    db.refresh(sp)

    return {
        "id": sp.id,
        "product_id": sp.product_id,
        "supplier_id": sp.supplier_id,
        "is_primary": sp.is_primary,
        "lead_time_days": sp.lead_time_days,
        "product_code": sp.product.maker_part_code,
        "product_name": sp.product.product_name,
        "supplier_code": sp.supplier.supplier_code,
        "supplier_name": sp.supplier.supplier_name,
        "created_at": sp.created_at,
        "updated_at": sp.updated_at,
        "valid_to": sp.valid_to,
    }


@router.put("/{id}", response_model=SupplierProductResponse)
def update_supplier_product(id: int, data: SupplierProductUpdate, db: Session = Depends(get_db)):
    """仕入先商品を更新.

    is_primaryをTrueに設定する場合、同一製品の他のレコードのis_primaryをFalseに更新します。

    Args:
        id: 仕入先商品ID
        data: 更新データ
        db: データベースセッション

    Returns:
        SupplierProductResponse: 更新後の仕入先商品情報

    Raises:
        HTTPException: レコードが見つからない場合は404
    """
    sp = db.query(ProductSupplier).filter(ProductSupplier.id == id).first()
    if not sp:
        raise HTTPException(status_code=404, detail="Supplier product not found")

    update_data = data.model_dump(exclude_unset=True)

    # If setting is_primary=True, unset others for this product
    if update_data.get("is_primary"):
        db.query(ProductSupplier).filter(
            ProductSupplier.product_id == sp.product_id,
            ProductSupplier.id != id,
            ProductSupplier.is_primary.is_(True),
        ).update({"is_primary": False})

    for field, value in update_data.items():
        setattr(sp, field, value)

    db.commit()
    db.refresh(sp)

    return {
        "id": sp.id,
        "product_id": sp.product_id,
        "supplier_id": sp.supplier_id,
        "is_primary": sp.is_primary,
        "lead_time_days": sp.lead_time_days,
        "product_code": sp.product.maker_part_code,
        "product_name": sp.product.product_name,
        "supplier_code": sp.supplier.supplier_code,
        "supplier_name": sp.supplier.supplier_name,
        "created_at": sp.created_at,
        "updated_at": sp.updated_at,
        "valid_to": sp.valid_to,
    }


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_supplier_product(
    id: int,
    end_date: date | None = Query(None),
    db: Session = Depends(get_db),
):
    """仕入先商品を論理削除（無効化）.

    Args:
        id: 仕入先商品ID
        end_date: 終了日（省略時は今日の日付）
        db: データベースセッション

    Returns:
        None

    Raises:
        HTTPException: レコードが見つからない場合は404
    """
    sp = db.query(ProductSupplier).filter(ProductSupplier.id == id).first()
    if not sp:
        raise HTTPException(status_code=404, detail="Supplier product not found")

    sp.soft_delete(end_date)
    db.commit()
    return None


@router.delete("/{id}/permanent", status_code=status.HTTP_204_NO_CONTENT)
def permanent_delete_supplier_product(
    id: int,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """仕入先商品を物理削除.

    Args:
        id: 仕入先商品ID
        db: データベースセッション

    Returns:
        None

    Raises:
        HTTPException: レコードが見つからない場合は404
    """
    sp = db.query(ProductSupplier).filter(ProductSupplier.id == id).first()
    if not sp:
        raise HTTPException(status_code=404, detail="Supplier product not found")

    db.delete(sp)
    db.commit()
    return None


@router.post("/{id}/restore", response_model=SupplierProductResponse)
def restore_supplier_product(id: int, db: Session = Depends(get_db)):
    """論理削除された仕入先商品を復元.

    Args:
        id: 仕入先商品ID
        db: データベースセッション

    Returns:
        SupplierProductResponse: 復元された仕入先商品情報

    Raises:
        HTTPException: レコードが見つからない場合は404
    """
    sp = db.query(ProductSupplier).filter(ProductSupplier.id == id).first()
    if not sp:
        raise HTTPException(status_code=404, detail="Supplier product not found")

    sp.restore()
    db.commit()
    db.refresh(sp)

    return {
        "id": sp.id,
        "product_id": sp.product_id,
        "supplier_id": sp.supplier_id,
        "is_primary": sp.is_primary,
        "lead_time_days": sp.lead_time_days,
        "product_code": sp.product.maker_part_code,
        "product_name": sp.product.product_name,
        "supplier_code": sp.supplier.supplier_code,
        "supplier_name": sp.supplier.supplier_name,
        "created_at": sp.created_at,
        "updated_at": sp.updated_at,
        "valid_to": sp.valid_to,
    }
