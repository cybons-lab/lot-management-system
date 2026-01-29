# backend/app/presentation/schemas/orders/order_group_schema.py
"""OrderGroup (受注グループ) Pydantic schemas.

業務キー: customer_id × product_group_id × order_date
"""

from __future__ import annotations

from datetime import date, datetime

from pydantic import Field

from app.presentation.schemas.common.base import BaseSchema


class OrderGroupBase(BaseSchema):
    """Base order group schema."""

    customer_id: int = Field(..., gt=0, description="得意先ID")
    product_group_id: int = Field(..., gt=0, description="製品ID")
    order_date: date = Field(..., description="受注日")
    source_file_name: str | None = Field(None, max_length=255, description="取り込み元ファイル名")


class OrderGroupCreate(OrderGroupBase):
    """Create order group request."""

    pass


class OrderGroupResponse(OrderGroupBase):
    """Order group response."""

    id: int
    created_at: datetime
    updated_at: datetime

    # Flattened info (populated by service)
    customer_code: str | None = Field(None, description="得意先コード")
    customer_name: str | None = Field(None, description="得意先名")
    product_code: str | None = Field(None, description="製品コード")
    product_name: str | None = Field(None, description="製品名")

    model_config = {"from_attributes": True}


class OrderGroupWithLinesResponse(OrderGroupResponse):
    """Order group with lines response."""

    lines: list[OrderLineResponse] = Field(default_factory=list)


# Forward reference for type checking
from app.presentation.schemas.orders.orders_schema import (  # noqa: E402
    OrderLineResponse,
)


OrderGroupWithLinesResponse.model_rebuild()
