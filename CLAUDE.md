# CLAUDE.md - Lot Management System

## Project Overview

**ロット管理システム (Lot Management System) v2.0**

A full-stack inventory management system for tracking materials by lot, with automated FEFO (First Expiry First Out) allocation, OCR order intake, and automatic purchase request generation for stock shortages.

**Core Capabilities:**

- Lot-based inventory tracking with expiry date management
- Order processing with automated lot allocation
- FEFO (First Expiry First Out) allocation algorithm
- OCR integration for order intake
- Automated purchase request generation
- SAP integration support
- Multi-warehouse management

**Languages:** Japanese (主要 UI/ドキュメント), English (technical docs)

---

## Technology Stack

### Backend

- **Framework:** FastAPI 0.115.5 (Python 3.12)
- **ORM:** SQLAlchemy 2.0.36 with Alembic migrations
- **Validation:** Pydantic 2.10.1 with pydantic-settings 2.6.1
- **Server:** Uvicorn 0.32.0
- **Database:** PostgreSQL 15
- **Testing:** pytest with pytest-asyncio
- **Linting:** Ruff v0.6.9 (lint + format)
- **Code Quality:** docformatter v1.7.7, pre-commit hooks

### Frontend

- **Framework:** React 19.2.0 with TypeScript 5.9.3 (strict mode)
- **Build Tool:** Vite 7.2.0
- **CSS:** Tailwind CSS 4.1.16
- **UI Components:** shadcn/ui (Radix UI primitives)
- **State Management:** Jotai 2.15.1 (global), TanStack Query 5.90.7 (server state)
- **Forms:** react-hook-form 7.66.0 with Zod 4.1.12 validation
- **Tables:** TanStack React Table 8.21.3
- **Routing:** React Router 7.9.5
- **HTTP Client:** Axios 1.13.2 (wrapped in `services/http.ts` for error handling)
- **Testing:** MSW 2.12.0 (API mocking)
- **Linting:** ESLint 9.39.1, Prettier 3.6.2
- **Type Generation:** openapi-typescript 7.10.1

### DevOps

- **Containerization:** Docker Compose with hot reload support
- **CI/CD:** GitHub Actions (quality.yml workflow)
- **Pre-commit:** docformatter, ruff (lint + format)

---

## Architecture Overview

### Layered Architecture (Backend)

```
┌─────────────────────────────────────────┐
│  API Layer (routes/)                    │  FastAPI routers, HTTP handlers
├─────────────────────────────────────────┤
│  Service Layer (services/)              │  Business logic, transactions
├─────────────────────────────────────────┤
│  Domain Layer (domain/)                 │  Pure business rules (FEFO, etc.)
├─────────────────────────────────────────┤
│  Repository Layer (repositories/)       │  Data access abstraction
├─────────────────────────────────────────┤
│  Model Layer (models/)                  │  SQLAlchemy ORM models
└─────────────────────────────────────────┘
         │              │
    ┌────┘              └────┐
    ▼                        ▼
Schemas (I/O)          Database (PostgreSQL)
```

**Dependency Direction:** API → Services → Repositories → Models

- **Circular dependencies are prohibited**
- Schemas and domain layer are used by services
- Core layer provides cross-cutting concerns (config, db, errors, logging)

### Feature-Based Architecture (Frontend)

```
src/
├── features/         # Feature modules (orders, inventory, allocations, etc.)
│   └── orders/
│       ├── components/   # Feature-specific components
│       ├── hooks/        # Feature-specific hooks
│       ├── api.ts        # API calls
│       └── types.ts      # Feature types
├── components/
│   ├── ui/           # Generic UI components (shadcn/ui)
│   └── shared/       # Project-specific shared components
├── hooks/
│   ├── api/          # API hooks (TanStack Query)
│   ├── mutations/    # Mutation hooks
│   └── ui/           # UI state hooks
├── services/         # API client layer (Axios)
├── types/            # OpenAPI-generated types
└── utils/            # Utility functions
```

### Database Design

**Pattern:** Event-sourced inventory with real-time aggregation

Key Tables:

- **Masters:** warehouses, suppliers, customers, products, delivery_places
- **Inventory:** lots, stock_history (event log)
- **Orders:** orders, order_lines, allocations, shipping
- **Integration:** ocr_submissions, sap_sync_logs

**Important:**
- `stock_history` is an immutable event log tracking all inventory transactions.
- `lots` table is the single source of truth for inventory quantities.
- **REMOVED:** `inventory_items` table has been deprecated. Inventory summaries are now computed in real-time from `lots` using GROUP BY aggregation queries.
- Benefits: Single source of truth, no sync issues, always up-to-date data.

---

## Directory Structure

```
Lot-management-system/
├── backend/
│   ├── app/
│   │   ├── api/routes/           # API routes (feature-based subpackages)
│   │   │   ├── masters/          # Master data routers (5 files)
│   │   │   ├── orders/           # Order routers (2 files)
│   │   │   ├── allocations/      # Allocation routers (4 files)
│   │   │   ├── inventory/        # Inventory routers (4 files)
│   │   │   ├── forecasts/        # Forecast routers (2 files)
│   │   │   ├── admin/            # Admin routers (10 files)
│   │   │   ├── alerts/           # Alert routers
│   │   │   └── __init__.py       # Unified router exports
│   │   ├── services/             # Business logic layer (feature-based subpackages)
│   │   │   ├── allocation/       # Allocation services (4 files)
│   │   │   ├── seed/             # Seed data services (2 files)
│   │   │   ├── integration/      # Integration services (1 file)
│   │   │   ├── forecasts/        # Forecast services (2 files)
│   │   │   ├── inventory/        # Inventory services (4 files)
│   │   │   ├── masters/          # Master data services (2 files)
│   │   │   ├── orders/           # Order services (1 file)
│   │   │   ├── auth/             # Authentication services (2 files)
│   │   │   ├── admin/            # Admin services (3 files)
│   │   │   └── common/           # Common utilities (4 files)
│   │   ├── repositories/         # Data access layer
│   │   ├── models/               # SQLAlchemy models (13 files)
│   │   │   ├── __init__.py
│   │   │   ├── assignment_models.py
│   │   │   ├── auth_models.py
│   │   │   ├── base_model.py
│   │   │   ├── forecast_models.py
│   │   │   ├── inbound_models.py
│   │   │   ├── inventory_models.py
│   │   │   ├── logs_models.py
│   │   │   ├── masters_models.py
│   │   │   ├── orders_models.py
│   │   │   ├── seed_snapshot_model.py
│   │   │   ├── system_config_model.py
│   │   │   └── views_models.py
│   │   ├── schemas/              # Pydantic schemas (feature-based subpackages)
│   │   │   ├── common/           # Base schemas (2 files)
│   │   │   ├── masters/          # Master data schemas (4 files)
│   │   │   ├── orders/           # Order schemas (1 file)
│   │   │   ├── allocations/      # Allocation schemas (2 files)
│   │   │   ├── inventory/        # Inventory schemas (2 files)
│   │   │   ├── forecasts/        # Forecast schemas (1 file)
│   │   │   ├── integration/      # Integration schemas (1 file)
│   │   │   ├── admin/            # Admin schemas (3 files)
│   │   │   ├── system/           # System schemas (6 files)
│   │   │   └── __init__.py       # Unified schema exports
│   │   ├── domain/               # Pure business rules
│   │   │   ├── errors.py         # Domain exceptions
│   │   │   └── warehouse_and_forecast.py
│   │   ├── core/                 # Core infrastructure
│   │   │   ├── config.py         # Settings (pydantic-settings)
│   │   │   ├── database.py       # Session management
│   │   │   ├── errors.py         # Exception handlers
│   │   │   └── logging.py
│   │   ├── middleware/           # Request ID middleware
│   │   └── main.py               # FastAPI app initialization
│   ├── alembic/                  # Database migrations (3 versions)
│   ├── tests/                    # pytest test suite
│   │   ├── conftest.py           # Test fixtures
│   │   ├── api/                  # API tests
│   │   ├── integration/          # Integration tests
│   │   ├── services/             # Service tests
│   │   └── unit/                 # Unit tests
│   ├── seeds/                    # Database seed data
│   ├── data/                     # Sample JSON data
│   ├── scripts/                  # Utility scripts
│   ├── tools/                    # Code quality tools
│   ├── requirements.txt
│   ├── pyproject.toml            # Ruff configuration
│   ├── pytest.ini
│   └── Dockerfile
│
├── frontend/
│   ├── src/
│   │   ├── features/             # 13 feature modules
│   │   │   ├── admin/
│   │   │   ├── allocations/
│   │   │   ├── orders/
│   │   │   ├── inventory/
│   │   │   ├── forecast/
│   │   │   └── ...
│   │   ├── components/
│   │   │   ├── ui/               # shadcn/ui components
│   │   │   └── shared/           # Shared components
│   │   ├── hooks/
│   │   │   ├── api/              # TanStack Query hooks
│   │   │   ├── mutations/
│   │   │   └── ui/
│   │   ├── services/             # API client
│   │   ├── @types/               # Type definitions
│   │   ├── utils/                # Utilities
│   │   ├── mocks/                # MSW handlers
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   ├── tsconfig.json             # TypeScript strict mode
│   ├── vite.config.ts
│   ├── eslint.config.js
│   ├── .prettierrc
│   └── Dockerfile
│
├── docs/
│   ├── architecture/             # Architecture documentation
│   │   ├── codebase_structure.md
│   │   └── refactor_20251110.md
│   ├── schema/                   # Database schema docs
│   ├── frontend/                 # Frontend API reference
│   └── troubleshooting/          # Troubleshooting guides
│
├── tools/                        # Maintenance scripts (Python)
├── .github/workflows/
│   └── quality.yml               # CI/CD pipeline
├── .pre-commit-config.yaml
├── docker-compose.yml
├── README.md
├── SETUP_GUIDE.md
└── CLAUDE.md                     # This file
```

---

## Code Quality Standards

### Backend (Python)

#### Ruff Configuration (pyproject.toml)

```toml
[tool.ruff]
line-length = 100
target-version = "py312"

[tool.ruff.lint]
select = ["E", "F", "I", "D", "UP", "B"]
# E: pycodestyle errors
# F: Pyflakes (unused imports, variables)
# I: isort (import sorting)
# D: pydocstyle (Google style docstrings)
# UP: pyupgrade (Python version upgrades)
# B: flake8-bugbear (likely bugs)
```

**Important Ignores:**

- D100-D107: Docstring requirements relaxed (except Google style preferred)
- B008: Function calls in default arguments (FastAPI Depends pattern)
- E501: Line length (handled by formatter)

#### Naming Conventions

| Element                 | Convention        | Example                                      |
| ----------------------- | ----------------- | -------------------------------------------- |
| **Files**               | `*_suffix.py`     | `orders_router.py`, `order_service.py`       |
| **Routers**             | `*_router.py`     | `allocations_router.py`                      |
| **Services**            | `*_service.py`    | `order_service.py`, `lot_service.py`         |
| **Repositories**        | `*_repository.py` | `order_repository.py`, `stock_repository.py` |
| **Schemas**             | `*_schema.py`     | `orders_schema.py`, `admin_schema.py`        |
| **Models**              | `*_models.py`     | `orders_models.py`, `inventory_models.py`    |
| **Classes**             | PascalCase        | `OrderService`, `LotRepository`              |
| **Functions/Variables** | snake_case        | `create_order()`, `order_id`                 |
| **Constants**           | UPPER_SNAKE_CASE  | `MAX_PAGE_SIZE`, `DEFAULT_PAGE_SIZE`         |
| **Private**             | `_prefix`         | `_internal_function()`                       |

**Domain Prefixes:**

- `admin_*`: Admin functions
- `masters_*`: Master data management
- `orders_*`: Order management
- `allocations_*`: Allocation management
- `inventory_*`: Inventory management

#### Import Rules

**ALWAYS use absolute imports:**

```python
# ✅ Correct
from app.services.order_service import OrderService
from app.models.orders_models import Order
from app.schemas.orders_schema import OrderCreate

# ❌ Wrong
from ..services import OrderService
from .models import Order
```

**Import Order (Ruff I001):**

1. Standard library
2. Third-party packages (FastAPI, SQLAlchemy, etc.)
3. Application imports (`app.*`)

#### Code Quality Checks

```bash
cd backend

# Lint check
ruff check app/

# Auto-fix
ruff check app/ --fix

# Format
ruff format app/

# CI check (both)
ruff check app/ && ruff format --check app/

# Max lines check (300 lines per file)
python tools/check_max_lines.py

# Tests
pytest -q                      # All tests
pytest -k "not integration"    # Skip integration tests
```

### Frontend (TypeScript)

#### TypeScript Configuration

**Strict Mode Enabled:**

- `strict: true`
- `noUncheckedIndexedAccess: true`
- `noImplicitAny: true`
- All type errors must be resolved

#### Naming Conventions

| Element                 | Convention       | Example                                |
| ----------------------- | ---------------- | -------------------------------------- |
| **Components**          | PascalCase.tsx   | `OrderCard.tsx`, `AllocationTable.tsx` |
| **Other files**         | kebab-case.ts    | `order-service.ts`, `api-client.ts`    |
| **Components**          | PascalCase       | `OrderCard`, `PageHeader`              |
| **Hooks**               | useCamelCase     | `useOrders()`, `useOrderDetail()`      |
| **Functions/Variables** | camelCase        | `createOrder()`, `orderId`             |
| **Types/Interfaces**    | PascalCase       | `OrderResponse`, `OrderFilters`        |
| **Constants**           | UPPER_SNAKE_CASE | `MAX_ITEMS_PER_PAGE`                   |

#### Import Rules

**Use `@/` alias for src:**

```typescript
// ✅ Correct
import type { OrderResponse } from "@/types/api";
import { useOrders } from "@/features/orders/hooks";
import { Button } from "@/components/ui/button";

// Import order
import { useState } from "react"; // 1. React
import { useQuery } from "@tanstack/react-query"; // 2. External libs
import type { OrderResponse } from "@/types/api"; // 3. Internal (@/*)
import { getOrders } from "../api"; // 4. Relative
```

#### Code Quality Checks

```bash
cd frontend

# Type check
npm run typecheck

# Lint
npm run lint --max-warnings=0

# Auto-fix
npm run lint:fix

# Format
npm run format

# Format check
npm run format:check

# Circular dependency check
npx madge src --circular --extensions ts,tsx

# CI check (all)
npm run typecheck && npm run lint && npm run format:check
```

#### Barrel Exports

**Allowed:**

- `features/*/index.ts` - Public API for features
- `components/ui/*/index.ts` - UI component exports

**Discouraged (to avoid circular deps):**

- `components/shared` - Use direct imports
- `hooks/api` - Use direct imports

---

## Development Workflows

### Local Development Setup

#### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv .venv

# Activate
source .venv/bin/activate  # macOS/Linux
# or
.venv\Scripts\activate     # Windows

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Setup environment
cp .env.example .env
# Edit .env if needed

# Start server (with hot reload)
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Or run directly
python -m app.main
```

**Expected output:**

```
🚀 ロット管理システム v2.0.0 を起動しています...
📦 環境: development
💾 データベース: postgresql://admin:***@localhost:5432/lot_management
✅ データベーステーブルを作成しました
INFO:     Uvicorn running on http://0.0.0.0:8000
```

**Access points:**

- API: http://localhost:8000/api
- Swagger UI: http://localhost:8000/api/docs
- ReDoc: http://localhost:8000/api/redoc
- Health check: http://localhost:8000/api/health

#### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start dev server (with hot reload)
npm run dev

# Server starts on http://localhost:5173
```

#### Docker Compose Setup

```bash
# Start all services (with hot reload)
docker compose up --build

# With pgAdmin (ops profile)
docker compose --profile ops up --build

# Detached mode
docker compose up -d

# View logs
docker compose logs -f lot-backend
docker compose logs -f lot-frontend

# Stop
docker compose down

# Reset volumes
docker compose down -v
```

**Services:**

- Frontend: http://localhost:5173
- Backend: http://localhost:8000
- PostgreSQL: localhost:5432
- pgAdmin: http://localhost:5050 (if using --profile ops)

### Database Operations

#### Migrations (Alembic)

```bash
cd backend

# Show current version
alembic current

# Show migration history
alembic history

# Apply all migrations
alembic upgrade head

# Rollback one version
alembic downgrade -1

# Create new migration
alembic revision --autogenerate -m "description"
```

**Current migrations:**

1. `4b2a45018747` - Initial schema (base imported SQL)
2. `add_seed_snapshots_table` - Add seed snapshots logging
3. `update_order_status_constraint` - Update order status constraint

#### Database Reset (Development Only)

```bash
# Via API
curl -X POST http://localhost:8000/api/admin/reset-database

# Manual
# Restart server to recreate
```

#### Sample Data

```bash
# Load sample data
curl -X POST http://localhost:8000/api/admin/init-sample-data

# Expected: 2 warehouses, 2 suppliers, 2 customers, 3 products
```

### Pre-commit Hooks

```bash
# Install pre-commit
pip install pre-commit

# Install hooks
pre-commit install

# Run manually
pre-commit run --all-files
```

**Hooks configured:**

- `docformatter` - Format docstrings (Google style)
- `ruff` - Lint and format Python code

### API Development

#### OpenAPI Schema Validation

When renaming files or refactoring, ensure public API remains unchanged:

```bash
cd backend

# Generate baseline before changes
python openapi_diff_check.py generate baseline_openapi.json

# After changes, compare
python openapi_diff_check.py generate current_openapi.json
python openapi_diff_check.py compare baseline_openapi.json current_openapi.json

# Exit code 1 if differences found
```

#### Frontend Type Generation

```bash
cd frontend

# Generate TypeScript types from backend OpenAPI
npm run generate:api

# This creates/updates src/@types/api.d.ts
```

**Run this after backend schema changes!**

---

## Testing Practices

### Backend Testing (pytest)

**Test Structure:**

```
tests/
├── conftest.py              # Fixtures (db_session, etc.)
├── api/                     # API endpoint tests
├── integration/             # Integration tests
├── services/                # Service layer tests
└── unit/                    # Pure unit tests
```

**Key Fixtures (conftest.py):**

```python
@pytest.fixture(scope="session", autouse=True)
def setup_database():
    """Creates tables before all tests, cleanup after"""

@pytest.fixture()
def db_session() -> Session:
    """Provides transactional session with rollback"""
```

**Running Tests:**

```bash
cd backend

# All tests
pytest

# Quiet mode
pytest -q

# Skip integration tests
pytest -k "not integration"

# Stop after 5 failures
pytest --maxfail=5

# Specific test file
pytest tests/api/test_lots.py

# With coverage
pytest --cov=app --cov-report=html
```

**Test Status:** ✅ 25+ tests passing (includes regression tests for API I/O, rounding, state transitions)

### Frontend Testing (MSW)

**Mock Setup:**

- Location: `frontend/src/mocks/`
- MSW handlers for API mocking
- Test data factories

**Type Checking:**

```bash
npm run typecheck  # Must pass with 0 errors
```

---

## Common Operations

### Creating New Features

#### Backend: Add New Router

1. **Create router file:** `backend/app/api/routes/my_feature_router.py`

   ```python
   from fastapi import APIRouter, Depends
   from sqlalchemy.orm import Session
   from app.core.database import get_db

   router = APIRouter(prefix="/my-feature", tags=["my-feature"])

   @router.get("")
   def list_items(db: Session = Depends(get_db)):
       return []
   ```

2. **Create service:** `backend/app/services/my_feature_service.py`

   ```python
   from sqlalchemy.orm import Session

   class MyFeatureService:
       def __init__(self, db: Session):
           self.db = db

       def get_items(self):
           # Business logic here
           pass
   ```

3. **Create schemas:** `backend/app/schemas/my_feature_schema.py`

   ```python
   from pydantic import BaseModel

   class MyFeatureResponse(BaseModel):
       id: int
       name: str

       class Config:
           from_attributes = True
   ```

4. **Register router in main.py:**

   ```python
   from app.api.routes import my_feature_router

   app.include_router(my_feature_router.router, prefix="/api")
   ```

5. **Write tests:** `backend/tests/api/test_my_feature.py`

#### Frontend: Add New Feature

1. **Create feature module:** `frontend/src/features/my-feature/`

   ```
   my-feature/
   ├── components/
   │   └── MyFeatureList.tsx
   ├── hooks/
   │   └── useMyFeatures.ts
   ├── api.ts
   ├── types.ts
   └── index.ts
   ```

2. **API functions (api.ts):**

   ```typescript
   import { apiClient } from "@/services/api-client";
   import type { MyFeature } from "./types";

   export const getMyFeatures = async (): Promise<MyFeature[]> => {
     const { data } = await apiClient.get("/my-feature");
     return data;
   };
   ```

3. **React Query hook (hooks/useMyFeatures.ts):**

   ```typescript
   import { useQuery } from "@tanstack/react-query";
   import { http } from "@/services/http";

   export const useMyFeatures = () => {
     return useQuery({
       queryKey: ["myFeatures"],
       queryFn: async () => {
         const response = await http.get("/my-feature");
         return response.data;
       },
     });
   };
   ```

4. **Component (components/MyFeatureList.tsx):**

   ```typescript
   import { useMyFeatures } from "../hooks/useMyFeatures";

   export const MyFeatureList = () => {
     const { data, isLoading } = useMyFeatures();

     if (isLoading) return <div>Loading...</div>;

     return <div>{/* Render data */}</div>;
   };
   ```

### Debugging

#### Backend Debugging

```python
# Add logging
import logging
logger = logging.getLogger(__name__)

def my_function():
    logger.info("Processing order", extra={"order_id": 123})
    logger.error("Failed to process", exc_info=True)
```

#### Check Backend Logs

```bash
# Docker
docker compose logs -f lot-backend

# Local
# Check console output where uvicorn is running
```

#### Database Inspection

```bash
# PostgreSQL
psql -h localhost -U admin -d lot_management
.tables
.schema lots
SELECT * FROM lots;

# PostgreSQL (docker)
docker compose exec db-postgres psql -U lotuser -d lotdb
\dt
\d+ lots
SELECT * FROM lots;
```

---

## Domain Knowledge

### Key Business Rules

#### FEFO (First Expiry First Out)

Location: `backend/app/domain/`

**Algorithm:**

1. Filter lots by product and warehouse
2. Exclude lots with insufficient quantity
3. Sort by expiry date (earliest first)
4. Allocate from oldest expiring lots first

**Implementation:** Used in automatic allocation service

#### Order Status Flow

```
draft → open → part_allocated → allocated → shipped → closed
                              ↓
                         cancelled
```

**Constraints:**

- Orders can only be allocated in `open` or `part_allocated` status
- Cannot modify shipped/closed orders
- Cancellation possible before shipping

#### Stock Movement Types

| Type         | Direction | Purpose              |
| ------------ | --------- | -------------------- |
| `receipt`    | IN        | Initial lot receipt  |
| `adjustment` | IN/OUT    | Inventory adjustment |
| `allocation` | OUT       | Reserved for order   |
| `shipment`   | OUT       | Physical shipment    |
| `return`     | IN        | Customer return      |

**Immutability:** Stock movements are append-only (event sourcing)

#### Unit Conversions

- Products can have multiple UOMs (EA, CS, KG, etc.)
- Conversions stored in `product_uom_conversions`
- Example: 1 CS (case) = 12 EA (each)

### Key API Endpoints

**Updated for v2.2** (Phase 1〜4 complete - 2025-11-15)

See full API documentation: [API Reference](./docs/api_reference.md) | [Migration Guide](./docs/api_migration_guide_v2.2.md)

#### Master Data

- `GET /api/warehouses` - List warehouses (NEW: direct access)
- `GET /api/products` - List products (NEW: direct access)
- `GET /api/suppliers` - List suppliers (NEW: direct access)
- `GET /api/customers` - List customers (NEW: direct access)
- `GET /api/customer-items` - Get customer item mappings (NEW)
- `GET /api/masters/*` - Legacy master endpoints (still supported for compatibility)

#### Forecasts (ヘッダ・明細分離構造 - Phase 2 完了)

- `GET /api/forecasts/headers` - List forecast headers
- `POST /api/forecasts/headers` - Create forecast header (with lines)
- `GET /api/forecasts/headers/{id}` - Get forecast header detail (with lines)
- `PUT /api/forecasts/headers/{id}` - Update forecast header
- `DELETE /api/forecasts/headers/{id}` - Delete forecast header
- `GET /api/forecasts/headers/{id}/lines` - List forecast lines
- `POST /api/forecasts/headers/{id}/lines` - Add forecast line
- `PUT /api/forecasts/lines/{id}` - Update forecast line
- `DELETE /api/forecasts/lines/{id}` - Delete forecast line
- `POST /api/forecasts/headers/bulk-import` - Bulk import forecasts

#### Inbound Plans (入荷予定管理 - Phase 2 完了)

- `GET /api/inbound-plans` - List inbound plans
- `POST /api/inbound-plans` - Create inbound plan (with lines)
- `GET /api/inbound-plans/{id}` - Get inbound plan detail
- `PUT /api/inbound-plans/{id}` - Update inbound plan
- `DELETE /api/inbound-plans/{id}` - Delete inbound plan
- `GET /api/inbound-plans/{id}/lines` - List inbound plan lines
- `POST /api/inbound-plans/{id}/lines` - Add inbound plan line
- `POST /api/inbound-plans/{id}/receive` - **Record inbound receipt (auto-generate lots)**

#### Lots & Inventory

- `GET /api/lots?with_stock=true` - List lots with current stock
- `POST /api/lots` - Register new lot
- `GET /api/lots/{id}` - Get lot detail
- `PUT /api/lots/{id}` - Update lot
- `DELETE /api/lots/{id}` - Delete lot
- `GET /api/inventory-items` - **Get inventory summary (aggregated from lots in real-time)**
- `GET /api/inventory-items/{product_id}/{warehouse_id}` - **Get inventory summary detail (aggregated from lots)**
- `GET /api/adjustments` - **Get adjustment history (NEW - Phase 2)**
- `POST /api/adjustments` - **Record inventory adjustment (NEW - Phase 2)**

**Note:** The `inventory_items` table has been removed. Inventory summaries are now computed in real-time from the `lots` table using GROUP BY aggregation queries. This ensures a single source of truth and eliminates synchronization issues.

#### Orders

- `GET /api/orders` - List orders (supports filters)
- `POST /api/orders` - Create order
- `GET /api/orders/{id}` - Get order with lines
- `PATCH /api/orders/{id}/status` - Update order status
- `DELETE /api/orders/{id}` - Delete/cancel order

#### Allocations (リファクタ版 - Phase 3 完了)

- `POST /api/allocations/commit` - **Commit allocation (NEW - v2.2.1)**
- `DELETE /api/allocations/{id}` - Cancel allocation
- `GET /api/allocation-candidates` - **Get candidate lots (NEW - Phase 3)**
- `GET /api/allocation-suggestions` - **Get allocation suggestions (NEW - Phase 4)**
- `POST /api/allocation-suggestions/manual` - **Manual allocation (NEW - Phase 3)**
- `POST /api/allocation-suggestions/fefo` - **FEFO allocation preview (NEW - Phase 3)**

**Deprecated** (移行期限: 2026-02-15):

- `POST /api/allocations/drag-assign` → Use `/allocation-suggestions/manual`
- `POST /api/allocations/preview` → Use `/allocation-suggestions/fefo`
- `POST /api/allocations/orders/{id}/allocate` → Use `/allocations/commit`
- `GET /api/allocations/candidate-lots` → Use `/allocation-candidates`

#### Users & Roles (Phase 3 完了)

- `GET /api/users` - List users (NEW)
- `POST /api/users` - Create user (NEW)
- `GET /api/users/{id}` - Get user detail (NEW)
- `PUT /api/users/{id}` - Update user (NEW)
- `DELETE /api/users/{id}` - Delete user (NEW)
- `PATCH /api/users/{id}/roles` - Assign roles to user (NEW)
- `GET /api/roles` - List roles (NEW)
- `POST /api/roles` - Create role (NEW)

#### Admin & Logs (Phase 4 完了)

- `GET /api/operation-logs` - **Get operation logs (NEW - Phase 4)**
- `GET /api/business-rules` - **Get business rules (NEW - Phase 4)**
- `PUT /api/business-rules/{code}` - **Update business rule (NEW - Phase 4)**
- `GET /api/batch-jobs` - **Get batch jobs (NEW - Phase 4)**
- `POST /api/batch-jobs/{id}/execute` - **Execute batch job (NEW - Phase 4)**

#### Integration

- `POST /api/integration/ai-ocr/submit` - Submit OCR order
- `POST /api/integration/sap/register` - Register to SAP (mock)

#### Admin

- `GET /api/admin/health` - Health check with details
- `POST /api/admin/reset-database` - Reset DB (dev only)
- `POST /api/admin/init-sample-data` - Load sample data

---

## Important Files & Configurations

### Backend Configuration

**Settings:** `backend/app/core/config.py`

```python
class Settings(BaseSettings):
    APP_NAME: str = "ロット管理システム"
    APP_VERSION: str = "2.0.0"
    ENVIRONMENT: str = "development"
    DATABASE_URL: str

    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:5173", ...]

    # Pagination
    DEFAULT_PAGE_SIZE: int = 100
    MAX_PAGE_SIZE: int = 1000

    # Alert thresholds
    ALERT_EXPIRY_CRITICAL_DAYS: int = 30
    ALERT_EXPIRY_WARNING_DAYS: int = 60
```

**Database Session:** `backend/app/core/database.py`

```python
def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency for database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

**Error Handlers:** `backend/app/core/errors.py`

- HTTP exception handler
- Validation exception handler
- Domain exception handler
- Generic exception handler

### Frontend Configuration

**Vite Config:** `frontend/vite.config.ts`

```typescript
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  server: {
    host: true,
    port: 5173,
    proxy: {
      "/api": {
        target: process.env.VITE_BACKEND_ORIGIN || "http://backend:8000",
        changeOrigin: true,
      },
    },
  },
});
```

**Environment Variables:** `frontend/.env`

```env
VITE_API_BASE_URL=http://localhost:8000/api
VITE_BACKEND_ORIGIN=http://localhost:8000
```

### CI/CD Pipeline

**GitHub Actions:** `.github/workflows/quality.yml`

**Backend Quality Checks:**

- ✅ Ruff lint check
- ✅ Ruff format check
- ✅ Max lines check (300 lines per file)
- ✅ pytest smoke tests (non-integration)

**Frontend Quality Checks:**

- ✅ TypeScript type check
- ✅ ESLint check (max-warnings=0)
- ✅ Prettier format check
- ✅ Circular dependency detection (madge)

**Triggers:**

- Push to: `main`, `develop`, `claude/**`
- Pull requests to: `main`, `develop`

---

## AI Assistant Guidelines

### When Working on This Codebase

#### DO:

1. **Follow naming conventions strictly**

   - Backend: `*_router.py`, `*_service.py`, `*_repository.py`, `*_schema.py`, `*_models.py`
   - Use appropriate prefixes: `admin_*`, `masters_*`, `orders_*`, `allocations_*`

2. **Maintain layered architecture**

   - API calls Services → Services call Repositories → Repositories use Models
   - Domain logic stays in `domain/` layer (pure functions, no DB access)
   - Avoid circular dependencies

3. **Use absolute imports in backend**

   - Always: `from app.services.order_service import OrderService`
   - Never: `from ..services import OrderService`

4. **Run code quality checks before committing**

   - Backend: `ruff check app/ && ruff format --check app/`
   - Frontend: `npm run typecheck && npm run lint && npm run format:check`

5. **Write tests for new features**

   - Backend: Add to appropriate test directory (api/, services/, unit/)
   - Use existing fixtures from `conftest.py`
   - Run `pytest -k "not integration"` before committing

6. **Update OpenAPI types after backend changes**

   - Run `npm run generate:api` in frontend after backend schema changes

7. **Respect transaction boundaries**

   - Services handle transactions
   - Repositories perform data access only
   - Don't start transactions in API layer

8. **Follow TypeScript strict mode**

   - All type errors must be resolved
   - Use proper type imports: `import type { ... }`
   - Leverage OpenAPI-generated types

9. **Document domain logic**

   - Add docstrings to complex business rules
   - Explain FEFO, allocation, and inventory logic
   - Use Google style docstrings in Python

10. **Check database constraints**
    - Understand foreign key relationships
    - Respect unique constraints (e.g., order_no, lot_number)
    - Handle constraint violations gracefully

#### DON'T:

1. **Don't use relative imports in backend**

   - Breaks import organization
   - Confuses dependency direction

2. **Don't bypass the service layer**

   - API routes should not directly access repositories
   - Business logic belongs in services, not routers

3. **Don't mutate stock_movements**

   - This is an immutable event log
   - Always append new movements, never update

4. **Don't skip type checking**

   - Frontend: Must pass `npm run typecheck`
   - Backend: Pydantic validates at runtime, but be explicit

5. **Don't create circular dependencies**

   - Use madge to check: `npx madge src --circular`
   - Refactor if circles detected

6. **Don't commit without running quality checks**

   - Use pre-commit hooks
   - CI will fail if checks don't pass

7. **Don't mix concerns in components**

   - Keep business logic in services/hooks
   - Components should be presentational when possible

8. **Don't ignore FEFO rules**

   - Understand the lot allocation algorithm
   - Respect expiry date ordering

9. **Don't hardcode configuration**

   - Use Settings class (backend) or env vars (frontend)
   - Never commit secrets (.env files are gitignored)

10. **Don't create barrel exports carelessly**
    - Avoid in shared components and hooks (circular dep risk)
    - OK for feature public APIs and UI components

### Understanding the Codebase

**Start here when exploring:**

1. **README.md** - High-level overview
2. **SETUP_GUIDE.md** - Complete setup walkthrough
3. **docs/architecture/codebase_structure.md** - Detailed architecture
4. **backend/app/main.py** - Backend entry point
5. **frontend/src/App.tsx** - Frontend entry point
6. **API docs** - http://localhost:8000/api/docs (when server running)

**Key concepts to understand:**

- **Event sourcing:** `stock_movements` table logs all inventory events
- **Summary table:** `lot_current_stock` caches current inventory for performance
- **FEFO algorithm:** Allocates oldest expiring lots first
- **Order state machine:** Draft → Open → Allocated → Shipped → Closed
- **Master data:** Warehouses, suppliers, customers, products must exist before operations
- **Unit conversions:** Products can have multiple UOMs with conversion ratios

### Common Pitfalls

1. **Async context**

   - FastAPI is async, but SQLAlchemy sessions are sync
   - Use `def` (sync) for route handlers with DB operations
   - Use `async def` only for truly async operations

4. **React Query caching**

   - TanStack Query caches by queryKey
   - Invalidate queries after mutations
   - Use `useMutation` for POST/PATCH/DELETE

5. **Type mismatches**
   - Backend uses Pydantic models (validation)
   - Frontend uses TypeScript types (compile-time)
   - Ensure OpenAPI types are regenerated after backend changes

### Useful Commands Summary

```bash
# Backend Development
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload
ruff check app/ --fix
ruff format app/
pytest -q -k "not integration"
alembic upgrade head

# Frontend Development
cd frontend
npm run dev
npm run typecheck
npm run lint:fix
npm run format
npm run generate:api

# Docker
docker compose up --build
docker compose --profile ops up  # with pgAdmin
docker compose logs -f lot-backend
docker compose down -v  # reset volumes

# Database
curl -X POST http://localhost:8000/api/admin/reset-database
curl -X POST http://localhost:8000/api/admin/init-sample-data
alembic upgrade head

# Code Quality
pre-commit run --all-files
cd backend && ruff check app/ && ruff format --check app/
cd frontend && npm run typecheck && npm run lint && npm run format:check
```

---

## Common Type Candidates (共通型候補)

### Overview

We have identified common type patterns that appear repeatedly across both backend and frontend codebases. These candidates are documented for future refactoring considerations to improve type safety, reduce code duplication, and maintain consistency between backend and frontend.

**Documentation Location:**

- Backend: `docs/architecture/common_type_candidates_backend.md`
- Frontend: `docs/architecture/common_type_candidates_frontend.md`

### Backend Common Type Candidates

**High Priority:**

1. **Master Data Summary Types** (`*Summary`)

   - `WarehouseSummary`: id + warehouse_code + warehouse_name
   - `SupplierSummary`: id + supplier_code + supplier_name
   - `CustomerSummary`: id + customer_code + customer_name
   - `DeliveryPlaceSummary`: id + delivery_place_code + delivery_place_name
   - `ProductSummary`: id + maker_part_code + product_name + base_unit
   - `UserSummary`: id + username + display_name
   - `RoleSummary`: id + role_code + role_name

2. **ListResponse[T] Pattern**

   - Common pattern: `items: list[T]` + `total: int`
   - Used in 10+ schemas (WarehouseListResponse, CustomerListResponse, etc.)
   - Should be extracted as a generic type

3. **Duplicate Definitions** (Immediate Action Required)
   - `ProductBase` defined in both `masters_schema.py` and `products_schema.py`
   - `WarehouseOut` defined in both `masters_schema.py` and `warehouses_schema.py`

**Medium Priority:**

4. **Domain Summaries**
   - `LotSummary`: Lot information subset for allocation displays
   - `AllocationSummary`: Allocation information (duplicated in orders_schema and allocations_schema)

**Already Well-Defined:**

- `TimestampMixin`: Widely used, no issues
- `Page[T]`: Defined but underutilized
- Status Enums: Appropriately domain-specific

### Frontend Common Type Candidates

**High Priority:**

1. **Master Data Display Types** (corresponds to backend `*Summary`)

   - `CustomerDisplay`: customerId + customerCode + customerName
   - `ProductDisplay`: productId + productCode + productName + unit
   - `WarehouseDisplay`: warehouseId + warehouseCode + warehouseName
   - `DeliveryPlaceDisplay`: deliveryPlaceId + deliveryPlaceCode + deliveryPlaceName
   - `SupplierDisplay`: supplierId + supplierCode + supplierName

   **Location:** Should be defined in `frontend/src/shared/types/master-displays.ts`

2. **Legacy Field Cleanup**

   - `allocations/types/index.ts` has mixed DDL v2.2 and legacy fields
   - `Order` type: Contains both `order_number` (v2.2) and `order_no` (legacy)
   - `OrderLine` type: Contains both `product_id` and `product_code` (legacy)
   - **Migration deadline:** 2026-02-15 (aligned with backend API migration)

3. **ListResponse / PageResponse Pattern**
   - `ListResponse<T>`: items + total
   - `PageResponse<T>`: items + total + page + pageSize
   - **Location:** Should be defined in `frontend/src/shared/types/api-responses.ts`

**Medium Priority:**

4. **Domain Type Embedding**

   - `OrderHeaderSummary`: Embed `CustomerDisplay` + `DeliveryPlaceDisplay`
   - Simplifies component code: `order.customer.customerName`

5. **Existing WarehouseSummary**
   - Already defined in `allocations/types/index.ts`
   - Should be promoted to shared types

**Case Convention (snake_case vs camelCase):**

- **Current:** API types use `snake_case` (OpenAPI generated)
- **Recommendation:** Keep `snake_case` for consistency with backend
- **Alternative:** Add conversion layer if TypeScript conventions are prioritized

### Guidelines for Using Common Types

**When to use common types:**

1. **Master Data Display** - When showing id + code + name combinations

   ```typescript
   // ✅ Good
   type OrderHeader = {
     customer: CustomerDisplay; // Common type
     deliveryPlace: DeliveryPlaceDisplay; // Common type
   };

   // ❌ Avoid
   type OrderHeader = {
     customer_id: number;
     customer_code: string;
     customer_name: string;
     delivery_place_id: number;
     // ... repeated fields
   };
   ```

2. **List Responses** - When returning lists from API

   ```python
   # Backend
   class WarehouseListResponse(ListResponse[WarehouseSummary]):
       pass  # Inherits items + total
   ```

3. **Embedded References** - When including related entities
   ```typescript
   // Frontend
   type LotSummary = {
     lotId: number;
     lotNumber: string;
     product: ProductDisplay; // Embedded common type
     warehouse: WarehouseDisplay; // Embedded common type
   };
   ```

**When NOT to use common types:**

1. **Full Entity Responses** - When all fields including timestamps are needed

   - Use: `CustomerResponse` (full)
   - Not: `CustomerSummary` (subset)

2. **Create/Update Requests** - When different validation rules apply

   - Use: `CustomerCreate`, `CustomerUpdate`
   - Not: `CustomerSummary`

3. **Domain-Specific Extensions** - When adding UI-specific fields
   ```typescript
   // UI Extension (separate type)
   type OrderCardData = OrderHeaderSummary & {
     priority: PriorityLevel; // UI-specific
     unallocatedQty: number; // Calculated field
   };
   ```

### Migration Strategy

**Phase 1: High Priority (Immediate)**

1. Define master data summary types (backend + frontend)
2. Fix duplicate definitions (ProductBase, WarehouseOut)
3. Define ListResponse/PageResponse generics

**Phase 2: Medium Priority (Within 3 months)** 4. Migrate existing code to use common types 5. Clean up legacy fields (frontend) 6. Promote existing WarehouseSummary to shared types

**Phase 3: Low Priority (As needed)** 7. Add embedded references to domain types 8. Standardize UI extension patterns 9. Consider case conversion strategy

### Review Process

Before implementing common types:

1. Review candidate documentation with team
2. Agree on naming conventions (snake_case vs camelCase)
3. Define migration timeline and backward compatibility strategy
4. Update this guide with final decisions

For detailed analysis, see:

- `docs/architecture/common_type_candidates_backend.md`
- `docs/architecture/common_type_candidates_frontend.md`

---

## Additional Resources

### Documentation Files

- **SETUP_GUIDE.md** - Complete setup instructions with troubleshooting
- **README.md** - Project overview and quick start
- **CHANGELOG_v2.0.md** - Version 2.0 changes and improvements
- **RENAME_MAPPING.md** - File renaming history (standardization)
- **MIGRATION_FIX_SUMMARY.md** - Database migration fixes
- **docs/architecture/** - Detailed architecture documentation
- **docs/schema/** - Database schema documentation
- **docs/troubleshooting/** - Common issues and solutions

### API Documentation

- **Swagger UI:** http://localhost:8000/api/docs
- **ReDoc:** http://localhost:8000/api/redoc
- **OpenAPI JSON:** http://localhost:8000/api/openapi.json

### Type Documentation (Frontend)

- **TypeDoc:** Run `npm run docs` in frontend/
- **Generated Types:** `frontend/src/@types/api.d.ts`

---

## Version Information

- **Project Version:** 2.0.0
- **Backend:** Python 3.12, FastAPI 0.115.5, SQLAlchemy 2.0.36
- **Frontend:** React 19, TypeScript 5.9.3, Vite 7.2.0
- **Last Updated:** 2025-11-14

---

## Contact & Support

For questions or issues:

1. Check existing documentation in `docs/`
2. Review troubleshooting guides
3. Inspect API documentation at `/api/docs`
4. Check logs (application console or docker compose logs)
5. Review test cases for usage examples

---

**This CLAUDE.md file should be updated when:**

- Major architectural changes occur
- New conventions or patterns are adopted
- Significant features are added
- Development workflows change
- Dependencies are upgraded significantly

Keep this file current to help AI assistants and new developers understand the codebase quickly.
