"""Customer Item Delivery Setting repository."""

from __future__ import annotations

from typing import cast

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.infrastructure.persistence.models import CustomerItem, CustomerItemDeliverySetting


class CustomerItemDeliverySettingRepository:
    """Repository for CustomerItemDeliverySetting entities."""

    def __init__(self, db: Session):
        self.db = db

    def find_by_id(self, setting_id: int) -> CustomerItemDeliverySetting | None:
        """Find a setting by its ID."""
        return cast(
            CustomerItemDeliverySetting | None,
            self.db.get(CustomerItemDeliverySetting, setting_id),
        )

    def find_by_customer_item_id(
        self,
        customer_item_id: int,
    ) -> list[CustomerItemDeliverySetting]:
        """Find all settings for a customer item by ID."""
        from sqlalchemy.orm import joinedload

        stmt = (
            select(CustomerItemDeliverySetting)
            .options(joinedload(CustomerItemDeliverySetting.delivery_place))
            .where(CustomerItemDeliverySetting.customer_item_id == customer_item_id)
        )
        return list(self.db.execute(stmt).scalars().all())

    # Deprecated: find_by_customer_item (composite key) - can be removed if verified unused
    # User instruction says "Remove/Non-public". I will remove it to ensure no usage.

    def find_matching_setting(
        self,
        customer_id: int,
        customer_part_no: str,
        delivery_place_id: int | None = None,
        jiku_code: str | None = None,
    ) -> CustomerItemDeliverySetting | None:
        """Find a setting matching the given criteria with priority.

        Note: Uses composite key lookup for ShipmentTextRequest (order line context).
        This is intentional as the /shipment-text endpoint receives customer_id + product_group_id
        from OrderLine and needs to resolve to customer_part_no internally.
        Not part of the SSOT refactoring for CRUD operations.

        Priority order:
        1. Exact match (delivery_place_id + jiku_code)
        2. Delivery place only match
        3. Default setting (is_default = true)
        """
        # Base query joining CustomerItem
        base_query = (
            select(CustomerItemDeliverySetting)
            .join(CustomerItem)
            .where(
                CustomerItem.customer_id == customer_id,
                CustomerItem.customer_part_no == customer_part_no,
            )
        )

        # 1. Exact match
        if delivery_place_id is not None or jiku_code is not None:
            stmt = base_query.where(
                CustomerItemDeliverySetting.delivery_place_id == delivery_place_id,
                CustomerItemDeliverySetting.jiku_code == jiku_code,
            )
            result = self.db.execute(stmt).scalar_one_or_none()
            if result:
                return cast(CustomerItemDeliverySetting, result)

        # 2. Delivery place only match
        if delivery_place_id is not None:
            stmt = base_query.where(
                CustomerItemDeliverySetting.delivery_place_id == delivery_place_id,
                CustomerItemDeliverySetting.jiku_code.is_(None),
            )
            result = self.db.execute(stmt).scalar_one_or_none()
            if result:
                return cast(CustomerItemDeliverySetting, result)

        # 3. Default setting
        stmt = base_query.where(
            CustomerItemDeliverySetting.is_default.is_(True),
        )
        return cast(
            CustomerItemDeliverySetting | None,
            self.db.execute(stmt).scalar_one_or_none(),
        )

    def find_customer_part_no(
        self,
        customer_id: int,
        supplier_item_id: int,
    ) -> str | None:
        """Get customer_part_no from customer_items by customer_id and supplier_item_id.

        Phase1: product_group_id renamed to supplier_item_id.
        Note: Used by ShipmentTextRequest to convert supplier_item_id to customer_part_no.
        See find_matching_setting() for context.
        """
        stmt = select(CustomerItem.customer_part_no).where(
            CustomerItem.customer_id == customer_id,
            CustomerItem.supplier_item_id == supplier_item_id,
        )
        return cast(str | None, self.db.execute(stmt).scalar_one_or_none())

    def create(
        self,
        setting: CustomerItemDeliverySetting,
    ) -> CustomerItemDeliverySetting:
        """Create a new setting."""
        self.db.add(setting)
        self.db.flush()
        return setting

    def delete(self, setting: CustomerItemDeliverySetting) -> None:
        """Delete a setting."""
        self.db.delete(setting)
