"""Product master CRUD endpoints (standalone).

Supports soft delete (valid_to based) and hard delete (admin only).
"""

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.application.services.common.export_service import ExportService
from app.application.services.masters.products_service import ProductService
from app.core.database import get_db
from app.infrastructure.persistence.models.auth_models import User
from app.infrastructure.persistence.models.masters_models import Product
from app.presentation.api.routes.auth.auth_router import get_current_admin
from app.presentation.schemas.masters.masters_schema import BulkUpsertResponse
from app.presentation.schemas.masters.products_schema import (
    ProductBulkUpsertRequest,
    ProductCreate,
    ProductOut,
    ProductUpdate,
)


router = APIRouter(prefix="/products", tags=["products"])


def _to_product_out(product: Product) -> ProductOut:
    """Map a Product ORM model to the canonical ProductOut schema."""
    return ProductOut(
        id=product.id,
        product_code=product.maker_part_code,
        maker_part_code=product.maker_part_code,
        product_name=product.product_name,
        base_unit=product.base_unit,
        consumption_limit_days=product.consumption_limit_days,
        internal_unit=product.internal_unit,
        external_unit=product.external_unit,
        qty_per_internal_unit=float(product.qty_per_internal_unit),
        customer_part_no=product.customer_part_no,
        maker_item_code=product.maker_item_code,
        is_active=product.is_active,
        created_at=product.created_at,
        updated_at=product.updated_at,
        valid_to=product.valid_to,
        supplier_ids=[int(ps.supplier_id) for ps in product.supplier_items]
        if product.supplier_items
        else [],
    )


@router.get("", response_model=list[ProductOut])
def list_products(
    skip: int = 0,
    limit: int = 100,
    search: str | None = None,
    include_inactive: bool = Query(False, description="Include soft-deleted products"),
    db: Session = Depends(get_db),
):
    """製品一覧を取得.

    デフォルトでは有効な製品のみを返します。
    論理削除された製品も含める場合はinclude_inactive=trueを指定してください。

    Args:
        skip: スキップ件数（ページネーション用）
        limit: 取得件数（最大100件）
        search: 検索キーワード（製品コード、製品名で部分一致）
        include_inactive: 論理削除済み製品を含めるか（デフォルト: False）
        db: データベースセッション

    Returns:
        list[ProductOut]: 製品情報のリスト
    """
    service = ProductService(db)
    products = service.list_items(
        skip=skip, limit=limit, search=search, include_inactive=include_inactive
    )
    return [_to_product_out(product) for product in products]


@router.get("/template/download")
def download_products_template(format: str = "csv", include_sample: bool = True):
    """Download product import template.

    Args:
        format: 'csv' or 'xlsx' (default: csv)
        include_sample: Whether to include a sample row (default: True)

    Returns:
        Template file for product import
    """
    return ExportService.export_template("products", format=format, include_sample=include_sample)


@router.get("/export/download")
def export_products(format: str = "csv", db: Session = Depends(get_db)):
    """製品データをCSVまたはExcelでエクスポート.

    Args:
        format: エクスポート形式（'csv' または 'xlsx'、デフォルト: csv）
        db: データベースセッション

    Returns:
        StreamingResponse: エクスポートファイル
    """
    service = ProductService(db)
    products = service.get_all()
    data = [_to_product_out(p) for p in products]

    if format == "xlsx":
        return ExportService.export_to_excel(data, "products")
    return ExportService.export_to_csv(data, "products")


@router.get("/{product_code}", response_model=ProductOut)
def get_product(product_code: str, db: Session = Depends(get_db)):
    """製品コードで製品を取得.

    Args:
        product_code: 製品コード（maker_part_code）
        db: データベースセッション

    Returns:
        ProductOut: 製品詳細情報

    Raises:
        HTTPException: 製品が存在しない場合（404）
    """
    service = ProductService(db)
    product = service.get_by_code(product_code)
    assert product is not None  # raise_404=True ensures this
    return _to_product_out(product)


@router.get("/{product_code}/suppliers")
def get_supplier_items(product_code: str, db: Session = Depends(get_db)):
    """Fetch suppliers for a product by its code.

    Returns a list of suppliers associated with this product, indicating
    which supplier is the primary one.
    """
    from sqlalchemy import select

    from app.infrastructure.persistence.models import Supplier, SupplierItem

    service = ProductService(db)
    product = service.get_by_code(product_code)
    assert product is not None

    stmt = (
        select(SupplierItem, Supplier)
        .join(Supplier, SupplierItem.supplier_id == Supplier.id)
        .where(SupplierItem.product_id == product.id)
        .order_by(SupplierItem.is_primary.desc(), Supplier.supplier_name)
    )
    results = db.execute(stmt).all()

    return [
        {
            "id": ps.id,
            "supplier_id": ps.supplier_id,
            "supplier_code": supplier.supplier_code,
            "supplier_name": supplier.supplier_name,
            "is_primary": ps.is_primary,
            "lead_time_days": ps.lead_time_days,
        }
        for ps, supplier in results
    ]


@router.post("", response_model=ProductOut, status_code=201)
def create_product(product: ProductCreate, db: Session = Depends(get_db)):
    """Create a new product."""
    service = ProductService(db)

    # Check if exists
    if product.product_code is None:
        raise HTTPException(status_code=400, detail="Product code is required")
    existing = service.get_by_code(product.product_code, raise_404=False)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Product with this code already exists",
        )

    try:
        db_product = service.create(product)
        return _to_product_out(db_product)
    except IntegrityError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Product with this code already exists",
        )


@router.put("/{product_code}", response_model=ProductOut)
def update_product(product_code: str, product: ProductUpdate, db: Session = Depends(get_db)):
    """Update an existing product (by maker_part_code)."""
    """Update an existing product (by maker_part_code)."""
    service = ProductService(db)
    db_product = service.update_by_code(product_code, product)
    return _to_product_out(db_product)


@router.delete("/{product_code}", status_code=204)
def delete_product(
    product_code: str,
    end_date: date | None = Query(None, description="End date for soft delete"),
    db: Session = Depends(get_db),
):
    """Soft delete a product."""
    service = ProductService(db)
    service.delete_by_code(product_code, end_date=end_date)
    return None


@router.delete("/{product_code}/permanent", status_code=204)
def permanent_delete_product(
    product_code: str,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Permanently delete product (admin only)."""
    service = ProductService(db)
    service.hard_delete_by_code(product_code)
    return None


@router.post("/{product_code}/restore", response_model=ProductOut)
def restore_product(product_code: str, db: Session = Depends(get_db)):
    """Restore a soft-deleted product."""
    service = ProductService(db)
    product = service.restore_by_code(product_code)
    return _to_product_out(product)


@router.post("/bulk-upsert", response_model=BulkUpsertResponse)
def bulk_upsert_products(request: ProductBulkUpsertRequest, db: Session = Depends(get_db)):
    """Bulk upsert products by product_code (maker_part_code).

    - If a product with the same product_code exists, it will be updated
    - If not, a new product will be created

    Returns summary with counts of created/updated/failed records.
    """
    service = ProductService(db)
    return service.bulk_upsert(request.rows)
