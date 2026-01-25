"""Customer Item Delivery Settings API router."""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.application.services.masters.customer_item_delivery_setting_service import (
    CustomerItemDeliverySettingService,
)
from app.presentation.api.deps import get_db
from app.presentation.schemas.masters.customer_item_delivery_setting_schema import (
    CustomerItemDeliverySettingCreate,
    CustomerItemDeliverySettingResponse,
    CustomerItemDeliverySettingUpdate,
    ShipmentTextRequest,
    ShipmentTextResponse,
)


router = APIRouter(
    prefix="/customer-item-delivery-settings",
    tags=["customer-item-delivery-settings"],
)


@router.get(
    "/",
    response_model=list[CustomerItemDeliverySettingResponse],
)
def list_settings(
    customer_item_id: int = Query(..., description="得意先品番マッピングID"),
    db: Session = Depends(get_db),
) -> list[CustomerItemDeliverySettingResponse]:
    """List all delivery settings for a customer item.

    Lookup by customer_item_id (SSOT).
    """
    service = CustomerItemDeliverySettingService(db)
    return service.list_by_customer_item_id(customer_item_id)


@router.post(
    "/",
    response_model=CustomerItemDeliverySettingResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_setting(
    data: CustomerItemDeliverySettingCreate,
    db: Session = Depends(get_db),
) -> CustomerItemDeliverySettingResponse:
    """Create a new delivery setting."""
    service = CustomerItemDeliverySettingService(db)
    return service.create(data)


@router.put(
    "/{setting_id}",
    response_model=CustomerItemDeliverySettingResponse,
)
def update_setting(
    setting_id: int,
    data: CustomerItemDeliverySettingUpdate,
    db: Session = Depends(get_db),
) -> CustomerItemDeliverySettingResponse:
    """Update a delivery setting."""
    service = CustomerItemDeliverySettingService(db)
    result = service.update(setting_id, data)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Setting with id {setting_id} not found",
        )
    return result


@router.delete(
    "/{setting_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_setting(
    setting_id: int,
    db: Session = Depends(get_db),
) -> None:
    """Delete a delivery setting."""
    service = CustomerItemDeliverySettingService(db)
    if not service.delete(setting_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Setting with id {setting_id} not found",
        )


@router.post(
    "/shipment-text",
    response_model=ShipmentTextResponse,
)
def get_shipment_text(
    request: ShipmentTextRequest,
    db: Session = Depends(get_db),
) -> ShipmentTextResponse:
    """Get shipment text with priority-based fallback.

    Priority order:
    1. Exact match (delivery_place_id + jiku_code)
    2. Delivery place only match
    3. Default setting (is_default = true)
    4. customer_items.shipping_document_template (fallback)
    """
    service = CustomerItemDeliverySettingService(db)
    return service.get_shipment_text(
        customer_id=request.customer_id,
        product_id=request.product_id,
        delivery_place_id=request.delivery_place_id,
        jiku_code=request.jiku_code,
    )
