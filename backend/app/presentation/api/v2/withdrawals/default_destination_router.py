"""
Default Destination Router.

GET /api/v2/withdrawals/default-destination
Lookup customer and delivery place based on product_id from customer_items and
customer_item_delivery_settings tables.
"""

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import and_, select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.infrastructure.persistence.models.masters_models import (
    Customer,
    CustomerItem,
    CustomerItemDeliverySetting,
    DeliveryPlace,
)


router = APIRouter(prefix="/v2/withdrawals", tags=["withdrawals"])


class DefaultDestinationResponse(BaseModel):
    """Response model for default destination lookup."""

    customer_id: int | None = None
    customer_code: str | None = None
    customer_name: str | None = None
    delivery_place_id: int | None = None
    delivery_place_code: str | None = None
    delivery_place_name: str | None = None
    mapping_found: bool = False
    message: str | None = None


@router.get("/default-destination", response_model=DefaultDestinationResponse)
def get_default_destination(
    product_id: int = Query(..., description="製品ID"),
    supplier_id: int | None = Query(None, description="仕入先ID (任意)"),
    db: Session = Depends(get_db),
) -> DefaultDestinationResponse:
    """
    製品IDからデフォルトの得意先・納入先を取得する.

    1. customer_items テーブルから product_id でマッピングを検索
    2. 見つかれば customer_id を取得
    3. customer_item_delivery_settings の is_default=True レコードから delivery_place_id を取得
    4. マッピングが無い場合は mapping_found=False を返す
    """
    # Step 1: Find CustomerItem by product_id
    query = select(CustomerItem).where(CustomerItem.product_id == product_id)
    if supplier_id is not None:
        query = query.where(CustomerItem.supplier_id == supplier_id)

    customer_item = db.execute(query).scalars().first()

    if not customer_item:
        return DefaultDestinationResponse(
            mapping_found=False,
            message=f"product_id={product_id} のマッピングが見つかりません",
        )

    # Step 2: Get Customer info
    customer = db.get(Customer, customer_item.customer_id)
    if not customer:
        return DefaultDestinationResponse(
            mapping_found=False,
            message=f"customer_id={customer_item.customer_id} が見つかりません",
        )

    # Step 3: Find default delivery settings
    delivery_query = select(CustomerItemDeliverySetting).where(
        and_(
            CustomerItemDeliverySetting.customer_id == customer_item.customer_id,
            CustomerItemDeliverySetting.external_product_code
            == customer_item.external_product_code,
            CustomerItemDeliverySetting.is_default == True,  # noqa: E712
        )
    )
    delivery_setting = db.execute(delivery_query).scalars().first()

    delivery_place_id = None
    delivery_place_code = None
    delivery_place_name = None

    if delivery_setting and delivery_setting.delivery_place_id:
        delivery_place = db.get(DeliveryPlace, delivery_setting.delivery_place_id)
        if delivery_place:
            delivery_place_id = delivery_place.id
            delivery_place_code = delivery_place.delivery_place_code
            delivery_place_name = delivery_place.delivery_place_name

    return DefaultDestinationResponse(
        customer_id=customer.id,
        customer_code=customer.customer_code,
        customer_name=customer.customer_name,
        delivery_place_id=delivery_place_id,
        delivery_place_code=delivery_place_code,
        delivery_place_name=delivery_place_name,
        mapping_found=True,
        message=None,
    )
