"""Bulk export router for downloading multiple data exports as ZIP.

Provides endpoints for:
- Listing available export targets
- Downloading multiple exports as a single ZIP file
"""

import io
import zipfile
from typing import Any

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.application.services.forecasts.forecast_service import ForecastService
from app.application.services.inventory.lot_service import LotService
from app.application.services.masters.customer_service import CustomerService
from app.application.services.masters.products_service import ProductService
from app.application.services.masters.supplier_service import SupplierService
from app.application.services.masters.warehouse_service import WarehouseService
from app.application.services.orders.order_service import OrderService
from app.core.database import get_db
from app.infrastructure.persistence.models import DeliveryPlace
from app.infrastructure.persistence.models.auth_models import User
from app.presentation.api.routes.auth.auth_router import get_current_user
from app.presentation.api.routes.masters.customer_items_router import (
    CustomerItemsService,
)
from app.presentation.api.routes.masters.product_mappings_router import (
    get_product_mappings_export_data,
)
from app.presentation.schemas.masters.masters_schema import (
    CustomerResponse,
    DeliveryPlaceResponse,
    SupplierResponse,
    WarehouseResponse,
)
from app.presentation.schemas.masters.products_schema import ProductOut


router = APIRouter(prefix="/bulk-export", tags=["bulk-export"])


class ExportTarget(BaseModel):
    """Exportable target definition."""

    key: str
    name: str
    description: str


# Available export targets
EXPORT_TARGETS: list[dict[str, str]] = [
    # マスターデータ
    {"key": "customers", "name": "顧客マスタ", "description": "顧客一覧データ"},
    {"key": "products", "name": "製品マスタ", "description": "製品一覧データ"},
    {"key": "suppliers", "name": "仕入先マスタ", "description": "仕入先一覧データ"},
    {"key": "warehouses", "name": "倉庫マスタ", "description": "倉庫一覧データ"},
    {"key": "delivery_places", "name": "納入先マスタ", "description": "納入先一覧データ"},
    {
        "key": "product_mappings",
        "name": "得意先品番マッピング",
        "description": "得意先・仕入先・製品の紐付け",
    },
    {"key": "customer_items", "name": "顧客別品番設定", "description": "顧客固有の品番マッピング"},
    {
        "key": "supplier_products",
        "name": "仕入先商品関連",
        "description": "仕入先ごとのリードタイム設定",
    },
    {"key": "uom_conversions", "name": "単位換算マスタ", "description": "製品ごとの単位換算定義"},
    {
        "key": "warehouse_delivery_routes",
        "name": "配送ルートマスタ",
        "description": "倉庫から納入先への配送設定",
    },
    {
        "key": "customer_item_delivery_settings",
        "name": "顧客別納入設定",
        "description": "顧客納入先ごとの出荷票設定",
    },
    # トランザクションデータ
    {"key": "lots", "name": "ロット一覧", "description": "在庫ロットデータ"},
    {"key": "orders", "name": "受注一覧", "description": "受注データ"},
    {"key": "forecasts", "name": "フォーキャスト", "description": "需要予測データ"},
    # システムデータ
    {"key": "users", "name": "ユーザー一覧", "description": "システム利用ユーザー"},
]


def _get_export_data(db: Session, target: str) -> tuple[list[dict[str, Any]], str]:
    """Get export data for a specific target.

    Returns:
        Tuple of (data_list, filename)
    """
    if target == "customers":
        service = CustomerService(db)
        items = service.get_all()
        data = [CustomerResponse.model_validate(c).model_dump() for c in items]
        return data, "customers"

    if target == "products":
        service = ProductService(db)
        items = service.get_all()
        data = [ProductOut.model_validate(p).model_dump() for p in items]
        return data, "products"

    if target == "suppliers":
        service = SupplierService(db)
        items = service.get_all()
        data = [SupplierResponse.model_validate(s).model_dump() for s in items]
        return data, "suppliers"

    if target == "warehouses":
        service = WarehouseService(db)
        items = service.get_all()
        data = [WarehouseResponse.model_validate(w).model_dump() for w in items]
        return data, "warehouses"

    if target == "delivery_places":
        from sqlalchemy import func

        # Use direct query like delivery_places_router does
        items = db.query(DeliveryPlace).filter(DeliveryPlace.valid_to > func.current_date()).all()
        data = [DeliveryPlaceResponse.model_validate(d).model_dump() for d in items]
        return data, "delivery_places"

    if target == "product_mappings":
        return get_product_mappings_export_data(db), "product_mappings"

    if target == "customer_items":
        service = CustomerItemsService(db)
        items = service.get_all()
        # Items are already in exportable format from service.get_all (Pydantic models)
        return items, "customer_items"

    if target == "uom_conversions":
        from sqlalchemy import select

        from app.infrastructure.persistence.models.masters_models import (
            Product,
            ProductUomConversion,
        )

        query = select(
            ProductUomConversion.conversion_id,
            ProductUomConversion.product_id,
            ProductUomConversion.external_unit,
            ProductUomConversion.factor,
            Product.maker_part_code,
            Product.product_name,
        ).join(Product, ProductUomConversion.product_id == Product.id)

        results = db.execute(query).all()
        data = [
            {
                "conversion_id": r.conversion_id,
                "product_id": r.product_id,
                "external_unit": r.external_unit,
                "conversion_factor": float(r.factor),
                "product_code": r.maker_part_code,
                "product_name": r.product_name,
            }
            for r in results
        ]
        return data, "uom_conversions"

    if target == "supplier_products":
        from sqlalchemy import select

        from app.infrastructure.persistence.models.masters_models import Product, Supplier
        from app.infrastructure.persistence.models.product_supplier_models import ProductSupplier

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
        return data, "supplier_products"

    if target == "warehouse_delivery_routes":
        from sqlalchemy import select

        from app.infrastructure.persistence.models.masters_models import WarehouseDeliveryRoute

        query = select(WarehouseDeliveryRoute)
        routes = db.execute(query).scalars().all()
        # Reuse internal router's builder function logic
        data = []
        for route in routes:
            data.append(
                {
                    "warehouse_code": route.warehouse.warehouse_code if route.warehouse else None,
                    "warehouse_name": route.warehouse.warehouse_name if route.warehouse else None,
                    "delivery_place_code": (
                        route.delivery_place.delivery_place_code if route.delivery_place else None
                    ),
                    "delivery_place_name": (
                        route.delivery_place.delivery_place_name if route.delivery_place else None
                    ),
                    "product_name": route.product.product_name if route.product else None,
                    "maker_part_code": route.product.maker_part_code if route.product else None,
                    "transport_lead_time_days": route.transport_lead_time_days,
                    "notes": route.notes,
                }
            )
        return data, "warehouse_delivery_routes"

    if target == "customer_item_delivery_settings":
        from app.application.services.masters.customer_item_delivery_setting_service import (
            CustomerItemDeliverySettingService,
        )

        service = CustomerItemDeliverySettingService(db)
        items = service.list_all()  # Assume we add list_all to service
        return items, "customer_item_delivery_settings"

    if target == "users":
        from app.application.services.auth.user_service import UserService

        service = UserService(db)
        users = service.get_all()
        from app.presentation.schemas.system.users_schema import UserResponse

        data = [UserResponse.model_validate(u).model_dump() for u in users]
        return data, "users"

    if target == "lots":
        service = LotService(db)
        items = service.get_all()
        # Ensure we return objects that pandas can handle nicely via ExportService._prepare_data
        return items, "lots"

    if target == "orders":
        service = OrderService(db)
        items = service.get_all()
        return items, "orders"

    if target == "forecasts":
        service = ForecastService(db)
        items = service.get_all()
        return items, "forecasts"

    raise ValueError(f"Unknown export target: {target}")


@router.get("/targets", response_model=list[ExportTarget])
def list_export_targets() -> list[dict[str, str]]:
    """エクスポート可能なターゲット一覧を取得.

    Returns:
        list[ExportTarget]: エクスポート可能なデータの一覧
    """
    return EXPORT_TARGETS


@router.get("/download")
def download_bulk_export(
    targets: list[str] = Query(..., description="エクスポート対象のキー（複数指定可）"),
    format: str = Query("xlsx", description="ファイル形式（xlsx または csv）"),
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
) -> StreamingResponse:
    """複数データを一括でZIPダウンロード.

    Args:
        targets: エクスポート対象のキーリスト（例: ["customers", "products"]）
        format: ファイル形式（xlsx または csv）
        db: データベースセッション

    Returns:
        StreamingResponse: ZIPファイル
    """
    # Validate targets
    valid_keys = {t["key"] for t in EXPORT_TARGETS}
    invalid_targets = [t for t in targets if t not in valid_keys]
    if invalid_targets:
        from fastapi import HTTPException, status

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid export targets: {invalid_targets}",
        )

    # Create ZIP in memory
    zip_buffer = io.BytesIO()

    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
        for target in targets:
            data, filename = _get_export_data(db, target)

            if not data:
                continue

            # Generate file content
            if format == "xlsx":
                file_content = _generate_excel_bytes(data)
                file_ext = "xlsx"
            else:
                file_content = _generate_csv_bytes(data)
                file_ext = "csv"

            zip_file.writestr(f"{filename}.{file_ext}", file_content)

    zip_buffer.seek(0)

    return StreamingResponse(
        iter([zip_buffer.getvalue()]),
        media_type="application/zip",
        headers={"Content-Disposition": "attachment; filename=bulk_export.zip"},
    )


def _generate_excel_bytes(data: list[dict[str, Any]]) -> bytes:
    """Generate Excel file bytes from data."""
    try:
        import pandas as pd
    except ImportError:
        raise ImportError("pandas is required for export")

    df = pd.DataFrame(data)
    buffer = io.BytesIO()
    with pd.ExcelWriter(buffer, engine="openpyxl") as writer:
        df.to_excel(writer, index=False, sheet_name="Sheet1")
    return buffer.getvalue()


def _generate_csv_bytes(data: list[dict[str, Any]]) -> bytes:
    """Generate CSV file bytes from data."""
    try:
        import pandas as pd
    except ImportError:
        raise ImportError("pandas is required for export")

    df = pd.DataFrame(data)
    buffer = io.StringIO()
    df.to_csv(buffer, index=False, encoding="utf-8-sig")
    return buffer.getvalue().encode("utf-8-sig")
