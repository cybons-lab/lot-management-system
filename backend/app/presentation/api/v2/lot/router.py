"""API v2 Lot router."""

from __future__ import annotations

from datetime import date
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.application.services.assignments.assignment_service import (
    UserSupplierAssignmentService,
)
from app.application.services.inventory.adjustment_service import AdjustmentService
from app.application.services.inventory.lot_service import LotService
from app.core.database import get_db
from app.infrastructure.clients.lot_client import InProcessLotClient
from app.infrastructure.persistence.models.auth_models import User
from app.presentation.api.routes.auth.auth_router import get_current_user_optional
from app.presentation.schemas.common.base import BaseSchema
from app.presentation.schemas.inventory.inventory_schema import (
    AdjustmentCreate,
    AdjustmentResponse,
    LotCreate,
    LotLabelRequest,
    LotListResponse,
    LotResponse,
)


router = APIRouter()


class AvailableLotResponse(BaseSchema):
    lot_id: int
    lot_code: str
    lot_number: str | None = None
    product_code: str
    warehouse_code: str
    available_qty: float
    expiry_date: date | None = None
    receipt_date: date | None = None


@router.get("/", response_model=list[LotResponse])
async def list_lots(
    skip: int = 0,
    limit: int = 100,
    product_id: int | None = None,
    product_code: str | None = None,
    supplier_code: str | None = None,
    warehouse_id: int | None = None,
    warehouse_code: str | None = None,
    expiry_from: date | None = None,
    expiry_to: date | None = None,
    with_stock: bool = True,
    status: str | None = None,
    prioritize_primary: bool = True,
    current_user: User | None = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    service = LotService(db)

    primary_supplier_ids: list[int] | None = None
    if prioritize_primary and current_user:
        assignment_service = UserSupplierAssignmentService(db)
        assignments = assignment_service.get_user_suppliers(current_user.id)
        primary_supplier_ids = [a.supplier_id for a in assignments if a.is_primary]

    return service.list_lots(
        skip=skip,
        limit=limit,
        product_id=product_id,
        product_code=product_code,
        supplier_code=supplier_code,
        warehouse_id=warehouse_id,
        warehouse_code=warehouse_code,
        expiry_from=expiry_from,
        expiry_to=expiry_to,
        with_stock=with_stock,
        status=status,
        primary_supplier_ids=primary_supplier_ids,
    )


@router.get("/available", response_model=list[AvailableLotResponse])
async def get_available_lots(
    product_id: int = Query(..., description="製品ID"),
    warehouse_id: int | None = Query(None, description="倉庫ID"),
    min_quantity: Decimal = Query(Decimal("0"), description="最小必要数量"),
    db: Session = Depends(get_db),
):
    client = InProcessLotClient(LotService(db))
    # client.get_available_lots call is likely non-async inside InProcessLotClient but here awaited?
    # Checking InProcessLotClient implementation, it was defined as async def in previous steps.
    candidates = await client.get_available_lots(
        product_id=product_id, warehouse_id=warehouse_id, min_quantity=min_quantity
    )
    return [AvailableLotResponse.model_validate(candidate) for candidate in candidates]


@router.get("/search", response_model=LotListResponse)
async def search_lots(
    q: str | None = Query(None, description="Keyword search (lot number, product code/name, etc.)"),
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(100, ge=1, le=1000, description="Page size"),
    sort_by: str = Query("expiry_date", description="Sort field"),
    sort_order: str = Query("asc", regex="^(asc|desc)$", description="Sort order"),
    product_id: int | None = Query(None, description="Filter by Product ID"),
    warehouse_id: int | None = Query(None, description="Filter by Warehouse ID"),
    supplier_code: str | None = Query(None, description="Filter by Supplier Code"),
    expiry_from: date | None = Query(None, description="Filter by Expiry Date (From)"),
    expiry_to: date | None = Query(None, description="Filter by Expiry Date (To)"),
    status: str | None = Query(None, description="Filter by Status"),
    db: Session = Depends(get_db),
):
    """Search lots with pagination and filtering."""
    service = LotService(db)
    result = service.search_lots(
        query=q,
        page=page,
        size=size,
        sort_by=sort_by,
        sort_order=sort_order,
        product_id=product_id,
        warehouse_id=warehouse_id,
        supplier_code=supplier_code,
        expiry_from=expiry_from,
        expiry_to=expiry_to,
        status=status,
    )
    return result


@router.get("/{lot_id}", response_model=LotResponse)
async def get_lot(lot_id: int, db: Session = Depends(get_db)):
    service = LotService(db)
    lot = service.get_lot(lot_id)
    response = LotResponse.model_validate(lot)
    if lot.product:
        response.product_name = lot.product.product_name
        response.product_code = lot.product.maker_part_code
    if lot.warehouse:
        response.warehouse_name = lot.warehouse.warehouse_name
        response.warehouse_code = lot.warehouse.warehouse_code
    if lot.supplier:
        response.supplier_name = lot.supplier.supplier_name
        response.supplier_code = lot.supplier.supplier_code
    return response


@router.post("/", response_model=LotResponse, status_code=status.HTTP_201_CREATED)
async def create_lot(lot: LotCreate, db: Session = Depends(get_db)):
    service = LotService(db)
    created = service.create_lot(lot)
    # Note: create_lot already commits internally
    return created


@router.post("/{lot_id}/adjust", response_model=AdjustmentResponse)
async def adjust_lot_quantity(
    lot_id: int,
    adjustment: AdjustmentCreate,
    db: Session = Depends(get_db),
):
    service = AdjustmentService(db)
    payload = adjustment.model_copy(update={"lot_id": lot_id})
    try:
        created = service.create_adjustment(payload)
        db.commit()
        return created
    except ValueError as exc:  # pragma: no cover - passthrough to HTTP
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/labels/download", response_class=Response)
async def download_labels(
    request: LotLabelRequest,
    db: Session = Depends(get_db),
):
    """Generate and download PDF labels for selected lots."""
    from datetime import datetime

    from app.application.services.inventory.label_service import LabelService

    service = LabelService(db)
    pdf_buffer = service.generate_label_pdf(request.lot_ids)

    filename = f"lot_labels_{datetime.now().strftime('%Y%m%d%H%M%S')}.pdf"

    return Response(
        content=pdf_buffer.getvalue(),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
