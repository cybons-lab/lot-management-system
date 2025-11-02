# backend/app/schemas/__init__.py
"""
Schemas Package
Pydantic スキーマの集約
"""

from .admin import (
    DashboardStatsResponse,
    FullSampleDataRequest,
)
from .base import BaseSchema, ResponseBase, TimestampMixin

# 🔽 [修正] Forecastスキーマのインポート
from .forecast import (
    ForecastActivateRequest,
    ForecastActivateResponse,
    ForecastBase,
    ForecastBulkImportRequest,
    ForecastBulkImportResponse,
    ForecastCreate,
    ForecastItemOut,  # 🔽 [追加]
    ForecastListResponse,  # 🔽 [追加]
    ForecastMatchRequest,
    ForecastMatchResponse,
    ForecastMatchResult,
    ForecastResponse,
    ForecastUpdate,
    ForecastVersionInfo,
    ForecastVersionListResponse,
)
from .integration import (
    # OCR
    OcrOrderRecord,
    OcrSubmissionRequest,
    OcrSubmissionResponse,
    SapRegisterOptions,
    SapRegisterRequest,
    SapRegisterResponse,
    # SAP
    SapRegisterTarget,
    SapSyncLogResponse,
)
from .inventory import (
    # ExpiryRule
    ExpiryRuleBase,
    ExpiryRuleCreate,
    ExpiryRuleResponse,
    ExpiryRuleUpdate,
    # Lot
    LotBase,
    LotCreate,
    # LotCurrentStock
    LotCurrentStockResponse,
    LotResponse,
    LotUpdate,
    ReceiptCreateRequest,
    # Receipt
    ReceiptHeaderBase,
    ReceiptHeaderCreate,
    ReceiptHeaderResponse,
    ReceiptLineBase,
    ReceiptLineCreate,
    ReceiptLineResponse,
    ReceiptResponse,
    # StockMovement
    StockMovementBase,
    StockMovementCreate,
    StockMovementResponse,
)
from .masters import (
    # Customer
    CustomerBase,
    CustomerCreate,
    CustomerResponse,
    CustomerUpdate,
    # Product
    ProductBase,
    ProductCreate,
    ProductResponse,
    # ProductUomConversion
    ProductUomConversionBase,
    ProductUomConversionCreate,
    ProductUomConversionResponse,
    ProductUomConversionUpdate,
    ProductUpdate,
    # Supplier
    SupplierBase,
    SupplierCreate,
    SupplierResponse,
    SupplierUpdate,
    # Warehouse (Old)
    WarehouseBase,
    WarehouseCreate,
    WarehouseResponse,
    WarehouseUpdate,
)
from .orders import (
    # Allocation
    AllocationBase,
    AllocationCancelRequest,
    AllocationCancelResponse,
    AllocationCreate,
    AllocationResponse,
    DragAssignRequest,
    DragAssignResponse,
    LotAllocationRequest,
    LotAllocationResponse,
    LotCandidateOut,
    # Order
    OrderBase,
    OrderCreate,
    # OrderLine
    OrderLineBase,
    OrderLineCreate,
    OrderLineOut,
    OrderLineResponse,
    OrderResponse,
    OrdersWithAllocResponse,
    OrderUpdate,
    OrderWithLinesResponse,
    # PurchaseRequest
    PurchaseRequestBase,
    PurchaseRequestCreate,
    PurchaseRequestResponse,
    PurchaseRequestUpdate,
    SaveAllocationsRequest,
    # Shipping
    ShippingBase,
    ShippingCreate,
    ShippingResponse,
    ShippingUpdate,
    # warehouse allocation
    WarehouseAllocIn,
    WarehouseAllocOut,
)

# 🔽 [追加] 新しい倉庫スキーマ
from .warehouses import WarehouseListResponse, WarehouseOut

__all__ = [
    # Base
    "BaseSchema",
    "TimestampMixin",
    "ResponseBase",
    # Masters
    "WarehouseBase",
    "WarehouseCreate",
    "WarehouseUpdate",
    "WarehouseResponse",
    "SupplierBase",
    "SupplierCreate",
    "SupplierUpdate",
    "SupplierResponse",
    "CustomerBase",
    "CustomerCreate",
    "CustomerUpdate",
    "CustomerResponse",
    "ProductBase",
    "ProductCreate",
    "ProductUpdate",
    "ProductResponse",
    "ProductUomConversionBase",
    "ProductUomConversionCreate",
    "ProductUomConversionUpdate",
    "ProductUomConversionResponse",
    # Inventory
    "LotBase",
    "LotCreate",
    "LotUpdate",
    "LotResponse",
    "StockMovementBase",
    "StockMovementCreate",
    "StockMovementResponse",
    "LotCurrentStockResponse",
    "ReceiptHeaderBase",
    "ReceiptHeaderCreate",
    "ReceiptHeaderResponse",
    "ReceiptLineBase",
    "ReceiptLineCreate",
    "ReceiptLineResponse",
    "ReceiptCreateRequest",
    "ReceiptResponse",
    "ExpiryRuleBase",
    "ExpiryRuleCreate",
    "ExpiryRuleUpdate",
    "ExpiryRuleResponse",
    # Sales (orders)
    "OrderBase",
    "OrderCreate",
    "OrderUpdate",
    "OrderResponse",
    "OrderWithLinesResponse",
    "OrderLineBase",
    "OrderLineCreate",
    "OrderLineResponse",
    "AllocationBase",
    "AllocationCreate",
    "AllocationResponse",
    "DragAssignRequest",
    "DragAssignResponse",
    "ShippingBase",
    "ShippingCreate",
    "ShippingUpdate",
    "ShippingResponse",
    "PurchaseRequestBase",
    "PurchaseRequestCreate",
    "PurchaseRequestUpdate",
    "PurchaseRequestResponse",
    # Integration
    "OcrOrderRecord",
    "OcrSubmissionRequest",
    "OcrSubmissionResponse",
    "SapRegisterTarget",
    "SapRegisterOptions",
    "SapRegisterRequest",
    "SapRegisterResponse",
    "SapSyncLogResponse",
    # Admin
    "FullSampleDataRequest",
    "DashboardStatsResponse",
    # 🔽 [修正] Forecastスキーマ
    "ForecastBase",
    "ForecastCreate",
    "ForecastUpdate",
    "ForecastResponse",
    "ForecastBulkImportRequest",
    "ForecastBulkImportResponse",
    "ForecastMatchRequest",
    "ForecastMatchResponse",
    "ForecastMatchResult",
    "ForecastVersionInfo",
    "ForecastVersionListResponse",
    "ForecastActivateRequest",
    "ForecastActivateResponse",
    "ForecastItemOut",  # 🔽 [追加]
    "ForecastListResponse",  # 🔽 [追加]
    # 🔽 [追加] Warehouse Allocation Schemas
    "WarehouseOut",
    "WarehouseListResponse",
    "WarehouseAllocIn",
    "WarehouseAllocOut",
    "OrderLineOut",
    "OrdersWithAllocResponse",
    "SaveAllocationsRequest",
    "LotCandidateOut",
    "LotAllocationRequest",
    "LotAllocationResponse",
    "AllocationCancelRequest",
    "AllocationCancelResponse",
]
