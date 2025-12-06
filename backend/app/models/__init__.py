"""SQLAlchemy models for the Lot Management System.

All models strictly follow the DDL v2.2
(lot_management_ddl_v2_2_id.sql). Legacy models have been removed.
"""

from .assignments.assignment_models import UserSupplierAssignment
from .auth_models import Role, User, UserRole
from .base_model import Base
from .forecast_models import Forecast, ForecastCurrent, ForecastHistory
from .inbound_models import ExpectedLot, InboundPlan, InboundPlanLine, InboundPlanStatus
from .inventory_models import (
    Adjustment,
    AdjustmentType,
    AllocationSuggestion,
    AllocationTrace,
    Lot,
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
    ProductUomConversion,
    Supplier,
    Warehouse,
)
from .orders_models import Allocation, Order, OrderLine
from .product_supplier_models import ProductSupplier
from .seed_snapshot_model import SeedSnapshot
from .system_config_model import SystemConfig
from .system_models import ClientLog
from .views_models import (
    LotCurrentStock,
    LotDetails,
    VCandidateLotsByOrderLine,
    VCustomerCodeToId,
    VCustomerDailyProduct,
    VDeliveryPlaceCodeToId,
    VForecastOrderPair,
    VInventorySummary,
    VLotAvailableQty,
    VLotCurrentStock,
    VLotDetails,
    VOrderLineContext,
    VProductCodeToId,
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
    "ProductUomConversion",
    "CustomerItem",
    # Inventory
    "Lot",
    "StockHistory",
    "StockTransactionType",
    "Adjustment",
    "AdjustmentType",
    "AllocationSuggestion",
    "AllocationTrace",
    # Orders
    "Order",
    "OrderLine",
    "Allocation",
    # Forecast
    "ForecastCurrent",
    "ForecastHistory",
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
    "UserSupplierAssignment",
    "ProductSupplier",
    # Logs
    "OperationLog",
    "MasterChangeLog",
    "BusinessRule",
    "BatchJob",
    "ClientLog",
    # System
    "SystemConfig",
    "SeedSnapshot",
    # Views (read-only)
    "VLotAvailableQty",
    "VOrderLineContext",
    "VCandidateLotsByOrderLine",
    "VLotDetails",
    "LotDetails",  # Deprecated alias
    "VLotCurrentStock",
    "LotCurrentStock",  # Deprecated alias
    "VCustomerDailyProduct",
    "VCustomerCodeToId",
    "VDeliveryPlaceCodeToId",
    "VForecastOrderPair",
    "VProductCodeToId",
    "VInventorySummary",
    # Backward compatibility aliases
    "StockMovement",
    "StockMovementReason",
]
