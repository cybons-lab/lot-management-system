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

    def find_by_customer_item(
        self,
        customer_item_id: int,
    ) -> list[CustomerItemDeliverySetting]:
        """Find all settings for a customer item."""
        from sqlalchemy.orm import joinedload

        stmt = (
            select(CustomerItemDeliverySetting)
            .options(joinedload(CustomerItemDeliverySetting.delivery_place))
            .where(
                CustomerItemDeliverySetting.customer_item_id == customer_item_id,
            )
        )
        return list(self.db.execute(stmt).scalars().all())

    def find_matching_setting(
        self,
        customer_item_id: int,
        delivery_place_id: int | None = None,
        jiku_code: str | None = None,
    ) -> CustomerItemDeliverySetting | None:
        """Find a setting matching the given criteria with priority.

        Priority order:
        1. Exact match (delivery_place_id + jiku_code)
        2. Delivery place only match
        3. Default setting (is_default = true)
        """
        # 1. Exact match
        if delivery_place_id is not None or jiku_code is not None:
            stmt = select(CustomerItemDeliverySetting).where(
                CustomerItemDeliverySetting.customer_item_id == customer_item_id,
                CustomerItemDeliverySetting.delivery_place_id == delivery_place_id,
                CustomerItemDeliverySetting.jiku_code == jiku_code,
            )
            result = self.db.execute(stmt).scalar_one_or_none()
            if result:
                return cast(CustomerItemDeliverySetting, result)

        # 2. Delivery place only match
        if delivery_place_id is not None:
            stmt = select(CustomerItemDeliverySetting).where(
                CustomerItemDeliverySetting.customer_item_id == customer_item_id,
                CustomerItemDeliverySetting.delivery_place_id == delivery_place_id,
                CustomerItemDeliverySetting.jiku_code.is_(None),
            )
            result = self.db.execute(stmt).scalar_one_or_none()
            if result:
                return cast(CustomerItemDeliverySetting, result)

        # 3. Default setting
        stmt = select(CustomerItemDeliverySetting).where(
            CustomerItemDeliverySetting.customer_item_id == customer_item_id,
            CustomerItemDeliverySetting.is_default.is_(True),
        )
        return cast(
            CustomerItemDeliverySetting | None,
            self.db.execute(stmt).scalar_one_or_none(),
        )

    def get_customer_item_template(
        self,
        customer_item_id: int,
    ) -> str | None:
        """Get the shipping_document_template from customer_items as fallback."""
        stmt = select(CustomerItem.shipping_document_template).where(
            CustomerItem.id == customer_item_id,
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
