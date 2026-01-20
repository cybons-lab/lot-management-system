"""SQLAlchemy models for the Lot Management System.

All models strictly follow the DDL v2.2
(lot_management_ddl_v2_2_id.sql). Legacy models have been removed.

B-Plan additions:
- LotMaster: Lot number consolidation master
- LotReceipt: Individual inbound receipts (replaces Lot)
- WithdrawalLine: FIFO withdrawal tracking
- MissingMappingEvent: Auto-set failure recording
"""

from .assignments.assignment_models import UserSupplierAssignment
from .auth_models import Role, User, UserRole
from .base_model import Base
from .calendar_models import CompanyCalendar, HolidayCalendar, OriginalDeliveryCalendar
from .cloud_flow_models import CloudFlowConfig, CloudFlowJob, CloudFlowJobStatus
from .forecast_models import Forecast, ForecastCurrent, ForecastHistory
from .inbound_models import ExpectedLot, InboundPlan, InboundPlanLine, InboundPlanStatus
from .inventory_models import (
    Adjustment,
    AdjustmentType,
    AllocationSuggestion,
    AllocationTrace,
    LotOriginType,
    StockHistory,  # Backward compatibility alias
    StockMovement,
    StockMovementReason,  # Backward compatibility alias
    StockTransactionType,
)
from .layer_code_models import LayerCodeMapping
from .logs_models import BatchJob, BusinessRule, MasterChangeLog, OperationLog, ServerLog

# B-Plan models
from .lot_master_model import LotMaster
from .lot_receipt_models import LotReceipt

# Backward compatibility: Lot is now an alias for LotReceipt
# All existing code using Lot will work with the new lot_receipts table
from .lot_reservation_history_model import HistoryOperation, LotReservationHistory
from .lot_reservations_model import (
    LotReservation,
    ReservationSourceType,
    ReservationStateMachine,
    ReservationStatus,
)
from .masters_models import (
    Customer,
    CustomerItem,
    CustomerItemDeliverySetting,
    DeliveryPlace,
    Product,
    ProductMapping,
    ProductUomConversion,
    Supplier,
    SupplierItem,
    Warehouse,
    WarehouseDeliveryRoute,
)
from .missing_mapping_model import MissingMappingEvent
from .order_groups_models import OrderGroup
from .orders_models import Order, OrderLine
from .product_supplier_models import ProductSupplier
from .product_warehouse_model import ProductWarehouse
from .rpa_models import RpaRun, RpaRunItem, RpaRunStatus
from .seed_snapshot_model import SeedSnapshot
from .smartread_models import SmartReadConfig
from .soft_delete_mixin import INFINITE_VALID_TO, SoftDeleteMixin
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
from .withdrawal_line_model import WithdrawalLine
from .withdrawal_models import Withdrawal, WithdrawalCancelReason, WithdrawalType


__all__ = [
    # Base
    "Base",
    # Soft Delete
    "SoftDeleteMixin",
    "INFINITE_VALID_TO",
    # Masters
    "Warehouse",
    "Supplier",
    "SupplierItem",
    "Customer",
    "DeliveryPlace",
    "Product",
    "ProductUomConversion",
    "CustomerItem",
    "CustomerItemDeliverySetting",
    "ProductMapping",
    "WarehouseDeliveryRoute",
    # Inventory
    "LotReceipt",
    "LotOriginType",
    "StockMovement",
    "StockHistory",
    "StockTransactionType",
    "Adjustment",
    "AdjustmentType",
    "AllocationSuggestion",
    "AllocationTrace",
    "Withdrawal",
    "WithdrawalType",
    "WithdrawalCancelReason",
    # Reservations
    "LotReservation",
    "ReservationSourceType",
    "ReservationStateMachine",
    "ReservationStatus",
    # Reservation History (Audit)
    "LotReservationHistory",
    "HistoryOperation",
    # Orders
    "Order",
    "OrderLine",
    "OrderGroup",
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
    "HolidayCalendar",
    "CompanyCalendar",
    "OriginalDeliveryCalendar",
    "ProductSupplier",
    "ProductWarehouse",
    # Logs
    "OperationLog",
    "ServerLog",
    "ServerLog",
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
    "StockHistory",
    "StockMovementReason",
    # RPA
    "RpaRun",
    "RpaRunItem",
    "RpaRunStatus",
    # Cloud Flow
    "CloudFlowConfig",
    "CloudFlowJob",
    "CloudFlowJobStatus",
    # Layer Code
    "LayerCodeMapping",
    # SmartRead
    "SmartReadConfig",
    # B-Plan models
    "LotMaster",
    "LotReceipt",
    "WithdrawalLine",
    "MissingMappingEvent",
]
