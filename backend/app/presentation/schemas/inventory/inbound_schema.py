"""Pydantic schemas for inbound plans and expected lots."""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from enum import Enum

from pydantic import Field

from app.presentation.schemas.common.base import BaseSchema, TimestampMixin
from app.presentation.schemas.common.common_schema import ListResponse


class InboundPlanStatus(str, Enum):
    """Valid lifecycle states for inbound plans."""

    PLANNED = "planned"
    PARTIALLY_RECEIVED = "partially_received"
    RECEIVED = "received"
    CANCELLED = "cancelled"


class ExpectedLotBase(BaseSchema):
    """Shared attributes for expected lot payloads."""

    expected_lot_number: str | None = None
    expected_quantity: Decimal
    expected_expiry_date: date | None = None


class ExpectedLotCreate(ExpectedLotBase):
    """Payload for creating expected lots."""

    pass


class ExpectedLotUpdate(BaseSchema):
    """Mutable expected-lot fields."""

    expected_lot_number: str | None = None
    expected_quantity: Decimal | None = None
    expected_expiry_date: date | None = None


class ExpectedLotResponse(ExpectedLotBase, TimestampMixin):
    """Response model for expected lots."""

    id: int = Field(serialization_alias="expected_lot_id")
    inbound_plan_line_id: int


class InboundPlanLineBase(BaseSchema):
    """Shared fields for inbound plan line payloads."""

    product_group_id: int
    planned_quantity: Decimal
    unit: str


class InboundPlanLineCreate(InboundPlanLineBase):
    """Payload for creating inbound plan lines."""

    expected_lots: list[ExpectedLotCreate] | None = None


class InboundPlanLineUpdate(BaseSchema):
    """Mutable inbound plan line fields."""

    planned_quantity: Decimal | None = None
    unit: str | None = None


class InboundPlanLineResponse(InboundPlanLineBase, TimestampMixin):
    """Response model for inbound plan lines."""

    id: int = Field(serialization_alias="inbound_plan_line_id")
    inbound_plan_id: int
    expected_lots: list[ExpectedLotResponse] = Field(default_factory=list)


class InboundPlanBase(BaseSchema):
    """Shared attributes for inbound plan payloads."""

    plan_number: str
    supplier_id: int
    planned_arrival_date: date
    status: InboundPlanStatus = InboundPlanStatus.PLANNED
    notes: str | None = None


class InboundPlanCreate(InboundPlanBase):
    """Payload for registering inbound plans."""

    lines: list[InboundPlanLineCreate] | None = None


class InboundPlanUpdate(BaseSchema):
    """Mutable fields for inbound plans."""

    planned_arrival_date: date | None = None
    status: InboundPlanStatus | None = None
    notes: str | None = None


class InboundPlanResponse(InboundPlanBase, TimestampMixin):
    """Response model for inbound plans."""

    id: int = Field(serialization_alias="inbound_plan_id")
    supplier_name: str | None = None
    supplier_code: str | None = None
    total_quantity: Decimal | None = Field(
        default=None, description="Sum of planned_quantity from all lines"
    )
    is_primary_supplier: bool = False


class InboundPlanDetailResponse(InboundPlanResponse):
    """Inbound plan representation bundled with lines and expected lots."""

    lines: list[InboundPlanLineResponse] = Field(default_factory=list)


# Using generic ListResponse[T] for consistency
InboundPlanListResponse = ListResponse[InboundPlanResponse]
"""Response wrapper for inbound plan listings."""


class InboundPlanReceiveRequest(BaseSchema):
    """Payload for confirming inbound receipt."""

    received_at: datetime
    lot_numbers: dict[int, str] | None = None


class InboundPlanReceiveResponse(BaseSchema):
    """Response model returned after processing inbound receipt."""

    success: bool
    message: str | None = None
    created_lot_ids: list[int] = Field(default_factory=list)


class SAPSyncRequest(BaseSchema):
    """Payload for SAP purchase order synchronization."""

    pass  # No parameters needed for mock implementation


class SAPSyncResponse(BaseSchema):
    """Response model for SAP synchronization."""

    success: bool
    message: str
    created_plans: list[InboundPlanDetailResponse] = Field(default_factory=list)
    skipped_count: int = 0
