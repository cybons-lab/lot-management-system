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
from app.application.services.masters.customer_items_service import CustomerItemsService
from app.application.services.masters.customer_service import CustomerService
from app.application.services.masters.product_mappings_service import (
    ProductMappingsService,
)
from app.application.services.masters.supplier_service import SupplierService
from app.application.services.masters.warehouse_service import WarehouseService
from app.application.services.orders.order_service import OrderService
from app.core.database import get_db
from app.infrastructure.persistence.models import DeliveryPlace
from app.infrastructure.persistence.models.auth_models import User
from app.infrastructure.persistence.models.masters_models import Supplier
from app.infrastructure.persistence.models.supplier_item_model import SupplierItem
from app.presentation.api.routes.auth.auth_router import get_current_user
from app.presentation.schemas.masters.masters_schema import (
    CustomerResponse,
    DeliveryPlaceResponse,
    SupplierResponse,
    WarehouseResponse,
)
from app.presentation.schemas.masters.supplier_items_schema import SupplierItemResponse


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
    {"key": "products", "name": "製品マスタ", "description": "製品（仕入先品目）一覧データ"},
    {"key": "suppliers", "name": "仕入先マスタ", "description": "仕入先一覧データ"},
    {"key": "warehouses", "name": "倉庫マスタ", "description": "倉庫一覧データ"},
    {"key": "delivery_places", "name": "納入先マスタ", "description": "納入先一覧データ"},
    {
        "key": "product_mappings",
        "name": "得意先品番マッピング",
        "description": "得意先・仕入先・製品の紐付け",
    },
    {"key": "customer_items", "name": "顧客別品番設定", "description": "顧客固有の品番マッピング"},
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
    {"key": "lot_receipts", "name": "ロット入庫記録", "description": "ロット入庫記録データ"},
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
        customer_service = CustomerService(db)
        customer_list = customer_service.get_all(limit=10000)
        data = [CustomerResponse.model_validate(c).model_dump() for c in customer_list]
        return data, "customers"

    if target == "products":
        from sqlalchemy.orm import joinedload

        # Fetch all supplier items with supplier info join
        results = (
            db.query(SupplierItem)
            .options(joinedload(SupplierItem.supplier))
            .join(Supplier, SupplierItem.supplier_id == Supplier.id)
            .all()
        )
        data = []
        for si in results:
            # SupplierItemResponse handles supplier_code/supplier_name if present in the object
            # Our query might need adjustment if they are not joined properties
            item_dict = SupplierItemResponse.model_validate(si).model_dump()
            # Ensure supplier info is included even if relation not eager-loaded
            if si.supplier:
                item_dict["supplier_code"] = si.supplier.supplier_code
                item_dict["supplier_name"] = si.supplier.supplier_name
            data.append(item_dict)
        return data, "products"

    if target == "suppliers":
        supplier_service = SupplierService(db)
        supplier_list = supplier_service.get_all(limit=10000)
        data = [SupplierResponse.model_validate(s).model_dump() for s in supplier_list]
        return data, "suppliers"

    if target == "warehouses":
        warehouse_service = WarehouseService(db)
        warehouse_list = warehouse_service.get_all(limit=10000)
        data = [WarehouseResponse.model_validate(w).model_dump() for w in warehouse_list]
        return data, "warehouses"

    if target == "delivery_places":
        from sqlalchemy import func

        # Use direct query like delivery_places_router does
        delivery_place_list = (
            db.query(DeliveryPlace).filter(DeliveryPlace.valid_to > func.current_date()).all()
        )
        data = [DeliveryPlaceResponse.model_validate(d).model_dump() for d in delivery_place_list]
        return data, "delivery_places"

    if target == "product_mappings":
        pm_service = ProductMappingsService(db)
        return pm_service.get_export_data(), "product_mappings"

    if target == "customer_items":
        ci_service = CustomerItemsService(db)
        customer_item_list = ci_service.get_all(limit=10000)
        # CustomerItem is SQLAlchemy model, need schema validation
        from app.presentation.schemas.masters.customer_items_schema import CustomerItemResponse

        data = [
            CustomerItemResponse.model_validate(item).model_dump() for item in customer_item_list
        ]
        return data, "customer_items"

    if target == "uom_conversions":
        from sqlalchemy import select

        from app.infrastructure.persistence.models.masters_models import (
            ProductUomConversion,
        )
        from app.infrastructure.persistence.models.supplier_item_model import SupplierItem

        uom_query = select(
            ProductUomConversion.conversion_id,
            ProductUomConversion.product_group_id,
            ProductUomConversion.external_unit,
            ProductUomConversion.factor,
            SupplierItem.internal_unit,
            SupplierItem.maker_part_no,
            SupplierItem.display_name,
        ).join(SupplierItem, ProductUomConversion.product_group_id == SupplierItem.id)

        uom_results = db.execute(uom_query).all()
        data = [
            {
                "conversion_id": r.conversion_id,
                "product_group_id": r.product_group_id,
                "external_unit": r.external_unit,
                "factor": float(r.factor),
                "internal_unit": r.internal_unit,
                # "base_unit": r.base_unit, # Optional if needed
                "product_code": r.maker_part_no,
                "product_name": r.display_name,
            }
            for r in uom_results
        ]
        return data, "uom_conversions"

    if target == "warehouse_delivery_routes":
        from sqlalchemy import select

        from app.infrastructure.persistence.models.masters_models import WarehouseDeliveryRoute

        wdr_query = select(WarehouseDeliveryRoute)
        routes = db.execute(wdr_query).scalars().all()
        # Reuse internal router's builder function logic
        data = []
        for route in routes:
            # product_group_id is optional FK to supplier_items
            # Load SupplierItem if product_group_id exists
            product_name = None
            maker_part_no = None
            if route.product_group_id:
                from app.infrastructure.persistence.models.supplier_item_model import SupplierItem

                supplier_item = (
                    db.query(SupplierItem).filter(SupplierItem.id == route.product_group_id).first()
                )
                if supplier_item:
                    product_name = supplier_item.display_name
                    maker_part_no = supplier_item.maker_part_no

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
                    "product_name": product_name,
                    "maker_part_no": maker_part_no,
                    "transport_lead_time_days": route.transport_lead_time_days,
                    "notes": route.notes,
                }
            )
        return data, "warehouse_delivery_routes"

    if target == "customer_item_delivery_settings":
        from app.application.services.masters.customer_item_delivery_setting_service import (
            CustomerItemDeliverySettingService,
        )

        cids_service = CustomerItemDeliverySettingService(db)
        cids_list = cids_service.list_all()
        # Convert to dicts
        data = [setting.model_dump() for setting in cids_list]
        return data, "customer_item_delivery_settings"

    if target == "users":
        from app.application.services.auth.user_service import UserService

        user_service = UserService(db)
        users = user_service.get_all(limit=10000)
        from app.presentation.schemas.system.users_schema import SystemUserResponse

        user_data = [SystemUserResponse.model_validate(u).model_dump() for u in users]
        return user_data, "users"

    if target == "lot_receipts":
        from app.presentation.schemas.inventory.inventory_schema import LotResponse

        lot_service = LotService(db)
        lot_list = lot_service.get_all(limit=10000)
        data = [LotResponse.model_validate(l).model_dump() for l in lot_list]
        # Ensure we return objects that pandas can handle nicely via ExportService._prepare_data
        return data, "lot_receipts"

    if target == "orders":
        from app.presentation.schemas.orders.orders_schema import OrderLineResponse

        order_service = OrderService(db)
        order_list = order_service.get_all(limit=10000)
        data = [OrderLineResponse.model_validate(o).model_dump() for o in order_list]
        return data, "orders"

    if target == "forecasts":
        from app.presentation.schemas.forecasts.forecast_schema import ForecastResponse

        forecast_service = ForecastService(db)
        forecast_list = forecast_service.get_all(limit=10000)
        data = [ForecastResponse.model_validate(f).model_dump() for f in forecast_list]
        return data, "forecasts"

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

    # Restrict user export to admins
    is_admin = any(ur.role.role_code == "admin" for ur in _current_user.user_roles)
    if "users" in targets and not is_admin:
        from fastapi import HTTPException, status

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User export is strictly limited to administrators",
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

    # Convert timezone-aware datetimes to timezone-naive for Excel compatibility
    for col in df.columns:
        # Check if column is datetime-like
        if pd.api.types.is_datetime64_any_dtype(df[col]):
            # If it has timezone info, strip it (keep wall time)
            if df[col].dt.tz is not None:
                df[col] = df[col].dt.tz_localize(None)

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
