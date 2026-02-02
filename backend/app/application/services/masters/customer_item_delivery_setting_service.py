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
        supplier_item_id: int,
        delivery_place_id: int | None = None,
        jiku_code: str | None = None,
    ) -> ShipmentTextResponse:
        """Get shipment text with priority-based fallback.

        Priority order:
        1. customer_item_delivery_settings with exact match
        2. customer_item_delivery_settings with delivery_place only
        3. customer_item_delivery_settings with is_default = true

        Args:
            customer_id: Customer ID
            supplier_item_id: Product ID (will be converted to customer_part_no)
            delivery_place_id: Optional delivery place ID
            jiku_code: Optional jiku code

        Returns:
            ShipmentTextResponse with shipment_text, packing_note, lead_time_days, source
        """
        # Convert product_group_id to customer_part_no
        customer_part_no = self.repository.find_customer_part_no(
            customer_id=customer_id,
            supplier_item_id=supplier_item_id,
        )

        if not customer_part_no:
            return ShipmentTextResponse(
                shipment_text=None,
                packing_note=None,
                lead_time_days=None,
                source="none",
            )

        # Try to find matching delivery setting
        setting = self.repository.find_matching_setting(
            customer_id=customer_id,
            customer_part_no=customer_part_no,
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

        return ShipmentTextResponse(
            shipment_text=None,
            packing_note=None,
            lead_time_days=None,
            source="none",
        )

    def list_all(self) -> list[CustomerItemDeliverySettingResponse]:
        """List all delivery settings for export."""
        settings = self.db.query(CustomerItemDeliverySetting).all()
        return [CustomerItemDeliverySettingResponse.model_validate(s) for s in settings]

    def list_by_customer_item_id(
        self,
        customer_item_id: int,
    ) -> list[CustomerItemDeliverySettingResponse]:
        """List all settings for a customer item by ID."""
        settings = self.repository.find_by_customer_item_id(customer_item_id)
        return [CustomerItemDeliverySettingResponse.model_validate(s) for s in settings]

    def create(
        self,
        data: CustomerItemDeliverySettingCreate,
    ) -> CustomerItemDeliverySettingResponse:
        """Create a new delivery setting."""
        # Use SSOT: data.customer_item_id is available from schema
        setting = CustomerItemDeliverySetting(
            customer_item_id=data.customer_item_id,
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
