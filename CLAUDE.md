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

**Transaction Management:**
- **Default:** `auto_commit=True` (Simple CRUD)
- **Unit of Work:** Use `auto_commit=False` for complex transactions spanning multiple services.
- **Partial Failure:** Use `db.begin_nested()` to create savepoints for best-effort sub-tasks (e.g. auto-allocation).
- **Locking:** Use `acquire_lock` (SELECT FOR UPDATE) for critical resource access.

**Data Integrity:**
- **Precision:** Use `Decimal` for all quantities and monetary values. Never use `float`.
- **Validation:** Fail fast on invalid data (e.g. unknown units). Avoid silent fallbacks.

**API Router Best Practices:**
- **末尾スラッシュ問題の回避:** `APIRouter` の `prefix` と組み合わせる場合、エンドポイントのパスは空文字 `""` を使用する
  ```python
  # GOOD: 末尾スラッシュなしで直接処理
  @router.get("")
  def get_items():
      ...

  # BAD: FastAPIが /items を /items/ にリダイレクト
  # → Docker内部のホスト名 backend:8000 を含むURLを返す
  # → ブラウザで ERR_NAME_NOT_RESOLVED
  @router.get("/")
  def get_items():
      ...
  ```
- **理由:** FastAPIは末尾スラッシュの有無でリダイレクトを発行する。Docker環境では内部ホスト名がブラウザに露出してDNS解決に失敗する。

### Frontend (TypeScript)

**Quality Requirements (STRICT):**
- **TypeScript:** Strict mode, 0 errors
- **ESLint:** 0 warnings
- **File size:** < 300 lines per component (論理的なまとまりを優先し、意味のある塊であれば `eslint-disable` で抑制してよい。機械的な分割による過度な断片化は避けること)
- **Sub-routing:** Use sub-routing for internal tabs/sections (e.g., `:tab` params) to ensure bookmarkability and enable hierarchical access control via `FEATURE_CONFIG`.

**Commands (Docker統一):**
```bash
# Docker経由（推奨）
make frontend-typecheck
make frontend-lint
make frontend-format

# またはdocker compose直接
docker compose exec -T frontend npm run typecheck
docker compose exec -T frontend npm run lint
docker compose exec -T frontend npm run format
```

**Naming:**
- Components: `PascalCase.tsx` (e.g., `OrderCard.tsx`)
- Other files: `kebab-case.ts`
- Hooks: `useCamelCase`
- Use `@/` alias for src imports

---

## Development Workflow

**CRITICAL: すべての開発コマンドはDocker経由で実行してください。npm scriptsを使用することでクロスプラットフォーム（Windows/Mac/Linux）で統一されたワークフローを実現します。**

📚 **重要ドキュメント:**
- [Git Workflow](docs/project/GIT_WORKFLOW.md) - **必読**: コミットルール・PR作成手順
- [Code Standards](docs/project/CODE_STANDARDS.md) - コード品質基準
- [Poe Migration Guide](docs/project/POE_MIGRATION_GUIDE.md) - タスクランナー移行ガイド

### クイックスタート

```bash
# 開発環境のセットアップ（初回）
npm run dev:setup

# サービスの起動/停止
npm run up          # すべてのサービスを起動
npm run down        # すべてのサービスを停止
npm run restart     # すべてのサービスを再起動
npm run logs        # すべてのログを表示

# 品質チェック（コミット前に実行）
npm run quality        # Lint修正 + Format + Type check + Test (5分)
npm run quality:full   # 上記 + Smoke E2E (10分)
npm run test:smoke     # スモークテストのみ (30秒)
```

### バックエンド開発

```bash
# 品質チェック（一括）
npm run be:quality          # Lint修正 + Format + Type check + Test

# 個別実行
npm run be:lint             # Lintチェック
npm run be:lint:fix         # Lint自動修正
npm run be:format           # コードフォーマット
npm run be:typecheck        # 型チェック
npm run be:test             # テスト実行
npm run be:test:quick       # テスト高速実行
npm run be:test:integration # 統合テスト

# シェル接続
npm run be:shell

# または poe (backend/ 内で実行)
cd backend
poe docker:lint
poe docker:test
poe docker:quality
```

### フロントエンド開発

```bash
# 品質チェック（一括）
npm run fe:quality          # Lint修正 + Format + Type check + Test

# 個別実行
npm run fe:lint             # Lintチェック
npm run fe:lint:fix         # Lint自動修正
npm run fe:format           # コードフォーマット
npm run fe:typecheck        # 型チェック
npm run fe:typegen          # OpenAPI型定義を再生成 ✨自動でバックエンド取得
npm run fe:test             # テスト実行
npm run fe:test:e2e:smoke   # E2Eスモークテスト

# シェル接続
npm run fe:shell
```

### データベース操作

```bash
# データベース管理
npm run db:reset        # データベースをリセット
npm run db:init         # サンプルデータを投入
npm run db:shell        # 開発DBに接続 ✨一発接続
npm run db:shell:test   # テストDBに接続 ✨NEW
npm run db:info         # DB接続情報を表示 ✨NEW

# マイグレーション
npm run alembic:upgrade   # 最新バージョンにアップグレード
npm run alembic:downgrade # 1つ前のバージョンに戻す
npm run alembic:history   # マイグレーション履歴を表示
npm run alembic:current   # 現在のバージョンを表示
```

### 全体の品質チェック

```bash
# すべての品質チェック（自動修正あり）
npm run quality        # Lint修正 + Format + Type check + Test (5分)
npm run quality:full   # 上記 + Smoke E2E (10分)

# CI相当のチェック（自動修正なし）
npm run ci             # 標準CI
npm run ci:smoke       # CI + Smoke（最速）

# 個別実行
npm run lint           # 全体Lint
npm run lint:fix       # 全体Lint自動修正
npm run format         # 全体フォーマット
npm run typecheck      # 全体型チェック
npm run test           # 全体テスト
npm run test:smoke     # スモークテスト (30秒)
```

### テスト実行

```bash
# スモークテスト（最速 - 30秒）
npm run test:smoke          # ページが開くかだけをチェック

# クリティカルパステスト（10分）
npm run fe:test:e2e         # P0の重要フローをテスト

# 全体テスト
npm run test                # Unit + Integration
npm run be:test             # バックエンドのみ
npm run fe:test             # フロントエンドのみ
```

**推奨ワークフロー:**
1. **コミット前**: `npm run quality` (5分)
2. **PR作成時**: `npm run quality:full` (10分)
3. **リリース前**: `npm run ci` + E2E全体 (30分)

詳細: [docs/project/TESTING_QUICKSTART.md](docs/project/TESTING_QUICKSTART.md)

### Git Workflow

**📖 詳細は [Git Workflow Guide](docs/project/GIT_WORKFLOW.md) 参照**

**重要ルール:**
1. **main ブランチへの直接コミット禁止** - 必ず機能ブランチ経由
2. **コミットメッセージ形式**: `type: 日本語タイトル` (typeは英語、タイトル・本文は日本語)
3. **バックエンド変更時は typegen 必須**: `npm run fe:typegen`
4. **PR作成前の品質チェック必須**: `npm run quality`
5. **Co-Authored-By 必須**: Claude コミット時は必ず含める

```bash
# 推奨ワークフロー
git checkout -b feature/xxx
# ... 開発 ...
npm run fe:typegen  # バックエンド変更時
npm run quality     # 品質チェック
git commit -m "feat: 機能追加

詳細説明

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
git push -u origin feature/xxx
gh pr create
```

---

## AI Assistant Guidelines

### DO
1. Follow naming conventions strictly
2. Use absolute imports in backend
3. **Run quality checks before committing**: `npm run quality`
4. **Update OpenAPI types after backend changes**: `npm run fe:typegen` (自動でDocker経由)
5. Write tests for new features
6. Document domain logic with docstrings
7. Commit frequently with atomic changes (avoid large bulk commits). Commits do not require user confirmation.
8. Create feature branches for new work (e.g., `feature/order-filters`).
9. **Add comprehensive logging from the start** (see Logging Guidelines below)
10. **Use sub-routing for all page tabs/sub-views** to ensure bookmarkability and support hierarchical access control.
11. **Always use Docker-based commands** via Makefile or `docker compose exec` - avoid local npm/python execution

### DON'T
1. Bypass service layer (routes → repositories directly)
2. Create circular dependencies
3. Commit without quality checks
4. Mix business logic in components
5. Use `any` types in TypeScript
6. Hardcode configuration values
7. Write code without logging critical operations
8. **DIRECTLY MODIFY PROTECTED FILES** (See below)

### 🔒 PROTECTED FILES (NEVER MODIFY DIRECTLY)
以下のファイルはシステムの基盤であり、いかなる理由があっても直接編集してはいけません。
1. **`backend/alembic/baseline_*.sql`**: リリース済みのスキーマベースライン。
2. **`backend/alembic/versions/*.py`**: 既存のマイグレーション履歴。
3. **`backend/alembic/sql_utils.py`**: マイグレーションユーティリティ。
4. **`frontend/src/types/generated/`**: 自動生成される型定義ファイル。

**変更が必要な場合の正攻法:**
- スキーマ変更は常に `alembic revision` で新しいファイルを作成すること。
- テスト環境のみの調整が必要な場合は `scripts/setup_test_db.py` 等のスクリプト側で対応すること。

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

---

### Error Handling Guidelines

**CRITICAL: Implement comprehensive error handling from the start. Don't ship code without proper error handling.**

#### Exception Hierarchy

Always handle exceptions in order from most specific to most general:

```python
# GOOD: Specific exceptions first
try:
    response = await http_client.post(url, json=data)
    response.raise_for_status()
    return response.json()
except httpx.HTTPStatusError as e:
    logger.error(
        "HTTP error from external API",
        extra={
            "url": masked_url,
            "status_code": e.response.status_code,
            "response_body": e.response.text[:500],
        },
    )
    raise
except httpx.TimeoutException as e:
    logger.error("API request timeout", extra={"url": masked_url, "timeout": timeout})
    raise
except httpx.RequestError as e:
    logger.error("API request failed", extra={"url": masked_url, "error": str(e)})
    raise
except Exception as e:
    logger.exception("Unexpected error in API call", extra={"url": masked_url})
    raise

# BAD: Generic catch-all only
try:
    result = external_api.call()
except Exception:
    return None  # Lost error context!
```

#### Database Error Handling

```python
# GOOD: Handle specific DB errors with context
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

try:
    db.add(entity)
    db.commit()
except IntegrityError as exc:
    db.rollback()
    logger.error(
        "Database integrity error",
        extra={
            "entity_type": entity.__class__.__name__,
            "entity_id": getattr(entity, "id", None),
            "error": str(exc.orig)[:500] if exc.orig else str(exc)[:500],
        },
    )
    raise HTTPException(status_code=400, detail="Entity already exists or constraint violation")
except SQLAlchemyError as exc:
    db.rollback()
    logger.error(
        "Database operation failed",
        extra={
            "entity_type": entity.__class__.__name__,
            "operation": "create",
            "error": str(exc)[:500],
        },
    )
    raise HTTPException(status_code=500, detail="Database operation failed")
```

#### API Response Error Handling

```python
# GOOD: Safe error responses (no exception leakage)
@router.post("/items")
def create_item(item: ItemCreate, db: Session = Depends(get_db)):
    try:
        result = service.create_item(db, item)
        return result
    except IntegrityError:
        # Don't leak exception details to client
        raise HTTPException(status_code=400, detail="Item already exists")
    except Exception:
        logger.exception("Unexpected error creating item")
        raise HTTPException(status_code=500, detail="Internal server error")

# BAD: Exception leakage
@router.post("/items")
def create_item(item: ItemCreate):
    result = service.create_item(item)  # Unhandled exception propagates to client!
    return result
```

#### Frontend Error Handling

```typescript
// GOOD: Specific error handling with user feedback
try {
  await createItem(formData);
  showSuccessToast("Item created successfully");
  navigate("/items");
} catch (error) {
  if (error instanceof HTTPError) {
    const status = error.response.status;
    if (status === 400) {
      showErrorToast("Invalid input. Please check your data.");
    } else if (status === 409) {
      showErrorToast("Item already exists.");
    } else {
      showErrorToast("Failed to create item. Please try again.");
    }
  } else {
    console.error("Unexpected error:", error);
    showErrorToast("An unexpected error occurred.");
  }
}

// BAD: Silent failure
try {
  await createItem(formData);
} catch (error) {
  console.log(error); // User has no feedback!
}
```

#### When to Raise vs Return

```python
# RAISE: When the operation cannot complete
def get_user_by_id(db: Session, user_id: int) -> User:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

# RETURN None: When absence is valid
def find_active_session(db: Session, user_id: int) -> Session | None:
    session = db.query(Session).filter(
        Session.user_id == user_id,
        Session.active == True
    ).first()
    # None is a valid result (no active session)
    return session
```

---

### Guard Processing and Access Control

**CRITICAL: Always implement proper access control for sensitive operations.**

#### Route-Level Guards (Frontend)

```tsx
// GOOD: Use AccessGuard for admin-only pages
import { AccessGuard } from "@/components/auth/AccessGuard";

function SystemSettingsPage() {
  return (
    <AccessGuard roles={["admin"]}>
      <SystemSettingsContent />
    </AccessGuard>
  );
}

// GOOD: Use routeKey for automatic permission lookup
function LogViewerPage() {
  return (
    <AccessGuard routeKey="ADMIN.LOGS">
      <LogViewerContent />
    </AccessGuard>
  );
}

// BAD: No guard on sensitive page
function AdminDashboard() {
  return <AdminContent />; // Anyone can access!
}
```

#### Permission Configuration

Always add new admin routes to `frontend/src/features/auth/permissions/config.ts`:

```typescript
// Add to routePermissions array
{ routeKey: "ADMIN.NEW_FEATURE", path: "/admin/new-feature", allowedRoles: ["admin"] },
```

#### API-Level Guards (Backend)

```python
# GOOD: Use dependency injection for auth
from app.presentation.api.routes.auth.auth_router import get_current_admin

@router.get("/admin/sensitive-data")
def get_sensitive_data(
    db: Session = Depends(get_db),
    _current_admin = Depends(get_current_admin)  # Enforces admin role
):
    return service.get_sensitive_data(db)

# GOOD: Manual permission check when needed
from app.presentation.api.routes.auth.auth_router import get_current_user

@router.delete("/items/{item_id}")
def delete_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    if "admin" not in current_user.roles:
        raise HTTPException(status_code=403, detail="Admin role required")

    service.delete_item(db, item_id)
    return {"message": "Item deleted"}

# BAD: No authentication check
@router.delete("/items/{item_id}")
def delete_item(item_id: int, db: Session = Depends(get_db)):
    service.delete_item(db, item_id)  # Anyone can delete!
    return {"message": "Item deleted"}
```

#### Input Validation Guards

```python
# GOOD: Validate input at API boundary
from pydantic import BaseModel, Field, field_validator

class ItemCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    quantity: int = Field(..., gt=0)

    @field_validator("name")
    def validate_name(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Name cannot be empty or whitespace")
        return v.strip()

@router.post("/items")
def create_item(item: ItemCreate, db: Session = Depends(get_db)):
    # Pydantic validation already occurred
    return service.create_item(db, item)

# BAD: No validation
@router.post("/items")
def create_item(data: dict, db: Session = Depends(get_db)):
    # Raw dict, no validation!
    return service.create_item(db, data)
```

#### Database Constraint Guards

```python
# GOOD: Check constraints before operation
def assign_lot_to_order(db: Session, lot_id: int, order_id: int):
    lot = db.query(Lot).filter(Lot.id == lot_id).first()
    if not lot:
        raise HTTPException(status_code=404, detail="Lot not found")

    if lot.available_quantity <= 0:
        raise HTTPException(status_code=400, detail="Lot has no available quantity")

    if lot.is_expired():
        raise HTTPException(status_code=400, detail="Cannot assign expired lot")

    # Proceed with assignment
    allocation = Allocation(lot_id=lot_id, order_id=order_id, ...)
    db.add(allocation)
    db.commit()

# BAD: Let database catch constraint violations
def assign_lot_to_order(db: Session, lot_id: int, order_id: int):
    allocation = Allocation(lot_id=lot_id, order_id=order_id, ...)
    db.add(allocation)  # May fail with cryptic DB error!
    db.commit()
```

#### Operation Permission Guards

```typescript
// GOOD: Check permissions before showing UI
import { usePermission } from "@/features/auth/permissions";

function ItemActions({ item }) {
  const canDelete = usePermission({ operation: "inventory:delete" });
  const canUpdate = usePermission({ operation: "inventory:update" });

  return (
    <div>
      {canUpdate && <EditButton onClick={() => editItem(item)} />}
      {canDelete && <DeleteButton onClick={() => deleteItem(item)} />}
    </div>
  );
}

// BAD: Show all actions to all users
function ItemActions({ item }) {
  return (
    <div>
      <EditButton onClick={() => editItem(item)} />
      <DeleteButton onClick={() => deleteItem(item)} />  {/* Everyone sees this! */}
    </div>
  );
}
```

---

### Common Tasks Checklists

#### グローバルナビゲーションに新機能を追加する場合

**CRITICAL: 以下の3箇所を必ず更新してください。忘れるとシステム設定ページで表示されません。**

1. **GlobalNavigation.tsx** - メニュー項目を追加
   ```tsx
   <NavItem to="/new-feature" feature="new_feature" label="新機能" />
   ```

2. **`frontend/src/constants/features.ts`** - 機能キーを追加
   ```typescript
   export const AVAILABLE_FEATURES = [
     // ... existing
     "new_feature",  // ← 追加
   ] as const;

   export const FEATURE_LABELS: Record<FeatureKey, string> = {
     // ... existing
     new_feature: "新機能",  // ← 追加
   };
   ```

3. **`frontend/src/features/auth/permissions/config.ts`** - ルート権限を追加
   ```typescript
   {
     routeKey: "NEW_FEATURE",
     path: "/new-feature",
     allowedRoles: ["admin", "user", "guest"]  // 適切なロールを指定
   },
   ```

**これにより:**
- グローバルナビゲーションにメニューが表示される
- システム設定の「セキュリティ・アクセス制御」で表示/非表示を制御可能
- ロールベースのアクセス制御が適用される

#### 新しいadmin専用ページを追加する場合

1. **ルート定義** - `MainRoutes.tsx`
   ```tsx
   <Route
     path="/admin/new-page"
     element={
       <AccessGuard roles={["admin"]}>
         <NewAdminPage />
       </AccessGuard>
     }
   />
   ```

2. **権限設定** - `config.ts`
   ```typescript
   { routeKey: "ADMIN.NEW_PAGE", path: "/admin/new-page", allowedRoles: ["admin"] },
   ```

3. **グローバルナビに追加** (オプション)
   - 上記「グローバルナビゲーションに新機能を追加」を参照

---

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
