"""Pydantic schemas package.

Organized into feature-based subpackages:
- common/ - Base schemas and common utilities (2 files)
- masters/ - Master data schemas (4 files)
- orders/ - Order schemas (1 file)
- allocations/ - Allocation schemas (2 files)
- inventory/ - Inventory schemas (2 files)
- forecasts/ - Forecast schemas (1 file)
- integration/ - Integration schemas (1 file)
- admin/ - Admin schemas (3 files)
- system/ - System schemas (6 files)

Import schemas directly from their subpackages:
    from app.schemas.orders.orders_schema import OrderCreate, OrderResponse
    from app.schemas.masters.products_schema import ProductCreate
"""

from __future__ import annotations
