# CLAUDE.md - Lot Management System

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
│   ├── standards/           # Detailed standards (security, etc.)
│   ├── tasks/ACTIVE_TASKS.md
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

### DON'T
1. Bypass service layer (routes → repositories directly)
2. Create circular dependencies
3. Commit without quality checks
4. Mix business logic in components
5. Use `any` types in TypeScript
6. Hardcode configuration values

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
- **docs/tasks/ACTIVE_TASKS.md** - Current tasks
