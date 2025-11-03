# backend/app/models/__init__.py
"""
Models Package

この__init__.pyは、app.modelsパッケージの「窓口」として機能します。
各ファイルで定義されたモデルクラスをインポートし、
他のモジュール(APIルートなど)が
`from app.models import Lot, Order, Product`
のように簡単にアクセスできるようにします。
"""

# 1. 共通のBaseをインポートする
from .base_model import Base

# 2. 各ドメインのモデルをすべてインポートする
from .masters import (
    Customer,
    Product,
    ProductUomConversion,
    Supplier,
    UnitConversion,
    Warehouse,  # 統合された新Warehouse
)
from .inventory import (
    ExpiryRule,
    Lot,
    LotCurrentStock,
    ReceiptHeader,
    ReceiptLine,
    StockMovement,
    StockMovementReason,
)
from .orders import (
    Allocation,
    Order,
    OrderLine,
    OrderLineWarehouseAllocation,  # orders.pyから直接インポート
    NextDivMap,
    PurchaseRequest,
    Shipping,
)
from .logs import InboundSubmission, OcrSubmission, SapSyncLog
from .forecast import (
    Forecast,
)

# 3. 外部に公開するモデルを明示
__all__ = [
    "Base",
    # Masters
    "Warehouse",
    "Supplier",
    "Customer",
    "Product",
    "ProductUomConversion",
    "UnitConversion",
    # Inventory
    "Lot",
    "StockMovement",
    "StockMovementReason",
    "LotCurrentStock",
    "ReceiptHeader",
    "ReceiptLine",
    "ExpiryRule",
    # Sales/Orders
    "Order",
    "OrderLine",
    "OrderLineWarehouseAllocation",
    "Allocation",
    "Shipping",
    "PurchaseRequest",
    "NextDivMap",
    # Logs
    "InboundSubmission",
    "OcrSubmission",
    "SapSyncLog",
    # Forecast
    "Forecast",
]
