"""Models Package."""

from .base_model import Base
from .forecast_models import Forecast, ForecastHeader, ForecastLine, ForecastStatus
from .inbound_models import ExpectedLot, InboundPlan, InboundPlanLine, InboundPlanStatus
from .inventory_models import (
    Adjustment,
    AdjustmentType,
    InventoryItem,
    Lot,
    LotCurrentStock,
    StockMovement,
    StockMovementReason,
    StockTransactionType,
)
from .logs_models import InboundSubmission, OcrSubmission, SapSyncLog
from .masters_models import Customer, DeliveryPlace, Product, Supplier, UnitConversion, Warehouse
from .orders_models import (
    Allocation,
    Order,
    OrderLine,
    OrderLineWarehouseAllocation,
    PurchaseRequest,
)
from .seed_snapshot_model import SeedSnapshot
from .views_models import (
    LotDetails,
    VCandidateLotsByOrderLine,
    VLotAvailableQty,
    VLotDetails,
    VOrderLineContext,
)


__all__ = [
    "Base",
    "Warehouse",
    "Supplier",
    "DeliveryPlace",
    "Customer",
    "Product",
    "UnitConversion",
    "Lot",
    "StockMovement",
    "StockTransactionType",
    "StockMovementReason",
    "LotCurrentStock",
    "InventoryItem",
    "Adjustment",
    "AdjustmentType",
    "ExpectedLot",
    "InboundPlan",
    "InboundPlanLine",
    "InboundPlanStatus",
    "ForecastHeader",
    "ForecastLine",
    "ForecastStatus",
    "Forecast",
    "Order",
    "OrderLine",
    "OrderLineWarehouseAllocation",
    "Allocation",
    "PurchaseRequest",
    "InboundSubmission",
    "OcrSubmission",
    "SapSyncLog",
    "SeedSnapshot",
    # Views (read-only)
    "VLotAvailableQty",
    "VOrderLineContext",
    "VCandidateLotsByOrderLine",
    "VLotDetails",
    "LotDetails",  # Deprecated alias, use VLotDetails or Lot instead
]
