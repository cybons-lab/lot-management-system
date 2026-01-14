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
    # トランザクションデータ
    {"key": "lots", "name": "ロット一覧", "description": "在庫ロットデータ"},
    {"key": "orders", "name": "受注一覧", "description": "受注データ"},
    {"key": "forecasts", "name": "フォーキャスト", "description": "需要予測データ"},
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

    if target == "lots":
        service = LotService(db)
        items = service.get_all()
        # Lot models are converted to dict directly
        data = [item.__dict__ | {"_sa_instance_state": None} for item in items]
        # Remove SQLAlchemy state
        data = [{k: v for k, v in item.items() if k != "_sa_instance_state"} for item in data]
        return data, "lots"

    if target == "orders":
        service = OrderService(db)
        items = service.get_all()
        # Use model dict conversion
        data = [
            {k: v for k, v in item.__dict__.items() if k != "_sa_instance_state"} for item in items
        ]
        return data, "orders"

    if target == "forecasts":
        service = ForecastService(db)
        items = service.get_all()
        data = [
            {k: v for k, v in item.__dict__.items() if k != "_sa_instance_state"} for item in items
        ]
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
