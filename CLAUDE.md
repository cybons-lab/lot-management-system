# CLAUDE.md - Lot Management System

## 🔒 CRITICAL: Code System Definition

**このシステムは2つのコード体系のみを使用します:**
1. **メーカー品番** (`supplier_items.maker_part_no`) - 在庫実体
2. **得意先品番** (`customer_items.customer_part_no`) - 注文入力

**社内商品コードは存在しません。** `products`テーブルは補助的なグルーピング用です。

詳細: [docs/project/CODE_SYSTEM_DEFINITION.md](docs/project/CODE_SYSTEM_DEFINITION.md)

---

## Project Overview

**ロット管理システム (Lot Management System) v2.1**

A full-stack inventory management system for tracking materials by lot, with automated FEFO (First Expiry First Out) allocation, OCR order intake, and automatic purchase request generation for stock shortages.

**Core Capabilities:**
- Lot-based inventory tracking with expiry date management
- Order processing with automated lot allocation (FEFO algorithm)
- OCR integration for order intake
- Automated purchase request generation
- SAP integration support (mock implementation)
- Multi-warehouse management

**Language:** Japanese (UI/ドキュメント), English (technical docs)

---

## Technology Stack

### Backend
- **Runtime:** Python 3.13
- **Framework:** FastAPI 0.115.5
- **ORM:** SQLAlchemy 2.0.36 with Alembic migrations
- **Validation:** Pydantic 2.10.1
- **Database:** PostgreSQL 15
- **Testing:** pytest
- **Linting:** Ruff v0.6.9

### Frontend
- **Framework:** React 19 with TypeScript 5.9.3 (strict mode)
- **Build:** Vite 7.2.0
- **Styling:** Tailwind CSS 4.1.16, shadcn/ui
- **State:** Jotai (client), TanStack Query (server)
- **Forms:** react-hook-form + Zod
- **HTTP Client:** ky (modern), axios (legacy)
- **Linting:** ESLint 9, Prettier 3.6.2

### DevOps
- **Containerization:** Docker Compose
- **CI/CD:** GitHub Actions

---

## Architecture

### Backend (Layered)

```
API Layer (routes/)     → HTTP handlers, validation
Service Layer           → Business logic, transactions
Domain Layer            → Pure business rules (FEFO)
Repository Layer        → Data access
Model Layer             → SQLAlchemy ORM
```

**Dependency Direction:** API → Service → Repository → Model (循環依存禁止)

### Frontend (Feature-based)

```
src/
├── features/         # Feature modules
│   └── {feature}/
│       ├── components/
│       ├── hooks/
│       ├── api.ts
│       └── types.ts
├── components/ui/    # shadcn/ui components
├── hooks/           # Shared hooks
├── shared/          # Shared utilities
│   └── api/http-client.ts  # HTTP client (ky)
└── types/           # OpenAPI generated types
```

---

## Directory Structure

```
lot-management-system/
├── backend/
│   ├── app/
│   │   ├── api/routes/      # Feature-based routers
│   │   ├── services/        # Business logic
│   │   ├── repositories/    # Data access
│   │   ├── models/          # SQLAlchemy models
│   │   ├── schemas/         # Pydantic schemas
│   │   ├── domain/          # Pure business rules
│   │   └── core/            # Config, DB, errors
│   ├── alembic/             # Migrations
│   ├── tests/               # pytest tests
│   └── pyproject.toml       # Ruff config
│
├── frontend/
│   ├── src/
│   │   ├── features/        # 13 feature modules
│   │   ├── components/      # UI components
│   │   ├── hooks/           # Shared hooks
│   │   ├── shared/          # Utilities
│   │   └── types/           # Generated types
│   ├── package.json
│   └── eslint.config.js
│
├── docs/
│   ├── project/BACKLOG.md  # Consolidated task backlog
│   ├── archive/            # Archived (obsolete) documentation
│   ├── standards/          # Detailed standards (security, etc.)
│   └── remaining_issues.adoc
│
├── CLAUDE.md               # This file
├── CHANGELOG.md            # Change history
└── docker-compose.yml
```

---

## Code Quality Standards

### Backend (Python)

**Quality Requirements (STRICT):**
- **File size:** < 300 lines
- **Cyclomatic complexity:** < 10
- **Type hints:** Required on all functions
- **Docstrings:** Required on public APIs (Google style)

**Commands:**
```bash
# In Docker container
docker compose exec backend ruff check app/
docker compose exec backend ruff format app/
docker compose exec backend pytest -q

# Local
cd backend && ruff check app/ --fix && ruff format app/
```

**Naming:**
- Files: `*_router.py`, `*_service.py`, `*_repository.py`, `*_schema.py`, `*_models.py`
- Absolute imports only: `from app.services.order_service import OrderService`

### Frontend (TypeScript)

**Quality Requirements (STRICT):**
- **TypeScript:** Strict mode, 0 errors
- **ESLint:** 0 warnings
- **File size:** < 300 lines per component

**Commands:**
```bash
cd frontend
npm run typecheck
npm run lint
npm run format
```

**Naming:**
- Components: `PascalCase.tsx` (e.g., `OrderCard.tsx`)
- Other files: `kebab-case.ts`
- Hooks: `useCamelCase`
- Use `@/` alias for src imports

---

## Development Workflow

### Docker Commands

```bash
# Start all services
docker compose up

# View logs
docker compose logs -f backend

# Reset database
docker compose down -v && docker compose up

# Run backend commands
docker compose exec backend pytest
docker compose exec backend ruff check app/
```

### Frontend Commands

```bash
cd frontend
npm run dev          # Start dev server
npm run typecheck    # Type check
npm run lint         # Lint
npm run format       # Format
npm run typegen      # Regenerate API types
```

### Database

```bash
# Reset with sample data
curl -X POST http://localhost:8000/api/admin/reset-database
curl -X POST http://localhost:8000/api/admin/init-sample-data

# Migrations
docker compose exec backend alembic upgrade head
```

### Git Workflow

```bash
# Create feature branch
git checkout -b feature/xxx

# Main branch direct commit is blocked
# Use PR workflow
```

---

## AI Assistant Guidelines

### DO
1. Follow naming conventions strictly
2. Use absolute imports in backend
3. Run quality checks before committing
4. Update OpenAPI types after backend changes: `npm run typegen`
5. Write tests for new features
6. Document domain logic with docstrings
7. Commit frequently with atomic changes (avoid large bulk commits). Commits do not require user confirmation.
8. Create feature branches for new work (e.g., `feature/order-filters`).
9. **Add comprehensive logging from the start** (see Logging Guidelines below)

### DON'T
1. Bypass service layer (routes → repositories directly)
2. Create circular dependencies
3. Commit without quality checks
4. Mix business logic in components
5. Use `any` types in TypeScript
6. Hardcode configuration values
7. Write code without logging critical operations

### Logging Guidelines

**CRITICAL: Always add logging when writing new code. Don't wait for debugging to add logs.**

#### When to Add Logging

1. **External API Calls** (P0 - Always log)
   - Request parameters (mask sensitive data)
   - Response status and size
   - Timeout and error details
   - Example: RPA flows, SAP integration, SmartRead API

2. **Database Operations** (P0 - Always log errors)
   - IntegrityError with entity details
   - SQLAlchemyError with operation context
   - Include: entity ID, operation type, error message

3. **Business Logic Decision Points** (P1 - Log decisions)
   - FEFO/FIFO candidate selection (filter params, result counts)
   - Allocation logic (why candidates were selected/rejected)
   - Order state transitions
   - Include: "why" not just "what"

4. **Background Tasks** (P1 - Log progress)
   - Task start/completion
   - File processing progress
   - State transitions
   - Success/failure with context

5. **Return None Cases** (P2 - Warn when unexpected)
   - Log why None is returned
   - Include context for debugging

#### Logging Patterns

```python
# GOOD: Structured logging with context
logger.info(
    "FEFO candidates found",
    extra={
        "product_id": product_id,
        "candidate_count": len(candidates),
        "policy": "FEFO",
    },
)

# GOOD: Error logging with entity context
logger.error(
    "Lot creation failed",
    extra={
        "lot_number": lot_number,
        "product_code": product_code,
        "error": str(exc)[:500],
    },
    exc_info=True,
)

# BAD: F-string logging (no structured data)
logger.error(f"Failed to create lot {lot_number}")

# BAD: No logging
try:
    result = external_api.call()
except Exception:
    return None  # Silent failure!
```

#### Log Levels

- `DEBUG`: Detailed diagnostic info (filter params, intermediate values)
- `INFO`: Normal operations (API calls, task completion, business events)
- `WARNING`: Unexpected but handled (no candidates found, fallback used)
- `ERROR`: Errors requiring attention (API failures, DB errors)
- `EXCEPTION`: Like ERROR but with traceback (use `logger.exception()`)

#### Security Considerations

- **Mask sensitive data**: URLs, credentials, tokens, API keys
- **Redact PII**: Customer data, email addresses (in production)
- **Limit response bodies**: Max 500 chars for error responses
- Example: `masked_url = url[:50] + "..." if len(url) > 50 else url`

### Key Concepts
- **FEFO:** First Expiry First Out allocation
- **stock_history:** Immutable event log (never update)
- **lots:** Single source of truth for inventory
- **Order states:** Draft → Open → Allocated → Shipped → Closed

---

## Standards Documentation

Detailed standards are maintained in `docs/standards/`:
- `error-handling.md` - Error handling patterns
- `security.md` - Security standards
- `state-management.md` - State management patterns
- See: `docs/standards/README.md`

---

## API Documentation

- **Swagger UI:** http://localhost:8000/api/docs
- **ReDoc:** http://localhost:8000/api/redoc
- **Log Viewer:** http://localhost:3000/logs (Admin only)
  - リアルタイムログストリーミング
  - レベル/テキストフィルタリング
  - 一時停止/再開、エクスポート機能

---

## Version Information

- **Project:** v2.1.0
- **Backend:** Python 3.13, FastAPI 0.115.5
- **Frontend:** React 19, TypeScript 5.9.3, Vite 7.2.0
- **Last Updated:** 2025-12-05

---

## Related Files

- **CHANGELOG.md** - Version history
- **SETUP_GUIDE.md** - Setup instructions
- **README.md** - Project overview
- **docs/project/BACKLOG.md** - Consolidated task backlog
- **docs/archive/README.md** - Archived documentation index (obsolete files)
