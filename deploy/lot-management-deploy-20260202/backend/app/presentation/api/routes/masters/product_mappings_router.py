"""Product mapping CRUD endpoints (商品マスタ)."""

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.application.services.common.export_service import ExportService
from app.application.services.masters.product_mappings_service import (
    ProductMappingsService,
)
from app.core.database import get_db
from app.infrastructure.persistence.models import Customer, Product, ProductMapping, Supplier
from app.presentation.schemas.masters.masters_schema import (
    ProductMappingCreate,
    ProductMappingResponse,
    ProductMappingUpdate,
)


router = APIRouter(prefix="/product-mappings", tags=["product-mappings"])


@router.get("/template/download")
def download_product_mappings_template(format: str = "csv", include_sample: bool = True):
    """得意先品番マッピング インポートテンプレートをダウンロード.

    Args:
        format: ファイル形式（'csv' または 'xlsx'、デフォルト: csv）
        include_sample: サンプル行を含めるか（デフォルト: True）

    Returns:
        インポート用テンプレートファイル
    """
    return ExportService.export_template(
        "product_mappings", format=format, include_sample=include_sample
    )


@router.get("/export/download")
def export_product_mappings(format: str = "csv", db: Session = Depends(get_db)):
    """得意先品番マッピングをエクスポート.

    Args:
        format: エクスポート形式（"csv" または "xlsx"）
        db: データベースセッション

    Returns:
        Excel形式またはCSV形式のファイルレスポンス
    """
    service = ProductMappingsService(db)
    data = service.get_export_data()

    if format == "xlsx":
        return ExportService.export_to_excel(data, "product_mappings")
    return ExportService.export_to_csv(data, "product_mappings")


# Deprecated: use ProductMappingsService.get_export_data
def get_product_mappings_export_data(db: Session) -> list[dict[str, Any]]:
    """Export用データ取得（一括エクスポートでも利用）.

    Args:
        db: データベースセッション

    Returns:
        エクスポート形式の辞書リスト
    """
    service = ProductMappingsService(db)
    return service.get_export_data()


@router.get("", response_model=list[ProductMappingResponse])
def list_product_mappings(
    skip: int = 0,
    limit: int = 100,
    customer_id: int | None = Query(None, description="Filter by customer ID"),
    supplier_id: int | None = Query(None, description="Filter by supplier ID"),
    supplier_item_id: int | None = Query(None, description="Filter by product ID"),
    is_active: bool | None = Query(None, description="Filter by active status"),
    db: Session = Depends(get_db),
):
    """Return product mappings, optionally filtered."""
    query = db.query(ProductMapping)

    if customer_id is not None:
        query = query.filter(ProductMapping.customer_id == customer_id)
    if supplier_id is not None:
        query = query.filter(ProductMapping.supplier_id == supplier_id)
    if supplier_item_id is not None:
        query = query.filter(ProductMapping.supplier_item_id == supplier_item_id)
    if is_active is True:
        from sqlalchemy import func

        query = query.filter(ProductMapping.valid_to > func.current_date())
    elif is_active is False:
        from sqlalchemy import func

        query = query.filter(ProductMapping.valid_to <= func.current_date())

    mappings = query.order_by(ProductMapping.id).offset(skip).limit(limit).all()
    return mappings


@router.get("/{mapping_id}", response_model=ProductMappingResponse)
def get_product_mapping(mapping_id: int, db: Session = Depends(get_db)):
    """Get a product mapping by ID."""
    mapping = db.query(ProductMapping).filter(ProductMapping.id == mapping_id).first()
    if not mapping:
        raise HTTPException(status_code=404, detail="Product mapping not found")
    return mapping


@router.post("", response_model=ProductMappingResponse, status_code=status.HTTP_201_CREATED)
def create_product_mapping(data: ProductMappingCreate, db: Session = Depends(get_db)):
    """Create a new product mapping."""
    # Check customer exists
    customer = db.query(Customer).filter(Customer.id == data.customer_id).first()
    if not customer:
        raise HTTPException(status_code=400, detail="Customer not found")

    # Check supplier exists
    supplier = db.query(Supplier).filter(Supplier.id == data.supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=400, detail="Supplier not found")

    # Check product exists
    product = db.query(Product).filter(Product.id == data.supplier_item_id).first()
    if not product:
        raise HTTPException(status_code=400, detail="Product not found")

    # Check unique constraint
    existing = (
        db.query(ProductMapping)
        .filter(
            ProductMapping.customer_id == data.customer_id,
            ProductMapping.customer_part_code == data.customer_part_code,
            ProductMapping.supplier_id == data.supplier_id,
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=400,
            detail="Product mapping with same customer, part code, and supplier already exists",
        )

    mapping = ProductMapping(**data.model_dump())
    db.add(mapping)
    db.commit()
    db.refresh(mapping)
    return mapping


@router.put("/{mapping_id}", response_model=ProductMappingResponse)
def update_product_mapping(
    mapping_id: int, data: ProductMappingUpdate, db: Session = Depends(get_db)
):
    """Update a product mapping."""
    mapping = db.query(ProductMapping).filter(ProductMapping.id == mapping_id).first()
    if not mapping:
        raise HTTPException(status_code=404, detail="Product mapping not found")

    update_data = data.model_dump(exclude_unset=True)

    # Validate foreign keys if being updated
    if "customer_id" in update_data and update_data["customer_id"]:
        customer = db.query(Customer).filter(Customer.id == update_data["customer_id"]).first()
        if not customer:
            raise HTTPException(status_code=400, detail="Customer not found")

    if "supplier_id" in update_data and update_data["supplier_id"]:
        supplier = db.query(Supplier).filter(Supplier.id == update_data["supplier_id"]).first()
        if not supplier:
            raise HTTPException(status_code=400, detail="Supplier not found")

    if "supplier_item_id" in update_data and update_data["supplier_item_id"]:
        product = db.query(Product).filter(Product.id == update_data["supplier_item_id"]).first()
        if not product:
            raise HTTPException(status_code=400, detail="Product not found")

    for field, value in update_data.items():
        setattr(mapping, field, value)

    db.commit()
    db.refresh(mapping)
    return mapping


@router.delete("/{mapping_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product_mapping(mapping_id: int, db: Session = Depends(get_db)):
    """Delete a product mapping."""
    mapping = db.query(ProductMapping).filter(ProductMapping.id == mapping_id).first()
    if not mapping:
        raise HTTPException(status_code=404, detail="Product mapping not found")

    db.delete(mapping)
    db.commit()
    return None
