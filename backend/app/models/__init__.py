"""SQLAlchemy models for the Lot Management System.

All models strictly follow the DDL v2.2 (lot_management_ddl_v2_2_id.sql).
Legacy models have been removed.
"""

from .auth_models import Role, User, UserRole
from .base_model import Base
from .forecast_models import Forecast, ForecastHeader, ForecastLine, ForecastStatus
from .inbound_models import ExpectedLot, InboundPlan, InboundPlanLine, InboundPlanStatus
from .inventory_models import (
    Adjustment,
    AdjustmentType,
    AllocationSuggestion,
    InventoryItem,
    Lot,
    LotCurrentStock,  # Backward compatibility alias
    StockHistory,
    StockMovement,  # Backward compatibility alias
    StockMovementReason,  # Backward compatibility alias
    StockTransactionType,
)
from .logs_models import BatchJob, BusinessRule, MasterChangeLog, OperationLog
from .masters_models import (
    Customer,
    CustomerItem,
    DeliveryPlace,
    Product,
    Supplier,
    Warehouse,
)
from .orders_models import Allocation, Order, OrderLine
from .seed_snapshot_model import SeedSnapshot
from .system_config_model import SystemConfig
from .views_models import (
    LotDetails,
    VCandidateLotsByOrderLine,
    VLotAvailableQty,
    VLotDetails,
    VOrderLineContext,
)


__all__ = [
    # Base
    "Base",
    # Masters
    "Warehouse",
    "Supplier",
    "Customer",
    "DeliveryPlace",
    "Product",
    "CustomerItem",
    # Inventory
    "Lot",
    "StockHistory",
    "StockTransactionType",
    "Adjustment",
    "AdjustmentType",
    "InventoryItem",
    "AllocationSuggestion",
    # Orders
    "Order",
    "OrderLine",
    "Allocation",
    # Forecast
    "ForecastHeader",
    "ForecastLine",
    "ForecastStatus",
    "Forecast",  # Backward compatibility alias
    # Inbound
    "InboundPlan",
    "InboundPlanLine",
    "InboundPlanStatus",
    "ExpectedLot",
    # Auth
    "User",
    "Role",
    "UserRole",
    # Logs
    "OperationLog",
    "MasterChangeLog",
    "BusinessRule",
    "BatchJob",
    # System
    "SystemConfig",
    "SeedSnapshot",
    # Views (read-only)
    "VLotAvailableQty",
    "VOrderLineContext",
    "VCandidateLotsByOrderLine",
    "VLotDetails",
    "LotDetails",  # Deprecated alias
    # Backward compatibility aliases
    "StockMovement",
    "StockMovementReason",
    "LotCurrentStock",
]
