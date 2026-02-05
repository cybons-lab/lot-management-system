"""Warehouse master CRUD endpoints (standalone).

Supports soft delete (valid_to based) and hard delete (admin only).
"""

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.application.services.common.export_service import ExportService
from app.application.services.masters.warehouse_service import WarehouseService
from app.core.database import get_db
from app.infrastructure.persistence.models.auth_models import User
from app.presentation.api.routes.auth.auth_router import get_current_admin
from app.presentation.schemas.masters.masters_schema import (
    BulkUpsertResponse,
    WarehouseBulkUpsertRequest,
    WarehouseCreate,
    WarehouseResponse,
    WarehouseUpdate,
)


router = APIRouter(prefix="/warehouses", tags=["warehouses"])


@router.get("", response_model=list[WarehouseResponse])
def list_warehouses(
    skip: int = 0,
    limit: int = 100,
    include_inactive: bool = Query(False, description="Include soft-deleted warehouses"),
    db: Session = Depends(get_db),
):
    """倉庫一覧を取得.

    デフォルトでは有効な倉庫のみを返します。
    論理削除された倉庫も含める場合はinclude_inactive=trueを指定してください。

    Args:
        skip: スキップ件数（ページネーション用）
        limit: 取得件数（最大100件）
        include_inactive: 論理削除済み倉庫を含めるか（デフォルト: False）
        db: データベースセッション

    Returns:
        list[WarehouseResponse]: 倉庫情報のリスト
    """
    service = WarehouseService(db)
    return service.get_all(skip=skip, limit=limit, include_inactive=include_inactive)


@router.get("/template/download")
def download_warehouses_template(format: str = "csv", include_sample: bool = True):
    """Download warehouse import template.

    Args:
        format: 'csv' or 'xlsx' (default: csv)
        include_sample: Whether to include a sample row (default: True)

    Returns:
        Template file for warehouse import
    """
    return ExportService.export_template("warehouses", format=format, include_sample=include_sample)


@router.get("/export/download")
def export_warehouses(format: str = "csv", db: Session = Depends(get_db)):
    """倉庫データをCSVまたはExcelでエクスポート.

    Args:
        format: エクスポート形式（'csv' または 'xlsx'、デフォルト: csv）
        db: データベースセッション

    Returns:
        StreamingResponse: エクスポートファイル
    """
    service = WarehouseService(db)
    warehouses = service.get_all()
    data = [WarehouseResponse.model_validate(w).model_dump() for w in warehouses]

    if format == "xlsx":
        return ExportService.export_to_excel(data, "warehouses")
    return ExportService.export_to_csv(data, "warehouses")


@router.get("/{warehouse_code}", response_model=WarehouseResponse)
def get_warehouse(warehouse_code: str, db: Session = Depends(get_db)):
    """倉庫コードで倉庫を取得.

    Args:
        warehouse_code: 倉庫コード
        db: データベースセッション

    Returns:
        WarehouseResponse: 倉庫詳細情報

    Raises:
        HTTPException: 倉庫が存在しない場合（404）
    """
    service = WarehouseService(db)
    return service.get_by_code(warehouse_code)


@router.post("", response_model=WarehouseResponse, status_code=201)
def create_warehouse(warehouse: WarehouseCreate, db: Session = Depends(get_db)):
    """倉庫を新規作成.

    Args:
        warehouse: 倉庫作成リクエストデータ
        db: データベースセッション

    Returns:
        WarehouseResponse: 作成された倉庫情報

    Raises:
        HTTPException: 倉庫コードが既に存在する場合（409）
    """
    service = WarehouseService(db)
    existing = service.get_by_code(warehouse.warehouse_code, raise_404=False)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Warehouse with this code already exists",
        )
    try:
        return service.create(warehouse)
    except Exception as e:
        from sqlalchemy.exc import IntegrityError

        if isinstance(e, IntegrityError):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Warehouse with this code already exists",
            )
        raise e


@router.put("/{warehouse_code}", response_model=WarehouseResponse)
def update_warehouse(
    warehouse_code: str, warehouse: WarehouseUpdate, db: Session = Depends(get_db)
):
    """Update warehouse."""
    service = WarehouseService(db)
    return service.update_by_code(warehouse_code, warehouse)


@router.delete("/{warehouse_code}", status_code=204)
def delete_warehouse(
    warehouse_code: str,
    end_date: date | None = Query(None, description="End date for soft delete"),
    version: int = Query(..., description="楽観的ロック用バージョン"),
    db: Session = Depends(get_db),
):
    """Soft delete warehouse."""
    service = WarehouseService(db)
    service.delete_by_code(warehouse_code, end_date=end_date, expected_version=version)
    return None


@router.delete("/{warehouse_code}/permanent", status_code=204)
def permanent_delete_warehouse(
    warehouse_code: str,
    version: int = Query(..., description="楽観的ロック用バージョン"),
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Permanently delete warehouse (admin only)."""
    service = WarehouseService(db)
    service.hard_delete_by_code(warehouse_code, expected_version=version)
    return None


@router.post("/{warehouse_code}/restore", response_model=WarehouseResponse)
def restore_warehouse(warehouse_code: str, db: Session = Depends(get_db)):
    """Restore a soft-deleted warehouse."""
    service = WarehouseService(db)
    return service.restore_by_code(warehouse_code)


@router.post("/bulk-upsert", response_model=BulkUpsertResponse)
def bulk_upsert_warehouses(request: WarehouseBulkUpsertRequest, db: Session = Depends(get_db)):
    """Bulk upsert warehouses by warehouse_code.

    - If a warehouse with the same warehouse_code exists, it will be updated
    - If not, a new warehouse will be created

    Returns summary with counts of created/updated/failed records.
    """
    service = WarehouseService(db)
    return service.bulk_upsert(request.rows)
