"""Customer Item Delivery Setting service."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.infrastructure.persistence.models import CustomerItemDeliverySetting
from app.infrastructure.persistence.repositories.customer_item_delivery_setting_repository import (
    CustomerItemDeliverySettingRepository,
)
from app.presentation.schemas.masters.customer_item_delivery_setting_schema import (
    CustomerItemDeliverySettingCreate,
    CustomerItemDeliverySettingResponse,
    CustomerItemDeliverySettingUpdate,
    ShipmentTextResponse,
)


class CustomerItemDeliverySettingService:
    """Service for CustomerItemDeliverySetting operations."""

    def __init__(self, db: Session):
        self.db = db
        self.repository = CustomerItemDeliverySettingRepository(db)

    def get_shipment_text(
        self,
        customer_id: int,
        product_id: int,
        delivery_place_id: int | None = None,
        jiku_code: str | None = None,
    ) -> ShipmentTextResponse:
        """Get shipment text with priority-based fallback.

        Priority order:
        1. customer_item_delivery_settings with exact match
        2. customer_item_delivery_settings with delivery_place only
        3. customer_item_delivery_settings with is_default = true
        4. customer_items.shipping_document_template (fallback)

        Args:
            customer_id: Customer ID
            product_id: Product ID (will be converted to external_product_code)
            delivery_place_id: Optional delivery place ID
            jiku_code: Optional jiku code

        Returns:
            ShipmentTextResponse with shipment_text, packing_note, lead_time_days, source
        """
        # Convert product_id to external_product_code
        external_product_code = self.repository.find_external_product_code(
            customer_id=customer_id,
            product_id=product_id,
        )

        if not external_product_code:
            return ShipmentTextResponse(
                shipment_text=None,
                packing_note=None,
                lead_time_days=None,
                source="none",
            )

        # Try to find matching delivery setting
        setting = self.repository.find_matching_setting(
            customer_id=customer_id,
            external_product_code=external_product_code,
            delivery_place_id=delivery_place_id,
            jiku_code=jiku_code,
        )

        if setting:
            return ShipmentTextResponse(
                shipment_text=setting.shipment_text,
                packing_note=setting.packing_note,
                lead_time_days=setting.lead_time_days,
                source="delivery_setting",
            )

        # Fallback to customer_items.shipping_document_template
        template = self.repository.get_customer_item_template(
            customer_id=customer_id,
            external_product_code=external_product_code,
        )

        if template:
            return ShipmentTextResponse(
                shipment_text=template,
                packing_note=None,
                lead_time_days=None,
                source="customer_item",
            )

        return ShipmentTextResponse(
            shipment_text=None,
            packing_note=None,
            lead_time_days=None,
            source="none",
        )

    def list_by_customer_item(
        self,
        customer_id: int,
        external_product_code: str,
    ) -> list[CustomerItemDeliverySettingResponse]:
        """List all settings for a customer item."""
        settings = self.repository.find_by_customer_item(
            customer_id=customer_id,
            external_product_code=external_product_code,
        )
        return [CustomerItemDeliverySettingResponse.model_validate(s) for s in settings]

    def create(
        self,
        data: CustomerItemDeliverySettingCreate,
    ) -> CustomerItemDeliverySettingResponse:
        """Create a new delivery setting."""
        setting = CustomerItemDeliverySetting(
            customer_id=data.customer_id,
            external_product_code=data.external_product_code,
            delivery_place_id=data.delivery_place_id,
            jiku_code=data.jiku_code,
            shipment_text=data.shipment_text,
            packing_note=data.packing_note,
            lead_time_days=data.lead_time_days,
            is_default=data.is_default,
            valid_from=data.valid_from,
            valid_to=data.valid_to,
        )
        self.repository.create(setting)
        self.db.commit()
        self.db.refresh(setting)
        return CustomerItemDeliverySettingResponse.model_validate(setting)

    def update(
        self,
        setting_id: int,
        data: CustomerItemDeliverySettingUpdate,
    ) -> CustomerItemDeliverySettingResponse | None:
        """Update an existing delivery setting."""
        setting = self.repository.find_by_id(setting_id)
        if not setting:
            return None

        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(setting, key, value)

        self.db.commit()
        self.db.refresh(setting)
        return CustomerItemDeliverySettingResponse.model_validate(setting)

    def delete(self, setting_id: int) -> bool:
        """Delete a delivery setting."""
        setting = self.repository.find_by_id(setting_id)
        if not setting:
            return False

        self.repository.delete(setting)
        self.db.commit()
        return True
