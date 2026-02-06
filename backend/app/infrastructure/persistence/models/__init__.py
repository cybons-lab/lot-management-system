"""SQLAlchemy models for the Lot Management System.

All models strictly follow the actual PostgreSQL tables as the single source of truth.
Schema can be verified with: docker compose exec db-postgres pg_dump -U admin -d lot_management --schema-only

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
from .forecast_models import ForecastCurrent, ForecastHistory
from .inbound_models import ExpectedLot, InboundPlan, InboundPlanLine, InboundPlanStatus
from .inventory_models import (
    Adjustment,
    AdjustmentType,
    AllocationSuggestion,
    AllocationTrace,
    LotOriginType,
    StockMovement,
    StockTransactionType,
)
from .layer_code_models import LayerCodeMapping
from .logs_models import BatchJob, BusinessRule, MasterChangeLog, OperationLog, ServerLog
from .lot_master_model import LotMaster
from .lot_receipt_models import LotReceipt
from .lot_reservation_history_model import HistoryOperation, LotReservationHistory
from .lot_reservations_model import (
    LotReservation,
    ReservationSourceType,
    ReservationStateMachine,
    ReservationStatus,
)
from .maker_models import Maker
from .masters_models import (
    Customer,
    CustomerItem,
    CustomerItemDeliverySetting,
    CustomerItemJikuMapping,
    DeliveryPlace,
    ProductMapping,
    ProductUomConversion,
    Supplier,
    Warehouse,
    WarehouseDeliveryRoute,
)
from .material_order_forecast_models import MaterialOrderForecast
from .missing_mapping_model import MissingMappingEvent
from .order_groups_models import OrderGroup
from .orders_models import Order, OrderLine
from .product_warehouse_model import ProductWarehouse
from .rpa_models import (
    RpaRun,
    RpaRunEvent,
    RpaRunFetch,
    RpaRunGroup,
    RpaRunItem,
    RpaRunItemAttempt,
    RpaRunStatus,
)
from .sap_models import SapConnection, SapFetchLog, SapMaterialCache
from .seed_snapshot_model import SeedSnapshot
from .shipping_master_models import OrderRegisterRow, ShippingMasterCurated, ShippingMasterRaw
from .smartread_models import OcrResultEdit, SmartReadConfig, SmartReadPadRun
from .soft_delete_mixin import INFINITE_VALID_TO, SoftDeleteMixin
from .supplier_item_model import SupplierItem
from .system_config_model import SystemConfig
from .system_models import ClientLog
from .views_models import (
    VCandidateLotsByOrderLine,
    VCustomerCodeToId,
    VCustomerDailyProduct,
    VDeliveryPlaceCodeToId,
    VForecastOrderPair,
    VInventorySummary,
    VLotAvailableQty,
    VLotCurrentStock,
    VLotDetails,
    VMaterialOrderForecast,
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
    "Customer",
    "DeliveryPlace",
    "SupplierItem",
    "ProductUomConversion",
    "CustomerItem",
    "CustomerItemDeliverySetting",
    "CustomerItemJikuMapping",
    "ProductMapping",
    "WarehouseDeliveryRoute",
    "Maker",
    "MaterialOrderForecast",
    # Inventory
    "LotMaster",
    "LotReceipt",
    "LotOriginType",
    "StockMovement",
    "StockTransactionType",
    "Adjustment",
    "AdjustmentType",
    "AllocationSuggestion",
    "AllocationTrace",
    "ProductWarehouse",
    "Withdrawal",
    "WithdrawalType",
    "WithdrawalCancelReason",
    "WithdrawalLine",
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
    # Calendar
    "HolidayCalendar",
    "CompanyCalendar",
    "OriginalDeliveryCalendar",
    # Logs
    "OperationLog",
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
    "VLotCurrentStock",
    "VCustomerDailyProduct",
    "VCustomerCodeToId",
    "VDeliveryPlaceCodeToId",
    "VForecastOrderPair",
    "VProductCodeToId",
    "VInventorySummary",
    "VMaterialOrderForecast",
    # RPA
    "RpaRun",
    "RpaRunGroup",
    "RpaRunEvent",
    "RpaRunFetch",
    "RpaRunItem",
    "RpaRunItemAttempt",
    "RpaRunStatus",
    # Cloud Flow
    "CloudFlowConfig",
    "CloudFlowJob",
    "CloudFlowJobStatus",
    # Layer Code
    "LayerCodeMapping",
    # SmartRead
    "SmartReadConfig",
    "SmartReadPadRun",
    "OcrResultEdit",
    # Missing Mapping
    "MissingMappingEvent",
    # Shipping Master (OCR受注登録)
    "ShippingMasterRaw",
    "ShippingMasterCurated",
    "OrderRegisterRow",
    # SAP統合
    "SapConnection",
    "SapMaterialCache",
    "SapFetchLog",
]
