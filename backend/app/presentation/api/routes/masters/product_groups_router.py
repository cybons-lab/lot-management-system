"""ProductGroup master CRUD endpoints.

製品グループは supplier_items と customer_items を紐付けるグルーピングエンティティ。
Supports soft delete (valid_to based) and hard delete (admin only).
"""

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.application.services.common.export_service import ExportService
from app.application.services.masters.product_groups_service import ProductGroupService
from app.core.database import get_db
from app.infrastructure.persistence.models.auth_models import User
from app.infrastructure.persistence.models.masters_models import ProductGroup
from app.presentation.api.routes.auth.auth_router import get_current_admin
from app.presentation.schemas.masters.masters_schema import BulkUpsertResponse
from app.presentation.schemas.masters.product_groups_schema import (
    ProductGroupBulkUpsertRequest,
    ProductGroupCreate,
    ProductGroupOut,
    ProductGroupUpdate,
)


router = APIRouter(prefix="/product-groups", tags=["product-groups"])


def _to_product_group_out(product_group: ProductGroup) -> ProductGroupOut:
    """Map a ProductGroup ORM model to the canonical ProductGroupOut schema."""
    return ProductGroupOut(
        id=product_group.id,
        product_code=product_group.maker_part_code,
        maker_part_code=product_group.maker_part_code,
        product_name=product_group.product_name,
        base_unit=product_group.base_unit,
        consumption_limit_days=product_group.consumption_limit_days,
        internal_unit=product_group.internal_unit,
        external_unit=product_group.external_unit,
        qty_per_internal_unit=float(product_group.qty_per_internal_unit),
        is_active=product_group.is_active,
        created_at=product_group.created_at,
        updated_at=product_group.updated_at,
        valid_to=product_group.valid_to,
        supplier_ids=[int(ps.supplier_id) for ps in product_group.supplier_items]
        if product_group.supplier_items
        else [],
    )


@router.get("", response_model=list[ProductGroupOut])
def list_product_groups(
    skip: int = 0,
    limit: int = 100,
    search: str | None = None,
    include_inactive: bool = Query(False, description="Include soft-deleted product groups"),
    db: Session = Depends(get_db),
):
    """製品グループ一覧を取得.

    デフォルトでは有効な製品グループのみを返します。

    Args:
        skip: スキップ件数（ページネーション用）
        limit: 取得件数（最大100件）
        search: 検索キーワード（製品コード、製品名で部分一致）
        include_inactive: 論理削除済み製品グループを含めるか（デフォルト: False）
        db: データベースセッション

    Returns:
        list[ProductGroupOut]: 製品グループ情報のリスト
    """
    service = ProductGroupService(db)
    product_groups = service.list_items(
        skip=skip, limit=limit, search=search, include_inactive=include_inactive
    )
    return [_to_product_group_out(pg) for pg in product_groups]


@router.get("/template/download")
def download_product_groups_template(format: str = "csv", include_sample: bool = True):
    """Download product group import template.

    Args:
        format: 'csv' or 'xlsx' (default: csv)
        include_sample: Whether to include a sample row (default: True)

    Returns:
        Template file for product group import
    """
    return ExportService.export_template(
        "product_groups", format=format, include_sample=include_sample
    )


@router.get("/export/download")
def export_product_groups(format: str = "csv", db: Session = Depends(get_db)):
    """製品グループデータをCSVまたはExcelでエクスポート.

    Args:
        format: エクスポート形式（'csv' または 'xlsx'、デフォルト: csv）
        db: データベースセッション

    Returns:
        StreamingResponse: エクスポートファイル
    """
    service = ProductGroupService(db)
    product_groups = service.get_all()
    data = [_to_product_group_out(pg) for pg in product_groups]

    if format == "xlsx":
        return ExportService.export_to_excel(data, "product_groups")
    return ExportService.export_to_csv(data, "product_groups")


@router.get("/{product_code}", response_model=ProductGroupOut)
def get_product_group(product_code: str, db: Session = Depends(get_db)):
    """製品コードで製品グループを取得.

    Args:
        product_code: 製品コード（maker_part_code）
        db: データベースセッション

    Returns:
        ProductGroupOut: 製品グループ詳細情報

    Raises:
        HTTPException: 製品グループが存在しない場合（404）
    """
    service = ProductGroupService(db)
    product_group = service.get_by_code(product_code)
    assert product_group is not None  # raise_404=True ensures this
    return _to_product_group_out(product_group)


@router.get("/{product_code}/suppliers")
def get_supplier_items(product_code: str, db: Session = Depends(get_db)):
    """Fetch suppliers for a product group by its code.

    Returns a list of suppliers associated with this product group, indicating
    which supplier is the primary one.
    """
    from sqlalchemy import select

    from app.infrastructure.persistence.models import Supplier, SupplierItem

    service = ProductGroupService(db)
    product_group = service.get_by_code(product_code)
    assert product_group is not None

    stmt = (
        select(SupplierItem, Supplier)
        .join(Supplier, SupplierItem.supplier_id == Supplier.id)
        .where(SupplierItem.product_group_id == product_group.id)
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


@router.post("", response_model=ProductGroupOut, status_code=201)
def create_product_group(product_group: ProductGroupCreate, db: Session = Depends(get_db)):
    """Create a new product group."""
    service = ProductGroupService(db)

    # Check if exists
    if product_group.product_code is None:
        raise HTTPException(status_code=400, detail="Product code is required")
    existing = service.get_by_code(product_group.product_code, raise_404=False)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Product group with this code already exists",
        )

    try:
        db_product_group = service.create(product_group)
        return _to_product_group_out(db_product_group)
    except IntegrityError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Product group with this code already exists",
        )


@router.put("/{product_code}", response_model=ProductGroupOut)
def update_product_group(
    product_code: str, product_group: ProductGroupUpdate, db: Session = Depends(get_db)
):
    """Update an existing product group (by maker_part_code)."""
    service = ProductGroupService(db)
    db_product_group = service.update_by_code(product_code, product_group)
    return _to_product_group_out(db_product_group)


@router.delete("/{product_code}", status_code=204)
def delete_product_group(
    product_code: str,
    end_date: date | None = Query(None, description="End date for soft delete"),
    db: Session = Depends(get_db),
):
    """Soft delete a product group."""
    service = ProductGroupService(db)
    service.delete_by_code(product_code, end_date=end_date)
    return None


@router.delete("/{product_code}/permanent", status_code=204)
def permanent_delete_product_group(
    product_code: str,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Permanently delete product group (admin only)."""
    service = ProductGroupService(db)
    service.hard_delete_by_code(product_code)
    return None


@router.post("/{product_code}/restore", response_model=ProductGroupOut)
def restore_product_group(product_code: str, db: Session = Depends(get_db)):
    """Restore a soft-deleted product group."""
    service = ProductGroupService(db)
    product_group = service.restore_by_code(product_code)
    return _to_product_group_out(product_group)


@router.post("/bulk-upsert", response_model=BulkUpsertResponse)
def bulk_upsert_product_groups(
    request: ProductGroupBulkUpsertRequest, db: Session = Depends(get_db)
):
    """Bulk upsert product groups by product_code (maker_part_code).

    - If a product group with the same product_code exists, it will be updated
    - If not, a new product group will be created

    Returns summary with counts of created/updated/failed records.
    """
    service = ProductGroupService(db)
    return service.bulk_upsert(request.rows)
