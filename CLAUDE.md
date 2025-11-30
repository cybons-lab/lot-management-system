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
- **HTTP Client:** ky 1.14.0 (modern, fetch-based) + axios 1.13.2 (legacy, being migrated)
- **Data Processing:** PapaParse 5.5.3 (CSV), qs 6.14.0 (query strings)
- **State Utilities:** use-immer 0.11.0 (immutable updates)
- **Schema Tools:** zod-to-json-schema 3.25.0
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
├── services/         # Legacy API client layer (axios-based, being migrated)
│   ├── http.ts       # Axios wrapper (legacy)
│   └── api.ts        # Convenience methods
├── shared/           # Modern shared utilities
│   ├── api/          # New HTTP client (ky-based)
│   │   └── http-client.ts  # Modern fetch-based client
│   ├── types/        # Shared type definitions
│   │   └── bulk-operations.ts
│   └── utils/        # Shared utilities
│       ├── api-helpers.ts   # API helpers (qs-based)
│       └── csv-parser.ts    # CSV processing (PapaParse)
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

#### Quality Requirements (STRICT)

**File Size Limits:**
- **Maximum:** 300 lines per file (ENFORCED)
- **Target:** < 200 lines
- **Exception:** Only with explicit justification (e.g., generated code, migration files)

**Function Complexity:**
- **Maximum cyclomatic complexity:** 10 (STRICT)
- **Target:** < 7
- **Tool:** Use `radon cc` to measure

```bash
# Install radon
pip install radon

# Check complexity
radon cc app/ -a -nb

# Fail CI if complexity > 10
radon cc app/ --total-average --min B  # B = complexity <= 10
```

**Docstrings (REQUIRED):**

```python
# ✅ REQUIRED: Docstrings for public functions/classes
def create_order(order_data: OrderCreate, db: Session) -> Order:
    """
    Create a new order with validation and allocation.
    
    Args:
        order_data: Order creation data
        db: Database session
        
    Returns:
        Created order with allocations
        
    Raises:
        ValidationError: If order data is invalid
        InsufficientStockError: If allocation fails
    """
    pass

# ❌ FORBIDDEN: No docstring for public API
def create_order(order_data, db):  # ❌ Missing docstring
    pass
```

**Type Hints (REQUIRED):**

```python
# ✅ REQUIRED: Type hints on ALL function signatures
def calculate_total(items: list[OrderLine]) -> Decimal:
    return sum(item.quantity * item.unit_price for item in items)

# ❌ FORBIDDEN: No type hints
def calculate_total(items):  # ❌ Missing types
    return sum(...)
```

**Code Quality Checklist (REQUIRED before PR):**
- [ ] `ruff check` passes with 0 errors
- [ ] `ruff format --check` passes (code formatted)
- [ ] All files < 300 lines
- [ ] All public functions have docstrings
- [ ] All functions have type hints
- [ ] Cyclomatic complexity < 10
- [ ] No commented-out code
- [ ] No `print()` statements (use logging)
- [ ] No hardcoded credentials/secrets

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

#### Quality Requirements (STRICT)

**File Size Limits:**
- **Maximum:** 300 lines per component (ENFORCED)
- **Target:** < 200 lines
- **Split:** Extract sub-components if exceeding 200 lines

**Component Complexity:**
- **Maximum:** 15 JSX elements in render (STRICT)
- **Target:** < 10 elements
- **Rule:** Extract child components if too complex

```typescript
// ✅ GOOD: Simple, focused component
function ProductCard({ product }: Props) {
  return (
    <div className="card">
      <h3>{product.name}</h3>
      <p>{product.price}</p>
      <Button onClick={() => select(product)}>Select</Button>
    </div>
  );
}

// ❌ TOO COMPLEX: Extract sub-components
function ProductCard({ product }: Props) {
  return (
    <div className="card">
      <div className="header">...</div>
      <div className="body">
        <div className="info">...</div>
        <div className="actions">
          <button>...</button>
          <button>...</button>
          {/* 20+ more elements */}
        </div>
      </div>
    </div>
  );
}
```

**Props Type Definition (REQUIRED):**

```typescript
// ✅ REQUIRED: Explicit interface for props
interface ProductFormProps {
  product?: Product;
  onSubmit: (data: ProductFormInput) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function ProductForm({ product, onSubmit, onCancel, isSubmitting = false }: ProductFormProps) {
  // ...
}

// ❌ FORBIDDEN: Inline type or 'any'
export function ProductForm(props: any) {  // ❌
export function ProductForm({ product, onSubmit }: { product: any, onSubmit: Function }) {  // ❌ any
```

**Hooks Rules (STRICT):**

```typescript
// ✅ REQUIRED: Custom hooks start with 'use'
function useProductData(id: string) {
  return useQuery({...});
}

// ✅ REQUIRED: Hooks in same order, not conditional
function MyComponent() {
  useState(...);  // ✅ Always called
  useEffect(...); // ✅ Always called
  
  // ❌ FORBIDDEN
  if (condition) {
    useState(...);  // ❌ Conditional hook
  }
}

// ✅ REQUIRED: Specify dependencies array
useEffect(() => {
  fetchData();
}, [fetchData]);  // ✅ Dependencies specified

useEffect(() => {
  fetchData();
});  // ❌ Missing dependencies - will run every render
```

**ESLint Compliance (STRICT):**
- **Warnings:** 0 allowed (ENFORCED)
- **Errors:** 0 allowed (ENFORCED)
- **CI:** Fails on any warning

```bash
# MUST pass with --max-warnings=0
npm run lint -- --max-warnings=0
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

## Error Handling Standards

### Philosophy

**Core Principles:**

1. **Fail Gracefully** - Always provide user-friendly feedback
2. **Log Everything** - All errors logged with context for debugging
3. **Consistent UX** - Unified error display patterns across the application
4. **Defensive Programming** - Validate inputs, handle edge cases
5. **Clear Ownership** - Each layer knows what errors to handle

### Backend Error Handling

#### Exception Hierarchy

```python
Exception
├── DomainError (app.domain.errors)
│   ├── OrderNotFoundError
│   ├── ProductNotFoundError
│   ├── DuplicateOrderError
│   ├── InvalidOrderStatusError
│   └── OrderValidationError
├── HTTPException (FastAPI)
└── SQLAlchemy Exceptions
    ├── IntegrityError
    ├── OperationalError
    └── DataError
```

#### Layer Responsibilities

| Layer | Responsibility | Example |
|-------|----------------|---------|
| **API (routes/)** | Input validation, HTTP status mapping | Return 422 for validation errors |
| **Service** | Business logic errors, DB exceptions | Catch `IntegrityError`, raise `DuplicateOrderError` |
| **Domain** | Pure business rules | Raise domain exceptions for rule violations |
| **Global Handlers** | Convert exceptions to Problem+JSON | All unhandled errors → 500 with logging |

#### Best Practices

**✅ DO:**

```python
# Service layer - catch DB errors, raise domain errors
from app.domain.errors import DuplicateOrderError
from sqlalchemy.exc import IntegrityError

async def create_order(self, data: OrderCreate) -> Order:
    try:
        order = Order(**data.model_dump())
        self.db.add(order)
        await self.db.flush()
        return order
    except IntegrityError as exc:
        logger.error(f"Duplicate order: {data.order_code}", exc_info=True)
        raise DuplicateOrderError(f"注文コード {data.order_code} は既に存在します")

# Router - let service exceptions bubble up to global handler
@router.post("/orders", response_model=OrderResponse)
async def create_order(
    data: OrderCreate,
    service: OrderService = Depends(get_order_service)
):
    return await service.create_order(data)
```

**❌ DON'T:**

```python
# Don't catch and swallow errors
try:
    result = await service.do_something()
except Exception:
    pass  # ❌ Silent failure

# Don't return empty data on error
try:
    return await service.get_data()
except Exception:
    return []  # ❌ Hides the error from user

# Don't use generic exceptions in domain layer
raise Exception("Something went wrong")  # ❌ Use domain exceptions
```

#### Global Exception Handlers

All exceptions are converted to **Problem+JSON** format (RFC 7807) in [`app/core/errors.py`](file:///Users/kazuya/dev/projects/lot-management-system/backend/app/core/errors.py):

```json
{
  "type": "about:blank",
  "title": "OrderNotFoundError",
  "status": 404,
  "detail": "注文が見つかりません: ORD-001",
  "instance": "/api/orders/ORD-001",
  "error_code": "ORDER_NOT_FOUND"
}
```

**Configured handlers:**
- `DomainError` → Mapped to appropriate HTTP status (400, 404, 409, 422)
- `HTTPException` → Pass through with Problem+JSON format
- `RequestValidationError` → 422 with validation details
- `Exception` → 500 with full logging (error details hidden from user)

### Frontend Error Handling

#### Error Flow

```
HTTP Request
    ↓
ky client (beforeError hook)
    ↓ catches network/API errors
Custom Error Classes (ApiError, NetworkError)
    ↓
React Query global onError
    ↓ logs + shows toast
Component error state (isError, error)
    ↓
User sees error UI
```

#### Layer Responsibilities

| Layer | Responsibility | Implementation |
|-------|----------------|----------------|
| **HTTP Client** | Network/API errors | [`shared/api/http-client.ts`](file:///Users/kazuya/dev/projects/lot-management-system/frontend/src/shared/api/http-client.ts) - ky hooks |
| **React Query** | Query/mutation errors | Global `onError` in `QueryClient` config |
| **Hooks** | Feature-specific handling | Can override global error handling |
| **Components** | Display error state | Show `<QueryError>` or error message |
| **ErrorBoundary** | React errors | Catches component crashes |

#### Best Practices

**✅ DO:**

```typescript
// 1. Use React Query error states
export function ProductsPage() {
  const { data, isLoading, isError, error } = useProducts();
  
  if (isLoading) return <LoadingSpinner />;
  if (isError) return <QueryError error={error} />;  // ✅
  
  return <ProductTable products={data} />;
}

// 2. Handle mutation errors with toast
const { mutate } = useMutation({
  mutationFn: createProduct,
  onSuccess: () => {
    toast.success('製品を作成しました');
    queryClient.invalidateQueries({ queryKey: ['products'] });
  },
  onError: (error) => {
    toast.error(`作成に失敗しました: ${getErrorMessage(error)}`);  // ✅
  },
});

// 3. Custom error handling for specific cases
const { mutate: deleteProduct } = useMutation({
  mutationFn: deleteProductApi,
  onError: (error) => {
    if (error instanceof ApiError && error.status === 409) {
      toast.error('この製品は使用中のため削除できません');  // ✅ Specific message
    } else {
      toast.error(getErrorMessage(error));
    }
  },
});
```

**❌ DON'T:**

```typescript
// Don't ignore error states
const { data } = useProducts();  // ❌ Missing isError check
return <ProductTable products={data} />;  // Crashes if data is undefined

// Don't use try-catch for React Query
const loadData = async () => {
  try {
    const data = await fetchProducts();  // ❌ Use useQuery instead
  } catch (error) {
    // React Query handles this automatically
  }
};

// Don't show technical error messages to users
onError: (error) => {
  toast.error(error.stack);  // ❌ Technical details
}
```

#### Error Display Components

**Standard components to use:**

```typescript
// For query errors with retry option
<QueryError error={error} retry={() => refetch()} />

// For inline form errors
<FormError message={error.message} />

// For toast notifications
toast.error(getErrorMessage(error));  // Auto-extracts user-friendly message
```

#### React Query Configuration

**Global error handling** set in [`frontend/src/main.tsx`](file:///Users/kazuya/dev/projects/lot-management-system/frontend/src/main.tsx):

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      staleTime: 5 * 60 * 1000,  // 5 minutes
      onError: (error) => {
        // Global error logging
        logError('Query', error);
        
        // Show toast for unexpected errors (not 404s)
        if (!(error instanceof NotFoundError)) {
          toast.error(getErrorMessage(error));
        }
      },
    },
    mutations: {
      retry: 1,
      onError: (error) => {
        logError('Mutation', error);
        toast.error(getErrorMessage(error));
      },
    },
  },
});
```

### Error Messages

#### Localization

- **Backend:** All error messages in Japanese
- **Frontend:** Use `getErrorMessage()` utility to extract user-friendly Japanese messages
- **Log messages:** Can be in English for developer readability

#### Message Guidelines

**✅ Good messages:**
- ❌ "エラーが発生しました" (too vague)
- ✅ "製品コード PROD-001 は既に登録されています"
- ✅ "サーバーとの接続に失敗しました。ネットワーク接続を確認してください。"

**Include:**
- What went wrong
- Why it happened (if known)
- What the user can do

### Testing Error Scenarios

#### Backend

```python
def test_duplicate_order_returns_409(client):
    # Create order
    response = client.post("/api/orders", json=order_data)
    assert response.status_code == 201
    
    # Try to create duplicate - should fail
    response = client.post("/api/orders", json=order_data)
    assert response.status_code == 409
    assert "既に存在します" in response.json()["detail"]
```

#### Frontend

```typescript
// Mock error responses with MSW
rest.post('/api/products', (req, res, ctx) => {
  return res(
    ctx.status(409),
    ctx.json({
      title: 'DuplicateProductError',
      detail: '製品コード PROD-001 は既に存在します',
    })
  );
});
```

### Common Pitfalls

1. **Swallowing errors silently** - Always log or notify
2. **Showing technical stack traces to users** - Use user-friendly messages
3. **Not handling network errors** - Always consider offline scenarios
4. **Inconsistent error formats** - Use Problem+JSON on backend
5. **Missing validation** - Validate early at API boundary
6. **Not testing error paths** - Write tests for error scenarios

### Reference Implementation

- **Backend:** [`app/core/errors.py`](file:///Users/kazuya/dev/projects/lot-management-system/backend/app/core/errors.py) - Global handlers
- **Frontend:** [`shared/api/http-client.ts`](file:///Users/kazuya/dev/projects/lot-management-system/frontend/src/shared/api/http-client.ts) - HTTP error handling
- **Custom errors:** [`utils/errors/custom-errors.ts`](file:///Users/kazuya/dev/projects/lot-management-system/frontend/src/utils/errors/custom-errors.ts) - Error classes

---

## Security Standards

### Authentication & Authorization

#### JWT Token Management

**Token Configuration:**

```python
# backend/app/core/config.py
ACCESS_TOKEN_EXPIRE_MINUTES = 60      # 1 hour (STRICT)
REFRESH_TOKEN_EXPIRE_DAYS = 7         # 7 days maximum
SECRET_KEY = env("SECRET_KEY")         # Min 32 chars, random generated
ALGORITHM = "HS256"
```

**Token Lifecycle:**

1. **Access Token:** 1 hour expiry (strict, no exceptions)
2. **Refresh Token:** 7 days, stored in httpOnly cookie
3. **Token Rotation:** Issue new refresh token on each refresh (prevent replay attacks)
4. **Revocation:** Maintain token blacklist for logged-out tokens

**Implementation Requirements:**

```python
# ✅ REQUIRED
@router.post("/token")
async def login(credentials: OAuth2PasswordRequestForm):
    user = authenticate_user(credentials.username, credentials.password)
    if not user:
        raise HTTPException(status_code=401, detail="認証に失敗しました")
    
    # Log successful login
    logger.info(f"User login: {user.username}", extra={"user_id": user.id})
    
    access_token = create_access_token(data={"sub": user.username})
    refresh_token = create_refresh_token(data={"sub": user.username})
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,  # httpOnly cookie in production
        "token_type": "bearer"
    }

# ❌ FORBIDDEN
# - Storing tokens in localStorage (XSS vulnerability)
# - Tokens without expiration
# - Using user-provided data in token without validation
```

#### Role-Based Access Control (RBAC)

**Roles Hierarchy:**

```
admin > manager > operator > viewer
```

**Role Definitions:**

| Role | Permissions | Use Case |
|------|-------------|----------|
| **admin** | Full system access, user management | System administrators |
| **manager** | Read/write data, no user management | Department managers |
| **operator** | Read/write operational data | Daily operations staff |
| **viewer** | Read-only access | Auditors, reporting users |

**Permission Checks:**

```python
# Backend - Dependency injection
from app.api.deps import require_role

@router.delete("/products/{product_code}")
async def delete_product(
    product_code: str,
    current_user: User = Depends(require_role("manager"))  # ✅ REQUIRED
):
    # Only managers and admins can delete
    pass

# Frontend - Route guards
const ProtectedRoute = ({ requiredRole, children }) => {
  const { user } = useAuth();
  
  if (!hasRole(user, requiredRole)) {
    return <Redirect to="/unauthorized" />;  // ✅ REQUIRED
  }
  
  return children;
};
```

**Frontend Permission Checks:**

```typescript
// ✅ REQUIRED: Check permissions before showing actions
{hasPermission('product:delete') && (
  <Button onClick={handleDelete}>削除</Button>
)}

// ❌ FORBIDDEN: Showing buttons without permission checks
<Button onClick={handleDelete}>削除</Button>
```

#### Password Policy

**STRICT Requirements:**

- **Minimum length:** 12 characters (enterprise standard)
- **Complexity:** At least 3 of 4: uppercase, lowercase, numbers, special chars
- **Blacklist:** Common passwords (top 10,000), dictionary words
- **Expiration:** 90 days (optional, configurable)
- **History:** Cannot reuse last 5 passwords

**Implementation:**

```python
# backend/app/services/auth/password_validator.py
import re
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
BCRYPT_ROUNDS = 12  # ✅ REQUIRED: Minimum 12 rounds

def validate_password_strength(password: str) -> tuple[bool, str]:
    """Strict password validation."""
    if len(password) < 12:
        return False, "パスワードは12文字以上である必要があります"
    
    # Count character types
    has_upper = bool(re.search(r'[A-Z]', password))
    has_lower = bool(re.search(r'[a-z]', password))
    has_digit = bool(re.search(r'\d', password))
    has_special = bool(re.search(r'[!@#$%^&*(),.?":{}|<>]', password))
    
    if sum([has_upper, has_lower, has_digit, has_special]) < 3:
        return False, "大文字、小文字、数字、特殊文字のうち3種類以上を含める必要があります"
    
    # Check against common passwords
    if password.lower() in COMMON_PASSWORDS:
        return False, "このパスワードは一般的すぎます"
    
    return True, ""

# ✅ REQUIRED: Always hash passwords
hashed = pwd_context.hash(password)  # bcrypt with 12 rounds

# ❌ FORBIDDEN
# - Storing plain text passwords
# - Using MD5 or SHA1 for passwords
# - Bcrypt rounds < 10
```

### Data Protection

#### Sensitive Data Handling

**Classification:**

| Level | Examples | Protection |
|-------|----------|------------|
| **Critical** | Passwords, tokens, API keys | Never log, bcrypt/encrypt |
| **High** | Personal info (email, phone) | Mask in logs, encrypt at rest |
| **Medium** | Business data (orders, inventory) | Access control, audit logs |
| **Low** | Public data (product names) | Standard security |

**Logging Rules (STRICT):**

```python
# ✅ ALLOWED
logger.info(f"User login attempt", extra={
    "username": username,
    "ip": request.client.host
})

# ✅ ALLOWED (masked)
logger.info(f"User created", extra={
    "email": mask_email(user.email),  # "u***@example.com"
    "user_id": user.id
})

# ❌ FORBIDDEN: Never log these
logger.error(f"Login failed for {password}")  # ❌ Password
logger.debug(f"Token: {access_token}")        # ❌ Token
logger.info(f"Credit card: {card_number}")    # ❌ PII
```

**Masking Utility:**

```python
def mask_email(email: str) -> str:
    """Mask email for logging: u***@example.com"""
    if '@' not in email:
        return "***"
    local, domain = email.split('@', 1)
    return f"{local[0]}***@{domain}"

def mask_phone(phone: str) -> str:
    """Mask phone: ***-****-9999"""
    return f"***-****-{phone[-4:]}" if len(phone) >= 4 else "***"
```

#### Encryption

**At Rest:**

```python
# ✅ REQUIRED for sensitive fields
from cryptography.fernet import Fernet

class User(Base):
    __tablename__ = "users"
    
    password_hash = Column(String, nullable=False)  # ✅ Hashed (bcrypt)
    # For reversible encryption (e.g., API keys):
    # encrypted_api_key = Column(LargeBinary)  # AES-256

# ❌ FORBIDDEN
class User(Base):
    password = Column(String)  # ❌ Plain text
```

**In Transit:**

- **HTTPS Only:** All production traffic (enforce with HSTS header)
- **TLS 1.2+:** Minimum version, prefer TLS 1.3
- **Certificate Validation:** Always verify in client

```python
# backend/app/main.py (production)
if settings.ENVIRONMENT == "production":
    # ✅ REQUIRED: Force HTTPS
    app.add_middleware(
        HTTPSRedirectMiddleware
    )
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=settings.ALLOWED_HOSTS
    )
```

### API Security

#### Input Validation

**STRICT: Validate everything**

```python
# ✅ REQUIRED: Pydantic validation
from pydantic import BaseModel, Field, EmailStr, constr

class ProductCreate(BaseModel):
    product_code: constr(
        min_length=3,
        max_length=50,
        pattern=r'^[A-Z0-9-]+$'  # ✅ Whitelist pattern
    )
    product_name: constr(min_length=1, max_length=200)
    unit_price: Decimal = Field(ge=0, le=9999999.99)  # ✅ Range validation

# ❌ FORBIDDEN: No validation
def create_product(data: dict):  # ❌ Accepting raw dict
    product = Product(**data)   # ❌ No validation
```

#### Rate Limiting

**Implementation (REQUIRED for production):**

```python
# backend/app/middleware/rate_limit.py
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

# Apply to authentication endpoints
@router.post("/login")
@limiter.limit("5/minute")  # ✅ REQUIRED: Prevent brute force
async def login(request: Request, ...):
    pass

# Apply to sensitive operations
@router.post("/products")
@limiter.limit("100/hour")  # ✅ Prevent abuse
async def create_product(...):
    pass
```

**Limits (recommended):**

- Authentication: 5 requests/minute per IP
- Mutation endpoints: 100 requests/hour per user
- Query endpoints: 1000 requests/hour per user

#### CORS Configuration

```python
# backend/app/main.py
from fastapi.middleware.cors import CORSMiddleware

# ✅ REQUIRED: Explicit origins
origins = [
    "https://yourdomain.com",
    "https://app.yourdomain.com",
]

if settings.ENVIRONMENT == "development":
    origins.append("http://localhost:5173")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  # ✅ NEVER use ["*"] in production
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)
```

### Security Checklist

**Before Production Deployment:**

- [ ] All passwords hashed with bcrypt (rounds >= 12)
- [ ] JWT tokens have expiration (access: 1h, refresh: 7d)
- [ ] Refresh tokens stored in httpOnly cookies
- [ ] All API endpoints have authentication checks
- [ ] Permission checks on all mutations
- [ ] Rate limiting enabled on auth endpoints
- [ ] HTTPS enforced (HSTS header)
- [ ] CORS configured with explicit origins
- [ ] Sensitive data never logged (passwords, tokens)
- [ ] Input validation on all endpoints (Pydantic)
- [ ] SQL injection prevented (ORM only, no raw SQL)
- [ ] XSS prevented (React auto-escaping)
- [ ] CSRF tokens for state-changing operations
- [ ] Security headers configured (CSP, X-Frame-Options)
- [ ] Dependency vulnerability scan passed

---

## State Management & Data Flow Standards

### React Query Configuration

#### Global Settings (STRICT)

```typescript
// frontend/src/main.tsx
import { QueryClient } from "@tanstack/react-query";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache settings (STRICT)
      staleTime: 5 * 60 * 1000,        // 5 min (default)
      cacheTime: 30 * 60 * 1000,       // 30 min (REQUIRED)
      
      // Retry settings (STRICT)
      retry: (failureCount, error) => {
        // Never retry client errors (4xx)
        if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
          return false;
        }
        // Retry server errors up to 3 times
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      
      // Refetch settings (STRICT)
      refetchOnWindowFocus: true,      // ✅ REQUIRED
      refetchOnReconnect: true,        // ✅ REQUIRED
      refetchOnMount: true,            // ✅ REQUIRED
      
      // Error handling
      onError: (error) => {
        logError("Query", error);
        if (!(error instanceof NotFoundError)) {
          toast.error(getErrorMessage(error));
        }
      },
    },
    mutations: {
      retry: false,  // ✅ NEVER retry mutations automatically
      onError: (error) => {
        logError("Mutation", error);
        toast.error(getErrorMessage(error));
      },
    },
  },
});
```

#### Cache Strategy by Data Type

| Data Type | staleTime | cacheTime | Refetch | Rationale |
|-----------|-----------|-----------|---------|-----------|
| **Master data** (products, customers) | 10 min | 30 min | On focus | Changes infrequently |
| **Inventory** (lots, stock) | 1 min | 5 min | On focus + interval | Changes frequently |
| **Orders** (active orders) | 30 sec | 5 min | On focus + polling | Real-time critical |
| **Reports** (aggregated data) | 5 min | 15 min | Manual only | Expensive queries |
| **User settings** | 30 min | 60 min | On mount | Rarely changes |

**Implementation:**

```typescript
// ✅ REQUIRED: Override for specific use cases
const { data: products } = useQuery({
  queryKey: ["products"],
  queryFn: fetchProducts,
  staleTime: 10 * 60 * 1000,  // 10 min for master data
});

const { data: inventory } = useQuery({
  queryKey: ["inventory", warehouseId],
  queryFn: () => fetchInventory(warehouseId),
  staleTime: 1 * 60 * 1000,   // 1 min for dynamic data
  refetchInterval: 30 * 1000, // Poll every 30 sec
});
```

#### Optimistic Updates Pattern

**REQUIRED for all mutations affecting lists:**

```typescript
const { mutate } = useMutation({
  mutationFn: createProduct,
  onMutate: async (newProduct) => {
    // ✅ REQUIRED: Cancel outgoing refetches
    await queryClient.cancelQueries({ queryKey: ["products"] });
    
    // ✅ REQUIRED: Snapshot previous value
    const previousProducts = queryClient.getQueryData(["products"]);
    
    // ✅ REQUIRED: Optimistically update
    queryClient.setQueryData(["products"], (old: Product[]) => [
      ...old,
      { ...newProduct, id: `temp-${Date.now()}` }
    ]);
    
    // Return context for rollback
    return { previousProducts };
  },
  onError: (err, newProduct, context) => {
    // ✅ REQUIRED: Rollback on error
    queryClient.setQueryData(["products"], context?.previousProducts);
    toast.error("作成に失敗しました");
  },
  onSettled: () => {
    // ✅ REQUIRED: Refetch to sync with server
    queryClient.invalidateQueries({ queryKey: ["products"] });
  },
});
```

### Jotai (Client State)

#### Atom Naming Convention (STRICT)

```typescript
// ✅ REQUIRED pattern: {feature}{purpose}Atom
export const orderListFilterAtom = atom<OrderFilter>({ ... });
export const inventorySearchAtom = atom<string>("");
export const userPreferencesAtom = atom<UserPreferences>({ ... });

// ❌ FORBIDDEN
export const filterAtom = atom({ ... });     // Too vague
export const ORDER_FILTER = atom({ ... });   // Wrong case
export const filter = atom({ ... });         // Not descriptive
```

#### When to Use Jotai vs React Query

**Use React Query (server state):**
- Data from API
- Needs caching
- Needs background sync
- Shared across components

**Use Jotai (client state):**
- UI state (modals, tabs, selected items)
- Form state (multi-step forms)
- User preferences (theme, language)
- Filters and search (transient state)

```typescript
// ✅ CORRECT usage
// Server state - React Query
const { data: products } = useQuery({
  queryKey: ["products"],
  queryFn: fetchProducts,
});

// Client state - Jotai
const [filter, setFilter] = useAtom(productFilterAtom);
const [selectedIds, setSelectedIds] = useAtom(selectedProductsAtom);

// ❌ WRONG
// Don't use Jotai for server data
const [products, setProducts] = useAtom(productsAtom);  // ❌
```

#### Persistence Strategy

```typescript
// ✅ REQUIRED: Use atomWithStorage for persistence
import { atomWithStorage } from 'jotai/utils';

// User preferences - persist
export const userPreferencesAtom = atomWithStorage<UserPreferences>(
  'userPreferences',  // localStorage key
  { theme: 'light', language: 'ja' }
);

// Filters - session only (default)
export const orderFilterAtom = atom<OrderFilter>({ ... });

// ❌ FORBIDDEN: Don't persist sensitive data
export const authTokenAtom = atomWithStorage('token', '');  // ❌ Security risk
```

### Data Synchronization

#### Cache Invalidation Rules (STRICT)

```typescript
// ✅ REQUIRED: Invalidate related queries after mutation
const { mutate: createOrder } = useMutation({
  mutationFn: createOrderApi,
  onSuccess: (newOrder) => {
    // Invalidate ALL affected queries
    queryClient.invalidateQueries({ queryKey: ["orders"] });
    queryClient.invalidateQueries({ queryKey: ["inventory"] });  // Stock changed
    queryClient.invalidateQueries({ queryKey: ["forecasts"] });  // Demand changed
  },
});

// ❌ INSUFFICIENT: Only invalidating immediate query
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ["orders"] });  // ❌ Missing dependencies
}
```

**Dependency Map (REQUIRED documentation):**

| Mutation | Invalidate Queries |
|----------|-------------------|
| Create/Update/Delete Order | `orders`, `inventory`, `forecasts`, `allocations` |
| Create/Update Lot | `lots`, `inventory`, `stock-history` |
| Allocate Stock | `allocations`, `inventory`, `orders`, `lots` |
| Receive Inbound | `inbound-plans`, `inventory`, `lots` |

#### Polling vs WebSocket

**Use Polling:**
- Background job status (batch jobs)
- Infrequent updates (< 1/minute)
- Non-critical data

```typescript
// ✅ Polling for job status
const { data: job } = useQuery({
  queryKey: ["job", jobId],
  queryFn: () => fetchJobStatus(jobId),
  refetchInterval: (data) => {
    // Stop polling when job complete
    return data?.status === "completed" ? false : 5000;
  },
  enabled: !!jobId,
});
```

**Use WebSocket (future consideration):**
- Real-time updates (>1/minute)
- Multi-user collaboration
- Critical notifications

---

## Performance Standards

### Frontend Performance

#### Metrics Targets (STRICT)

**Lighthouse Scores (REQUIRED >= 90):**
- Performance: >= 90
- Accessibility: >= 90
- Best Practices: >= 90
- SEO: >= 80

**Core Web Vitals (REQUIRED):**
- **LCP (Largest Contentful Paint):** < 2.5s
- **FID (First Input Delay):** < 100ms
- **CLS (Cumulative Layout Shift):** < 0.1

**Custom Metrics:**
- Time to Interactive: < 3.5s
- Total Bundle Size: < 500KB (gzip)
- Initial Load: < 1.5s

#### Rendering Optimization

**React.memo Usage (STRICT criteria):**

```typescript
// ✅ USE React.memo when:
// 1. Component re-renders frequently but props rarely change
// 2. Component is expensive (>50ms render time)
// 3. Component receives stable props (primitives, callbacks with useCallback)

export const ProductRow = React.memo(({ product, onSelect }: Props) => {
  // Expensive rendering logic
  return <tr>...</tr>;
}, (prevProps, nextProps) => {
  // ✅ REQUIRED: Custom comparison for object props
  return prevProps.product.id === nextProps.product.id &&
         prevProps.product.updatedAt === nextProps.product.updatedAt;
});

// ❌ DON'T use React.memo:
// - For cheap components (<10ms render)
// - When props change frequently
// - With inline functions/objects as props
```

**useMemo / useCallback Guidelines:**

```typescript
// ✅ USE useMemo for:
// - Expensive calculations (>10ms)
// - Creating stable object references for deps arrays

const sortedProducts = useMemo(() => {
  return products.sort((a, b) => a.price - b.price);  // Expensive
}, [products]);

// ✅ USE useCallback for:
// - Callbacks passed to memoized children
// - Functions in dependency arrays

const handleSelect = useCallback((id: string) => {
  setSelected(id);
}, []);  // Stable reference

// ❌ DON'T use for simple operations
const sum = useMemo(() => a + b, [a, b]);  // ❌ Overkill
```

#### List Optimization

**Pagination (REQUIRED when > 50 items):**

```typescript
// ✅ REQUIRED: Server-side pagination
const { data } = useQuery({
  queryKey: ["products", page, pageSize],
  queryFn: () => fetchProducts({ page, pageSize }),
});

// ❌ FORBIDDEN: Loading all data then client-side pagination
const { data: allProducts } = useQuery(...);  // ❌ Fetches 10,000 items
const displayedProducts = allProducts.slice(page * pageSize, (page + 1) * pageSize);
```

**Virtual Scrolling (REQUIRED when > 500 items):**

```typescript
// ✅ REQUIRED: Use @tanstack/react-virtual for large lists
import { useVirtualizer } from '@tanstack/react-virtual';

function ProductList({ products }: { products: Product[] }) {
  const parentRef = useRef<HTMLDivElement>(null);
  
  const virtualizer = useVirtualizer({
    count: products.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50,  // Row height
  });
  
  return (
    <div ref={parentRef} style={{ height: '600px', overflow: 'auto' }}>
      {virtualizer.getVirtualItems().map((item) => (
        <div key={item.key} data-index={item.index}>
          <ProductRow product={products[item.index]} />
        </div>
      ))}
    </div>
  );
}
```

#### Code Splitting

**Route-based splitting (REQUIRED):**

```typescript
// ✅ REQUIRED: Lazy load all route components
const ProductsPage = lazy(() => import('@/features/products/pages/ProductsListPage'));
const OrdersPage = lazy(() => import('@/features/orders/pages/OrdersListPage'));

function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/orders" element={<OrdersPage />} />
      </Routes>
    </Suspense>
  );
}
```

**Component-based splitting (when needed):**

```typescript
// ✅ For heavy components (charts, editors)
const ChartComponent = lazy(() => import('@/components/Chart'));

// Use conditionally
{showChart && (
  <Suspense fallback={<Spinner />}>
    <ChartComponent data={data} />
  </Suspense>
)}
```

### Backend Performance

#### Database Query Optimization

**N+1 Prevention (STRICT):**

```python
# ✅ REQUIRED: Eager loading with selectinload/joinedload
from sqlalchemy.orm import selectinload, joinedload

# For one-to-many (use selectinload)
orders = session.execute(
    select(Order)
    .options(selectinload(Order.order_lines))  # ✅ Eager load
).scalars().all()

# For many-to-one (use joinedload)
order_lines = session.execute(
    select(OrderLine)
    .options(joinedload(OrderLine.product))  # ✅ Eager load
).scalars().all()

# ❌ FORBIDDEN: Lazy loading in loops
orders = session.execute(select(Order)).scalars().all()
for order in orders:
    lines = order.order_lines  # ❌ N+1 query!
```

**Pagination (REQUIRED >= 50 items):**

```python
# ✅ REQUIRED: Limit/offset pagination
from app.schemas.common import PaginationParams

@router.get("/products")
async def list_products(
    pagination: PaginationParams = Depends(),  # ✅ page, page_size
    db: Session = Depends(get_db)
):
    query = select(Product)
    
    # Total count
    total = db.scalar(select(func.count()).select_from(query.subquery()))
    
    # Paginated results
    products = db.execute(
        query
        .limit(pagination.page_size)
        .offset((pagination.page - 1) * pagination.page_size)
    ).scalars().all()
    
    return {
        "items": products,
        "total": total,
        "page": pagination.page,
        "page_size": pagination.page_size,
    }
```

**Index Strategy (STRICT):**

```python
# ✅ REQUIRED: Index on foreign keys
class OrderLine(Base):
    __tablename__ = "order_lines"
    
    order_id = Column(Integer, ForeignKey("orders.id"), index=True)  # ✅
    product_code = Column(String, ForeignKey("products.product_code"), index=True)  # ✅

# ✅ REQUIRED: Composite index for frequent queries
class Lot(Base):
    __tablename__ = "lots"
    
    __table_args__ = (
        Index('ix_lot_warehouse_product', 'warehouse_code', 'product_code'),  # ✅
        Index('ix_lot_expiry_status', 'expiry_date', 'status'),  # ✅
    )
```

**Query Performance Requirements:**

- Simple SELECT: < 50ms
- JOIN queries: < 200ms
- Aggregation: < 500ms
- Report generation: < 2s

#### Caching Strategy

**Redis (future consideration):**

- Session data
- Frequently accessed master data
- API rate limit counters
- Job queue

### Performance Checklist

**Frontend:**
- [ ] Lighthouse score >= 90 (all metrics)
- [ ] Bundle size < 500KB gzipped
- [ ] Route-based code splitting implemented
- [ ] Lists > 50 items use pagination
- [ ] Lists > 500 items use virtual scrolling
- [ ] Expensive components use React.memo
- [ ] No unnecessary re-renders (React DevTools Profiler)

**Backend:**
- [ ] All foreign keys have indexes
- [ ] No N+1 queries (check with SQL logging)
- [ ] Pagination on all list endpoints
- [ ] Query time < 200ms (95th percentile)
- [ ] Connection pooling configured (SQLAlchemy)

---

## Testing Strategy

### Test Pyramid Targets (STRICT)

```
     /\
    /E2E\      10% - Critical user flows
   /------\   
  / Integ  \   20% - API endpoints, DB operations
 /----------\
/   Unit     \ 70% - Services, utilities, components
--------------
```

**Coverage Requirements (ENFORCED):**

- **Backend:** >= 80% line coverage (services, domain logic)
- **Frontend:** >= 60% coverage (hooks, utilities, critical components)
- **Integration tests:** All API endpoints
- **E2E tests:** Top 5 critical user flows

### Backend Testing

#### Unit Tests (70%)

**Scope:** Services, domain logic, utilities

```python
# ✅ REQUIRED: Test all service methods
# tests/services/test_product_service.py
import pytest
from app.services.masters.products_service import ProductService
from app.domain.errors import DuplicateProductError

@pytest.mark.unit
def test_create_product_success(db_session):
    service = ProductService(db_session)
    product_data = ProductCreate(
        product_code="PROD-001",
        product_name="Test Product",
        unit_price=1000,
    )
    
    product = service.create(product_data)
    
    assert product.product_code == "PROD-001"
    assert product.product_name == "Test Product"

@pytest.mark.unit
def test_create_product_duplicate_raises_error(db_session, sample_product):
    service = ProductService(db_session)
    
    with pytest.raises(DuplicateProductError, match="既に存在します"):
        service.create(ProductCreate(product_code=sample_product.product_code, ...))

# ✅ REQUIRED: Test edge cases
@pytest.mark.unit
@pytest.mark.parametrize("price", [-1, 0, 10000000])
def test_product_price_validation(price):
    with pytest.raises(ValidationError):
        ProductCreate(product_code="P001", product_name="Test", unit_price=price)
```

**Coverage targets per module:**
- Services: >= 90%
- Domain logic: >= 95%
- Utilities: >= 85%

#### Integration Tests (20%)

**Scope:** API endpoints with real DB

```python
# ✅ REQUIRED: Test all endpoints
# tests/api/test_products_router.py
import pytest

@pytest.mark.integration
def test_create_product_via_api(client, auth_headers):
    response = client.post(
        "/api/masters/products",
        json={
            "product_code": "PROD-001",
            "product_name": "Test Product",
            "unit_price": 1000,
        },
        headers=auth_headers,
    )
    
    assert response.status_code == 201
    assert response.json()["product_code"] == "PROD-001"

@pytest.mark.integration
def test_create_duplicate_product_returns_409(client, auth_headers, sample_product):
    response = client.post(
        "/api/masters/products",
        json={"product_code": sample_product.product_code, ...},
        headers=auth_headers,
    )
    
    assert response.status_code == 409
    assert "既に存在します" in response.json()["detail"]

# ✅ REQUIRED: Test authentication
@pytest.mark.integration
def test_create_product_without_auth_returns_401(client):
    response = client.post("/api/masters/products", json={...})
    assert response.status_code == 401

# ✅ REQUIRED: Test authorization
@pytest.mark.integration
def test_delete_product_as_operator_returns_403(client, operator_headers):
    response = client.delete("/api/masters/products/PROD-001", headers=operator_headers)
    assert response.status_code == 403  # Operators can't delete
```

#### E2E Tests (10%)

**Critical User Flows (REQUIRED):**

1. **Order Creation Flow**
   - Login → Navigate to orders → Create order → Verify allocation
2. **Inventory Receipt Flow**
   - Login → Inbound plans → Receive goods → Verify lot creation
3. **Stock Allocation Flow**
   - Create order → Auto-allocate → Confirm allocation → Update stock
4. **Report Generation Flow**
   - Navigate to reports → Select parameters → Generate → Download
5. **User Management Flow**
   - Admin login → Create user → Assign role → Verify permissions

```python
# tests/e2e/test_order_flow.py
@pytest.mark.e2e
def test_complete_order_flow(client, admin_headers, sample_data):
    # 1. Create order
    order_resp = client.post("/api/orders", json={...}, headers=admin_headers)
    order_id = order_resp.json()["id"]
    
    # 2. Verify allocation
    alloc_resp = client.get(f"/api/allocations?order_id={order_id}", headers=admin_headers)
    assert len(alloc_resp.json()) > 0
    
    # 3. Complete order
    complete_resp = client.post(f"/api/orders/{order_id}/complete", headers=admin_headers)
    assert complete_resp.status_code == 200
    
    # 4. Verify inventory updated
    inv_resp = client.get("/api/inventory", headers=admin_headers)
    # Assert stock decreased
```

### Frontend Testing

#### Component Tests

```typescript
// ✅ REQUIRED: Test user interactions
// tests/components/ProductForm.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ProductForm } from '@/features/products/components/ProductForm';

describe('ProductForm', () => {
  it('submits valid product data', async () => {
    const onSubmit = jest.fn();
    render(<ProductForm onSubmit={onSubmit} />);
    
    // Fill form
    fireEvent.change(screen.getByLabelText('製品コード'), {
      target: { value: 'PROD-001' },
    });
    fireEvent.change(screen.getByLabelText('製品名'), {
      target: { value: 'Test Product' },
    });
    
    // Submit
    fireEvent.click(screen.getByRole('button', { name: '作成' }));
    
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        product_code: 'PROD-001',
        product_name: 'Test Product',
      });
    });
  });
  
  // ✅ REQUIRED: Test validation
  it('shows error for invalid data', async () => {
    render(<ProductForm />);
    
    fireEvent.click(screen.getByRole('button', { name: '作成' }));
    
    expect(await screen.findByText('製品コードは必須です')).toBeInTheDocument();
  });
});
```

#### Hook Tests

```typescript
// ✅ REQUIRED: Test custom hooks with MSW
// tests/hooks/useProducts.test.tsx
import { renderHook, waitFor } from '@testing-library/react';
import { rest } from 'msw';
import { server } from '@/mocks/server';
import { useProducts } from '@/features/products/hooks/useProducts';

describe('useProducts', () => {
  it('fetches products successfully', async () => {
    const { result } = renderHook(() => useProducts().useList());
    
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    
    expect(result.current.data).toHaveLength(3);
  });
  
  // ✅ REQUIRED: Test error handling
  it('handles fetch error', async () => {
    server.use(
      rest.get('/api/masters/products', (req, res, ctx) => {
        return res(ctx.status(500), ctx.json({ detail: 'Server error' }));
      })
    );
    
    const { result } = renderHook(() => useProducts().useList());
    
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeDefined();
  });
});
```

### Test Data Management

**Fixtures (STRICT):**

```python
# ✅ REQUIRED: Reusable fixtures
# tests/conftest.py
import pytest
from app.models import Product, Warehouse

@pytest.fixture
def sample_warehouse(db_session):
    warehouse = Warehouse(
        warehouse_code="WH-001",
        warehouse_name="Main Warehouse",
    )
    db_session.add(warehouse)
    db_session.commit()
    return warehouse

@pytest.fixture
def sample_product(db_session):
    product = Product(
        product_code="PROD-001",
        product_name="Test Product",
        unit_price=1000,
    )
    db_session.add(product)
    db_session.commit()
    return product

# ❌ FORBIDDEN: Creating test data in each test
def test_something(db_session):
    product = Product(...)  # ❌ Duplicate code
    db_session.add(product)
```

### CI/CD Integration

**GitHub Actions (REQUIRED):**

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run tests
        run: |
          cd backend
          pytest --cov=app --cov-report=xml --cov-fail-under=80  # ✅ Enforce 80%
      
  frontend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run tests
        run: |
          cd frontend
          npm test -- --coverage --coverageThreshold='{"global":{"lines":60}}'  # ✅ Enforce 60%
```

### Testing Checklist

**Before Merging PR:**
- [ ] All tests pass locally
- [ ] New code has >= 80% coverage (backend) / >= 60% (frontend)
- [ ] Integration tests for new endpoints
- [ ] Error cases tested
- [ ] Edge cases tested (empty lists, max values, etc.)
- [ ] MSW handlers updated for new endpoints
- [ ] No skipped/pending tests without justification

---

## Logging & Monitoring Standards

### Log Levels (STRICT Guidelines)

**Usage Matrix:**

| Level | When to Use | Examples | Production |
|-------|-------------|----------|------------|
| **DEBUG** | Development diagnostics | SQL queries, variable values | ❌ Disabled |
| **INFO** | Important business events | User login, order created | ✅ Enabled |
| **WARNING** | Recoverable errors | Retry succeeded, deprecated feature used | ✅ Enabled |
| **ERROR** | Unrecoverable errors | API failure, validation error | ✅ Enabled |
| **CRITICAL** | System-level failures | DB connection lost, service down | ✅ Enabled |

**Backend Implementation:**

```python
# ✅ CORRECT usage
import logging

logger = logging.getLogger(__name__)

# DEBUG - Development only
logger.debug(f "Executing query: {query}")  # ❌ Production
logger.debug(f"Function args: {args}")       # ❌ Production

# INFO - Important events
logger.info(
    "User logged in",
    extra={
        "user_id": user.id,
        "username": user.username,
        "ip": request.client.host,
    }
)

logger.info(
    "Order created",
    extra={
        "order_id": order.id,
        "order_code": order.order_code,
        "customer_code": order.customer_code,
        "total_amount": float(order.total_amount),
    }
)

# WARNING - Recoverable issues
logger.warning(
    "External API slow response",
    extra={
        "api": "SAP",
        "endpoint": "/products",
        "response_time_ms": 3000,
    }
)

# ERROR - Operation failed
logger.error(
    "Failed to create order",
    extra={
        "order_code": data.order_code,
        "error": str(exc),
    },
    exc_info=True,  # ✅ Include stack trace
)

# CRITICAL - System failure
logger.critical(
    "Database connection lost",
    extra={"database": settings.DATABASE_URL},
    exc_info=True,
)
```

**Frontend Implementation:**

```typescript
// services/error-logger.ts
export function logError(
  context: string,
  error: Error,
  extra?: Record<string, unknown>
) {
  // ✅ REQUIRED: Structured logging
  const logEntry = {
    timestamp: new Date().toISOString(),
    context,
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
    extra,
    user: getCurrentUser()?.id,
    url: window.location.href,
  };
  
  // Development: console
  if (import.meta.env.DEV) {
    console.error(`[${context}]`, error, extra);
  }
  
  // Production: send to backend
  if (import.meta.env.PROD) {
    sendToBackend('/api/logs/frontend', logEntry);
  }
}
```

### Sensitive Data Masking (STRICT)

**Never Log:**
- Passwords (plain or hashed)
- API keys, tokens, secrets
- Credit card numbers
- Full social security/ID numbers

**Mask in Logs:**
- Email addresses
- Phone numbers
- Customer names (in some contexts)

```python
# utils/logging_helpers.py
import re

def mask_email(email: str) -> str:
    """u***@example.com"""
    if '@' not in email:
        return "***"
    local, domain = email.split('@', 1)
    return f"{local[0]}***@{domain}" if len(local) > 0 else f"***@{domain}"

def mask_phone(phone: str) -> str:
    """***-****-1234"""
    cleaned = re.sub(r'\D', '', phone)
    return f"***-****-{cleaned[-4:]}" if len(cleaned) >= 4 else "***"

# ✅ REQUIRED: Use masking
logger.info(
    "User registration",
    extra={
        "email": mask_email(user.email),      # ✅ Masked
        "phone": mask_phone(user.phone),      # ✅ Masked
        "user_id": user.id,                   # ✅ OK (non-PII)
    }
)

# ❌ FORBIDDEN
logger.info(f"User: {user.email}, password: {password}")  # ❌ Never log password
logger.info(f"Token: {access_token}")                      # ❌ Never log token
```

### Structured Logging

**REQUIRED Format:**

```python
# backend/app/core/logging.py
import structlog

structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.processors.JSONRenderer()  # ✅ JSON for production
    ],
    wrapper_class=structlog.stdlib.BoundLogger,
    logger_factory=structlog.stdlib.LoggerFactory(),
)

# ✅ REQUIRED: Structured fields
logger.info(
    "order_created",      # event name
    order_id=order.id,
    order_code=order.order_code,
    customer_code=order.customer_code,
    line_count=len(order.lines),
    total_amount=float(order.total_amount),
)

# Output (JSON):
# {
#   "event": "order_created",
#   "timestamp": "2024-01-01T12:00:00Z",
#   "level": "info",
#   "order_id": 123,
#   "order_code": "ORD-001",
#   ...
# }
```

### Health Checks & Monitoring

#### Health Endpoint (REQUIRED)

```python
# backend/app/api/routes/health.py
from fastapi import APIRouter
from sqlalchemy import select

router = APIRouter()

@router.get("/health")
async def health_check(db: Session = Depends(get_db)):
    """System health check."""
    health = {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "checks": {}
    }
    
    # Database check
    try:
        db.execute(select(1))
        health["checks"]["database"] = "healthy"
    except Exception as e:
        health["checks"]["database"] = f"unhealthy: {str(e)}"
        health["status"] = "unhealthy"
    
    # Add more checks (Redis, external APIs, etc.)
    
    return health
```

#### Metrics Collection

**Key Metrics (REQUIRED):**

```python
# Prometheus metrics (future)
from prometheus_client import Counter, Histogram

# Request counters
http_requests_total = Counter(
    'http_requests_total',
    'Total HTTP requests',
    ['method', 'endpoint', 'status']
)

# Response time
http_request_duration_seconds = Histogram(
    'http_request_duration_seconds',
    'HTTP request duration',
    ['method', 'endpoint']
)

# Business metrics
orders_created_total = Counter('orders_created_total', 'Total orders created')
inventory_allocated_total = Counter('inventory_allocated_total', 'Total allocations')
```

**Alert Thresholds (REQUIRED):**

| Metric | Warning | Critical |
|--------|---------|----------|
| Response time (p95) | > 500ms | > 1000ms |
| Error rate | > 1% | > 5% |
| Database connections | > 80% | > 95% |
| Memory usage | > 80% | > 90% |
| Disk usage | > 80% | > 90% |

### Request Tracing

**Request ID Propagation (REQUIRED):**

```python
# backend/app/middleware/request_id.py
import uuid
from starlette.middleware.base import BaseHTTPMiddleware

class RequestIDMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        # Get or generate request ID
        request_id = request.headers.get('X-Request-ID', str(uuid.uuid4()))
        
        # Add to context
        with structlog.contextvars.bind_contextvars(request_id=request_id):
            response = await call_next(request)
            response.headers['X-Request-ID'] = request_id
            return response

# ✅ REQUIRED: All logs include request_id
logger.info("Processing request")  # Automatically includes request_id
```

### Logging Checklist

**Development:**
- [ ] Log level: DEBUG
- [ ] SQL queries logged
- [ ] Request/response bodies logged

**Production:**
- [ ] Log level: INFO
- [ ] No DEBUG logs
- [ ] Sensitive data masked
- [ ] Structured logging (JSON)
- [ ] Request ID in all logs
- [ ] Health check endpoint responding
- [ ] Error rates monitored
- [ ] Response times monitored

---

## Accessibility Standards (a11y)

### WCAG Compliance Target

**Requirement:** WCAG 2.1 Level AA (STRICT)

- **Level A:** Minimum accessibility (baseline)
- **Level AA:** ✅ **TARGET** - Industry standard for enterprise applications
- **Level AAA:** Aspirational (not required, but nice to have)

### Keyboard Navigation (REQUIRED)

**All interactive elements MUST be keyboard accessible:**

```typescript
// ✅ REQUIRED: Keyboard support for all interactions
const Dialog = () => {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();  // ✅ ESC closes dialog
      }
    };
    
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);
  
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
    >
      {/* ✅ REQUIRED: Focus trap */}
      <FocusTrap>
        <DialogContent />
      </FocusTrap>
    </div>
  );
};

// ✅ REQUIRED: Keyboard shortcuts for common actions
const DataTable = () => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'n' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      openCreateDialog();  // Ctrl/Cmd + N: New item
    }
  };
  
  return <table onKeyDown={handleKeyDown}>...</table>;
};
```

**Standard keyboard patterns (REQUIRED):**

| Element | Key | Action |
|---------|-----|--------|
| **Dialog/Modal** | ESC | Close |
| **Dialog/Modal** | Tab | Cycle focus (trapped) |
| **Dropdown** | Space/Enter | Open/select |
| **Dropdown** | Arrow Up/Down | Navigate options |
| **Form** | Tab | Next field |
| **Form** | Shift+Tab | Previous field |
| **Button** | Space/Enter | Activate |
| **Table** | Ctrl/Cmd + N | New item |
| **Table** | Delete | Delete selected (with confirmation) |

### Semantic HTML (REQUIRED)

```html
<!-- ✅ CORRECT: Semantic elements -->
<nav>
  <ul>
    <li><a href="/products">Products</a></li>
  </ul>
</nav>

<main>
  <h1>Product List</h1>
  <section aria-labelledby="filters-heading">
    <h2 id="filters-heading">Filters</h2>
    <!-- Filters -->
  </section>
</main>

<!-- ❌ WRONG: Non-semantic divs -->
<div class="navigation">
  <div class="link">Products</div>
</div>

<div class="main-content">
  <div class="title">Product List</div>
</div>
```

### ARIA Labels (STRICT Guidelines)

```typescript
// ✅ REQUIRED: Labels for form inputs
<label htmlFor="product-code">製品コード</label>
<input id="product-code" name="product_code" />

// ✅ REQUIRED: aria-label for icon-only buttons
<button aria-label="製品を削除">
  <TrashIcon />
</button>

// ✅ REQUIRED: aria-describedby for error messages
<input
  id="email"
  aria-invalid={!!error}
  aria-describedby={error ? "email-error" : undefined}
/>
{error && <span id="email-error" role="alert">{error}</span>}

// ✅ REQUIRED: aria-live for dynamic content
<div aria-live="polite" aria-atomic="true">
  {successMessage}
</div>

// ❌ FORBIDDEN: aria-label on non-interactive elements
<div aria-label="Product">  {/* ❌ Wrong */}
<span aria-label="Price">  {/* ❌ Wrong */}
```

### Color Contrast (STRICT)

**Requirements:**
- **Normal text (< 18pt):** Contrast ratio ≥ 4.5:1
- **Large text (≥ 18pt or ≥ 14pt bold):** Contrast ratio ≥ 3:1
- **UI components:** Contrast ratio ≥ 3:1

```css
/* ✅ CORRECT: High contrast */
.text-primary {
  color: #1e293b;  /* slate-900 on white: 16.7:1 */
}

.button-primary {
  background: #2563eb;  /* blue-600: 4.5:1 */
  color: white;
}

/* ❌ FORBIDDEN: Low contrast */
.text-gray {
  color: #cbd5e1;  /* slate-300 on white: 1.8:1 ❌ */
}
```

**Tools to verify:**
- Chrome DevTools Lighthouse
- axe DevTools browser extension
- WebAIM Contrast Checker

### Form Accessibility (REQUIRED)

```typescript
// ✅ REQUIRED: Accessible form
<form onSubmit={handleSubmit}>
  {/* Label association */}
  <label htmlFor="username">
    ユーザー名 <span aria-label="必須">*</span>
  </label>
  <input
    id="username"
    name="username"
    required
    aria-required="true"
    aria-invalid={!!errors.username}
    aria-describedby={errors.username ? "username-error" : undefined}
  />
  
  {/* Error message */}
  {errors.username && (
    <span id="username-error" role="alert" className="error">
      {errors.username}
    </span>
  )}
  
  {/* Submit button */}
  <button type="submit" disabled={isSubmitting}>
    {isSubmitting ? "送信中..." : "送信"}
  </button>
</form>

// ❌ FORBIDDEN: No label
<input placeholder="ユーザー名" />  {/* ❌ Placeholder is not a label */}
```

### Focus Management (REQUIRED)

```typescript
// ✅ REQUIRED: Visible focus indicator
// global.css
*:focus-visible {
  outline: 2px solid #2563eb;  /* ✅ Clear focus ring */
  outline-offset: 2px;
}

// ✅ REQUIRED: Focus trap in modals
import FocusTrap from 'focus-trap-react';

const Modal = ({ onClose, children }) => {
  return (
    <FocusTrap>
      <div role="dialog" aria-modal="true">
        {children}
        <button onClick={onClose}>Close</button>
      </div>
    </FocusTrap>
  );
};

// ✅ REQUIRED: Restore focus after modal closes
const [modalOpen, setModalOpen] = useState(false);
const triggerRef = useRef<HTMLButtonElement>(null);

const closeModal = () => {
  setModalOpen(false);
  triggerRef.current?.focus();  // ✅ Return focus to trigger
};
```

### Screen Reader Support

```typescript
// ✅ REQUIRED: Skip navigation link
<a href="#main-content" className="sr-only-focusable">
  Skip to main content
</a>

<main id="main-content">
  {/* Main content */}
</main>

// ✅ REQUIRED: Loading states
{isLoading ? (
  <div role="status" aria-live="polite">
    <Spinner aria-hidden="true" />
    <span className="sr-only">読み込み中...</span>
  </div>
) : (
  <DataTable />
)}

// ✅ REQUIRED: Icon buttons with text alternatives
<button aria-label="削除" title="削除">
  <TrashIcon aria-hidden="true" />
</button>

// Utility class for screen reader only text
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

.sr-only-focusable:focus {
  position: static;
  width: auto;
  height: auto;
  padding: inherit;
  margin: inherit;
  overflow: visible;
  clip: auto;
  white-space: normal;
}
```

### Accessibility Testing Checklist

**Automated Testing (REQUIRED):**
- [ ] Lighthouse accessibility score ≥ 90
- [ ] axe DevTools: 0 violations
- [ ] No missing alt text on images
- [ ] All form inputs have labels
- [ ] Color contrast meets AA standards

**Manual Testing (REQUIRED):**
- [ ] All features usable with keyboard only (no mouse)
- [ ] Focus indicator visible on all interactive elements
- [ ] Screen reader announces all content correctly (test with NVDA/VoiceOver)
- [ ] No keyboard traps (can exit all components)
- [ ] Modals trap focus and restore after close

**Checklist for New Components:**
- [ ] Semantic HTML used (`<button>` not `<div onclick>`)
- [ ] ARIA labels on icon-only buttons
- [ ] Form inputs associated with labels
- [ ] Error messages announced to screen readers (`role="alert"`)
- [ ] Loading states have `aria-live` regions
- [ ] Custom interactive elements have proper `role` and `aria-*` attributes
- [ ] Color not the only means of conveying information

---

## Database Design Principles

### Transaction Management

#### Transaction Boundaries (STRICT)

**Rule:** One transaction = One business operation

```python
# ✅ CORRECT: Transaction wraps entire business operation
async def create_order_with_allocation(
    order_data: OrderCreate,
    db: Session = Depends(get_db)
):
    """Create order and allocate inventory in single transaction."""
    try:
        # Start transaction (implicit with SQLAlchemy session)
        
        # 1. Create order
        order = Order(**order_data.dict())
        db.add(order)
        db.flush()  # Get order.id without committing
        
        # 2. Allocate inventory
        for line in order.order_lines:
            allocation = allocate_inventory(line, db)
            db.add(allocation)
        
        # 3. Update stock
        update_stock_quantities(order, db)
        
        # Commit everything together
        db.commit()
        return order
        
    except Exception as exc:
        db.rollback()  # ✅ REQUIRED: Rollback on any error
        raise

# ❌ WRONG: Multiple transactions for related operations
def create_order_wrong(order_data, db):
    order = Order(**order_data.dict())
    db.add(order)
    db.commit()  # ❌ Commits before allocation
    
    # If this fails, order exists but has no allocation
    allocate_inventory(order, db)
    db.commit()
```

#### Isolation Levels

**Default:** Read Committed (PostgreSQL default)

```python
# ✅ Use default for most operations
# Read Committed: Sees only committed data, prevents dirty reads

# ✅ Use Serializable for critical operations
from sqlalchemy import create_engine
engine = create_engine(
    DATABASE_URL,
    isolation_level="SERIALIZABLE"  # Highest isolation
)

# For specific transaction
from sqlalchemy.orm import sessionmaker
Session = sessionmaker(bind=engine)
session = Session()

# Critical: Inventory allocation with race condition protection
session.execute(
    text("SET TRANSACTION ISOLATION LEVEL SERIALIZABLE")
)
try:
    # Allocate inventory
    # If concurrent transaction modifies same rows, one will rollback
    session.commit()
except Exception:
    session.rollback()
```

**Isolation levels:**

| Level | Prevents | Use When |
|-------|----------|----------|
| **Read Committed** (default) | Dirty reads | Most operations |
| **Repeatable Read** | Non-repeatable reads | Reports, aggregations |
| **Serializable** | Phantom reads, concurrency issues | Inventory allocation, financial transactions |

#### Deadlock Prevention

**Strategies (REQUIRED):**

1. **Consistent lock order**: Always acquire locks in same order
2. **Keep transactions short**: Minimize time holding locks
3. **Use timeouts**: Fail fast on deadlock

```python
# ✅ CORRECT: Consistent lock order (by ID)
def transfer_stock(from_lot_id: int, to_lot_id: int, qty: int, db: Session):
    # Always lock in ascending ID order
    lot_ids = sorted([from_lot_id, to_lot_id])
    
    lots = db.execute(
        select(Lot)
        .where(Lot.id.in_(lot_ids))
        .with_for_update()  # ✅ Explicit lock
        .order_by(Lot.id)   # ✅ Consistent order
    ).scalars().all()
    
    # Perform transfer
    lots[0].quantity -= qty if lots[0].id == from_lot_id else -qty
    lots[1].quantity += qty if lots[1].id == to_lot_id else -qty
    
    db.commit()

# ❌ WRONG: Inconsistent lock order
def transfer_stock_wrong(from_lot, to_lot, qty, db):
    # Different order in different calls = potential deadlock
    from_lot = db.query(Lot).with_for_update().filter_by(id=from_lot).first()
    to_lot = db.query(Lot).with_for_update().filter_by(id=to_lot).first()
```

### Data Integrity

#### Foreign Key Constraints (STRICT)

```python
# ✅ REQUIRED: Foreign keys on ALL relationships
class OrderLine(Base):
    __tablename__ = "order_lines"
    
    id = Column(Integer, primary_key=True)
    order_id = Column(
        Integer,
        ForeignKey("orders.id", ondelete="CASCADE"),  # ✅ REQUIRED
        nullable=False,  # ✅ REQUIRED: Enforce relationship
        index=True       # ✅ REQUIRED: For performance
    )
    product_code = Column(
        String(50),
        ForeignKey("products.product_code", ondelete="RESTRICT"),  # ✅ Prevent deletion
        nullable=False,
        index=True
    )

# ❌ FORBIDDEN: No foreign key
class OrderLine(Base):
    order_id = Column(Integer)  # ❌ No FK constraint
```

**ondelete strategies:**

| Strategy | When to Use | Example |
|----------|-------------|---------|
| **CASCADE** | Child meaningless without parent | `order_lines.order_id` |
| **RESTRICT** | Prevent deletion if referenced | `order_lines.product_code` |
| **SET NULL** | Optional relationship | `orders.shipped_by_user_id` |
| **NO ACTION** | Manual handling required | Rare, use with care |

#### NOT NULL Constraints (STRICT)

```python
# ✅ REQUIRED: NOT NULL for required fields
class Product(Base):
    product_code = Column(String(50), primary_key=True, nullable=False)
    product_name = Column(String(200), nullable=False)  # ✅ Always required
    unit_price = Column(Numeric(10, 2), nullable=False)  # ✅ Price always known
    
    # Optional fields
    description = Column(Text, nullable=True)  # ✅ Explicitly nullable
    discontinued_at = Column(DateTime, nullable=True)

# ❌ WRONG: Everything nullable by default
class Product(Base):
    product_code = Column(String(50))  # ❌ Implicitly nullable
    product_name = Column(String(200))  # ❌ Critical field should be NOT NULL
```

#### CHECK Constraints

```python
# ✅ REQUIRED: CHECK constraints for business rules
class Order(Base):
    __tablename__ = "orders"
    
    __table_args__ = (
        CheckConstraint('total_amount >= 0', name='check_total_positive'),  # ✅
        CheckConstraint(
            "status IN ('pending', 'confirmed', 'shipped', 'completed', 'cancelled')",
            name='check_valid_status'
        ),  # ✅
    )
    
    total_amount = Column(Numeric(12, 2), nullable=False)
    status = Column(String(20), nullable=False)

class Lot(Base):
    __table_args__ = (
        CheckConstraint('quantity >= 0', name='check_quantity_positive'),
        CheckConstraint('expiry_date > manufactured_date', name='check_date_order'),
    )
```

### Soft Delete vs Hard Delete

**Decision Matrix:**

| Data Type | Strategy | Reason |
|-----------|----------|--------|
| **Audit-critical** (orders, invoices, transactions) | Soft delete | Legal/compliance |
| **Master data** (products, customers) | Soft delete | Historical references |
| **Operational** (sessions, temp data) | Hard delete | No historical value |
| **System** (logs older than retention) | Hard delete | Performance |

**Implementation:**

```python
# ✅ Soft delete for audit trail
class Order(Base):
    __tablename__ = "orders"
    
    id = Column(Integer, primary_key=True)
    deleted_at = Column(DateTime, nullable=True, index=True)  # ✅ Soft delete marker
    
    @hybrid_property
    def is_deleted(self):
        return self.deleted_at is not None

# Query active records only
def get_active_orders(db: Session):
    return db.execute(
        select(Order).where(Order.deleted_at.is_(None))
    ).scalars().all()

# ✅ Hard delete for temporary data
class UserSession(Base):
    # No deleted_at field - just DELETE when expired
    pass
```

### Indexes Strategy (STRICT)

**Required Indexes:**

1. **Primary keys** (automatic)
2. **Foreign keys** (REQUIRED, manual)
3. **Frequently queried columns**
4. **Unique constraints**

```python
# ✅ REQUIRED: Indexes for all FKs and frequent queries
class Lot(Base):
    __tablename__ = "lots"
    
    # Primary key (automatic index)
    id = Column(Integer, primary_key=True)
    
    # Foreign keys (REQUIRED indexes)
    warehouse_code = Column(String, ForeignKey(...), index=True)  # ✅
    product_code = Column(String, ForeignKey(...), index=True)    # ✅
    
    # Frequently queried together (composite index)
    __table_args__ = (
        Index('ix_lot_warehouse_product', 'warehouse_code', 'product_code'),  # ✅
        Index('ix_lot_expiry_status', 'expiry_date', 'status'),  # ✅
        Index('ix_lot_product_expiry', 'product_code', 'expiry_date'),  # ✅
    )
    
    expiry_date = Column(Date, nullable=False, index=True)  # ✅ Frequently filtered

# ✅ Unique index for business keys
class Product(Base):
    product_code = Column(String(50), unique=True, index=True)  # ✅
```

**Index Guidelines:**

- Add index if: Column in WHERE, JOIN, ORDER BY, or GROUP BY
- Composite index: Most selective column first
- Avoid: Indexes on low-cardinality columns (true/false)
- Monitor: Use EXPLAIN ANALYZE to verify index usage

### Migration Best Practices

#### Migration Structure (REQUIRED)

```python
# ✅ REQUIRED: Reversible migrations
"""add_product_category

Revision ID: abc123
Revises: def456
Create Date: 2024-01-01 12:00:00
"""
from alembic import op
import sqlalchemy as sa

def upgrade():
    """Apply changes."""
    # ✅ REQUIRED: Add column with default for existing rows
    op.add_column(
        'products',
        sa.Column('category', sa.String(50), nullable=True)  # ✅ Start nullable
    )
    
    # ✅ Set default for existing rows
    op.execute("UPDATE products SET category = 'general' WHERE category IS NULL")
    
    # ✅ Then make NOT NULL
    op.alter_column('products', 'category', nullable=False)
    
    # ✅ Add index
    op.create_index('ix_product_category', 'products', ['category'])

def downgrade():
    """Revert changes."""
    # ✅ REQUIRED: Always implement downgrade
    op.drop_index('ix_product_category', 'products')
    op.drop_column('products', 'category')
```

#### Data Migration (STRICT)

```python
# ✅ For large data migrations: separate script + batch processing
# migrations/scripts/migrate_product_categories.py
from app.core.database import SessionLocal
from app.models import Product

def migrate_categories(batch_size=1000):
    db = SessionLocal()
    
    try:
        offset = 0
        while True:
            # Process in batches
            products = db.query(Product).limit(batch_size).offset(offset).all()
            
            if not products:
                break
            
            for product in products:
                # Complex logic here
                product.category = determine_category(product)
            
            db.commit()
            offset += batch_size
            print(f"Processed {offset} products...")
            
    except Exception as e:
        db.rollback()
        raise
    finally:
        db.close()

# Run separately: python migrations/scripts/migrate_product_categories.py
```

### Database Checklist

**Schema Design:**
- [ ] All foreign keys defined with appropriate ondelete
- [ ] All required fields have NOT NULL constraint
- [ ] Business rules enforced with CHECK constraints
- [ ] Unique constraints on business keys
- [ ] Appropriate soft delete strategy

**Indexes:**
- [ ] Index on all foreign key columns
- [ ] Composite indexes for frequent multi-column queries
- [ ] Index verified with EXPLAIN ANALYZE
- [ ] No unused indexes (check pg_stat_user_indexes)

**Migrations:**
- [ ] Migration tested on staging DB
- [ ] Downgrade migration implemented and tested
- [ ] Large data migrations in separate batch scripts
- [ ] No breaking changes without migration path

**Performance:**
- [ ] No N+1 queries (use eager loading)
- [ ] Pagination on all list endpoints (>50 items)
- [ ] Query execution time < 200ms (complex queries < 500ms)
- [ ] Connection pooling configured (min=5, max=20)

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
