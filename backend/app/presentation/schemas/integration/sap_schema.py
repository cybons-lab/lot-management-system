"""SAP Integration schemas."""

from pydantic import BaseModel, Field


class SAPOrderRegistrationRequest(BaseModel):
    """Request schema for SAP order registration."""

    order_ids: list[int] = Field(..., description="List of Order IDs to register")


class SAPOrderRegistrationResult(BaseModel):
    """Result for a single order registration."""

    order_id: int
    sap_order_no: str
    status: str


class SAPOrderRegistrationResponse(BaseModel):
    """Response schema for SAP order registration."""

    status: str
    registered_count: int
    results: list[SAPOrderRegistrationResult]
