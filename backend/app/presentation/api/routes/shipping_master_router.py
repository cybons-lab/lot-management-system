import io
from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy.orm import Session

from app.application.services.shipping_master import ShippingMasterService
from app.core.database import get_db
from app.presentation.schemas.shipping_master_schema import (
    ShippingMasterCuratedCreate,
    ShippingMasterCuratedListResponse,
    ShippingMasterCuratedResponse,
    ShippingMasterCuratedUpdate,
    ShippingMasterImportResponse,
)


router = APIRouter(prefix="/shipping-masters", tags=["Shipping Master"])


def get_service(db: Session = Depends(get_db)) -> ShippingMasterService:
    """サービスインスタンスを取得."""
    return ShippingMasterService(db)


@router.get("", response_model=ShippingMasterCuratedListResponse)
async def list_shipping_masters(
    customer_code: Annotated[str | None, Query(description="得意先コードでフィルタ")] = None,
    material_code: Annotated[str | None, Query(description="材質コードでフィルタ")] = None,
    jiku_code: Annotated[str | None, Query(description="次区でフィルタ")] = None,
    limit: Annotated[int, Query(ge=1, le=500)] = 100,
    offset: Annotated[int, Query(ge=0)] = 0,
    service: ShippingMasterService = Depends(get_service),
) -> ShippingMasterCuratedListResponse:
    """出荷用マスタ一覧を取得."""
    items = service.list_curated(
        customer_code=customer_code,
        material_code=material_code,
        jiku_code=jiku_code,
        limit=limit,
        offset=offset,
    )
    response_items = [ShippingMasterCuratedResponse.model_validate(item) for item in items]
    return ShippingMasterCuratedListResponse(items=response_items, total=len(items))


@router.get("/{master_id}", response_model=ShippingMasterCuratedResponse)
async def get_shipping_master(
    master_id: int,
    service: ShippingMasterService = Depends(get_service),
) -> ShippingMasterCuratedResponse:
    """出荷用マスタを取得."""
    master = service.get_curated_by_id(master_id)
    if not master:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"出荷用マスタ ID={master_id} が見つかりません",
        )
    return ShippingMasterCuratedResponse.model_validate(master)


@router.post("", response_model=ShippingMasterCuratedResponse, status_code=status.HTTP_201_CREATED)
async def create_shipping_master(
    data: ShippingMasterCuratedCreate,
    service: ShippingMasterService = Depends(get_service),
) -> ShippingMasterCuratedResponse:
    """出荷用マスタを新規作成."""
    # キー重複チェック
    existing = service.get_curated_by_key(data.customer_code, data.material_code, data.jiku_code)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"キー重複: {data.customer_code}/{data.material_code}/{data.jiku_code}",
        )

    created = service.create_curated(data.model_dump())
    return ShippingMasterCuratedResponse.model_validate(created)


@router.put("/{master_id}", response_model=ShippingMasterCuratedResponse)
async def update_shipping_master(
    master_id: int,
    data: ShippingMasterCuratedUpdate,
    service: ShippingMasterService = Depends(get_service),
) -> ShippingMasterCuratedResponse:
    """出荷用マスタを更新."""
    updated = service.update_curated(master_id, data.model_dump(exclude_unset=True))
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"出荷用マスタ ID={master_id} が見つかりません",
        )
    return ShippingMasterCuratedResponse.model_validate(updated)


@router.delete("/{master_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_shipping_master(
    master_id: int,
    service: ShippingMasterService = Depends(get_service),
) -> None:
    """出荷用マスタを削除."""
    deleted = service.delete_curated(master_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"出荷用マスタ ID={master_id} が見つかりません",
        )


@router.delete("/admin/reset", status_code=status.HTTP_204_NO_CONTENT)
async def reset_shipping_masters(
    service: ShippingMasterService = Depends(get_service),
) -> None:
    """出荷用マスタデータを全削除（管理者専用）."""
    service.delete_all()  # 全削除メソッドを呼び出す


@router.post("/import", response_model=ShippingMasterImportResponse)
async def import_shipping_masters_file(
    file: Annotated[UploadFile, File(description="Excel file (.xlsx)")],
    service: ShippingMasterService = Depends(get_service),
) -> ShippingMasterImportResponse:
    """出荷用マスタをExcelファイルからインポート.

    Excelファイルをアップロードし、DBに投入する。
    """
    if not file.filename or not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Excelファイル (.xlsx または .xls) をアップロードしてください",
        )

    try:
        import openpyxl

        # Excelファイルを読み込み
        contents = await file.read()
        workbook = openpyxl.load_workbook(io.BytesIO(contents), read_only=True)
        sheet = workbook.active

        # ヘッダー行を読み取り（1行目）
        headers = [cell.value for cell in sheet[1]]

        # データ行を読み取り（2行目以降）
        rows = []
        for row in sheet.iter_rows(min_row=2, values_only=True):
            row_dict = {headers[i]: row[i] for i in range(len(headers)) if i < len(row)}
            rows.append(row_dict)

        # 生データを投入
        imported_count, errors = service.import_raw_data(rows)

        # 整形済みデータを生成
        curated_count, warnings = service.curate_from_raw()

        return ShippingMasterImportResponse(
            success=len(errors) == 0,
            imported_count=imported_count,
            curated_count=curated_count,
            errors=errors,
            warnings=warnings,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"ファイル処理エラー: {str(e)}",
        ) from e
