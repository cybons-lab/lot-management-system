# プロジェクト全体リファクタリング実行計画書
## Backend First Strategy - Zombie Code Elimination & Structural Cleanup

**作成日**: 2025-11-23
**対象プロジェクト**: ロット管理システム v2.0
**戦略**: Backend First → Frontend Cleanup → Refactor
**推定削減**: ~980行（Backend 516行 + Frontend 464行）
**重要度**: 🔴 Critical (スキーマ競合あり)

---

## エグゼクティブサマリー

### Backend 発見事項
- **Deprecated ディレクトリ**: 3ファイル（84行）即座削除可能
- **🔴 CRITICAL スキーマ競合**: ProductBase/WarehouseOut が2箇所で定義され、ルーターとサービスで異なるスキーマを使用
- **未使用コード**: サービス2件、リポジトリ1件、ルーター1件（計~293行）
- **廃止予定API**: 2エンドポイント（2026-02-15削除予定）

### Frontend 発見事項
- **即座削除可能**: 4ファイル + 1関数（464行）
- **廃止API呼び出し**: 7ファイルが旧エンドポイントを使用
- **コンポーネント名衝突**: OrderLineCard が3箇所で異なる実装
- **インライン定義**: 2コンポーネント（75行）を抽出すべき
- **レガシーフィールド**: order_no 使用が13ファイル

---

## 🚨 P0: CRITICAL - 即座実行必須（今日中）

### Backend: スキーマ競合の解消

#### 1. ProductBase 競合の修正

**問題**: ルーターとサービスが異なるスキーマを import している
- Router: `masters_schema.py` (DDL v2.2)
- Service: `products_schema.py` (OLD, フィールド名が異なる)

**実行コマンド**:
```bash
cd /home/user/lot-management-system/backend

# Step 1: サービスのimportを修正
# File: app/services/masters/products_service.py
# Line 9 を変更:
# FROM: from app.schemas.masters.products_schema import ProductCreate, ProductUpdate
# TO:   from app.schemas.masters.masters_schema import ProductCreate, ProductUpdate
```

**Edit 指示**:
```python
# app/services/masters/products_service.py:9
OLD:
from app.schemas.masters.products_schema import ProductCreate, ProductUpdate

NEW:
from app.schemas.masters.masters_schema import ProductCreate, ProductUpdate
```

**Step 2: 重複スキーマファイルを削除**:
```bash
rm app/schemas/masters/products_schema.py
```

**Step 3: __init__.py の修正**:
```python
# app/schemas/masters/__init__.py
# Line 5 を削除:
# DELETE: from app.schemas.masters.products_schema import *
```

---

#### 2. WarehouseOut 競合の解消

**問題**: 2つのWarehouseOutが存在（masters_schema版が完全版）

**実行コマンド**:
```bash
cd /home/user/lot-management-system/backend

# Step 1: 重複ファイルを削除
rm app/schemas/masters/warehouses_schema.py

# Step 2: __init__.py の修正
# File: app/schemas/masters/__init__.py
# Line 6 を削除:
# DELETE: from app.schemas.masters.warehouses_schema import *
```

---

#### 3. Broken Import の削除

**実行コマンド**:
```bash
cd /home/user/lot-management-system/backend

# 壊れたimportを含むdeprecatedファイルを削除
rm deprecated/routes/orders.py
```

---

### Backend P0 検証

**テスト実行**:
```bash
cd backend
source .venv/bin/activate

# Import エラーチェック
python -c "from app.schemas.masters import ProductBase, WarehouseOut; print('✅ Imports OK')"

# Lintチェック
ruff check app/

# サーバー起動確認
uvicorn app.main:app --reload &
sleep 5
curl http://localhost:8000/api/health
pkill -f uvicorn
```

---

## Phase 1: Backend大掃除（今週中）

### 1A. Deprecated ディレクトリの削除

**実行コマンド**:
```bash
cd /home/user/lot-management-system/backend

# Deprecated ディレクトリ全体を削除（削除予定日: 2025-12-31 → 前倒し実行）
rm -rf deprecated/

# 確認: main.pyでdeprecatedからのimportがないことを確認済み
```

**影響**: なし（すでに main.py から切り離されている）

---

### 1B. 未使用リポジトリの削除

**実行コマンド**:
```bash
cd /home/user/lot-management-system/backend

# 未使用のreport_repo.pyを削除
rm app/repositories/report_repo.py
```

**理由**: `fetch_forecast_order_pairs()` がどこからも呼ばれていない

---

### 1C. 未使用サービスの削除（要検証）

**調査必須**: `allocation_service.py` の機能が `allocations_service.py` と重複しているか確認

**実行コマンド**（検証後）:
```bash
cd /home/user/lot-management-system/backend

# allocation_service.py が完全に未使用であることを確認後削除
# NOTE: allocations_service.py (827行) が実際に使われているサービス

# Step 1: 機能重複の確認
diff -u app/services/allocation/allocation_service.py app/services/allocation/allocations_service.py

# Step 2: 未使用であることを確認
grep -r "AllocationService" app/ --exclude-dir=allocation

# Step 3: 削除実行
rm app/services/allocation/allocation_service.py

# Step 4: __init__.py から削除
# File: app/services/allocation/__init__.py
# Line 5 を削除:
# DELETE: from app.services.allocation.allocation_service import *
```

---

### 1D. 未使用ルーターの処理

**Option A: 完全削除（スキーマ実装予定なし）**
```bash
cd /home/user/lot-management-system/backend

# orders_validate_router.py を削除
rm app/api/routes/orders/orders_validate_router.py

# 依存するサービスを削除
rm app/services/orders/validation_service.py

# main.py の確認（すでにコメントアウト済み）
# Line 31: # from app.api.routes.orders.orders_validate_router import router as orders_validate_router
```

**Option B: 将来実装予定（保留）**
- GitHub Issue作成: "Implement OrderValidation* schemas or remove validation router"
- 期限: 2026-Q1

**推奨**: Option A（削除）

---

### 1E. Deprecated API エンドポイントの削除（2026-02-15期限）

**現在**: 互換性維持のため保留
**アクション**: Deprecation Warningを追加（削除は Phase 2B-Frontend移行後）

**実行コマンド**:
```python
# app/api/routes/allocations/allocations_router.py:33-62
# /allocations/drag-assign エンドポイント

# 削除コメントを強化:
# Line 35 付近に追加:
@router.post(
    "/drag-assign",
    deprecated=True,  # ← 追加（OpenAPI仕様に反映）
    summary="[DEPRECATED] Drag and drop allocation (use /allocation-suggestions/manual)",
    ...
)
```

**同様に**:
```python
# app/api/routes/admin/admin_router.py:108-124
# /admin/seeds エンドポイント

@router.post(
    "/seeds",
    deprecated=True,  # ← 追加
    summary="[DEPRECATED] Use /admin/simulate-seed-data",
    ...
)
```

---

### Phase 1 削除ファイルサマリー

**即座削除可能**:
```bash
# Backend 削除リスト（P0 + Phase 1）
/home/user/lot-management-system/backend/app/schemas/masters/products_schema.py
/home/user/lot-management-system/backend/app/schemas/masters/warehouses_schema.py
/home/user/lot-management-system/backend/deprecated/routes/orders.py
/home/user/lot-management-system/backend/deprecated/routes/alerts.py
/home/user/lot-management-system/backend/deprecated/routes/shipping.py
/home/user/lot-management-system/backend/app/repositories/report_repo.py
/home/user/lot-management-system/backend/app/api/routes/orders/orders_validate_router.py
/home/user/lot-management-system/backend/app/services/orders/validation_service.py
/home/user/lot-management-system/backend/app/services/allocation/allocation_service.py

# ディレクトリ
/home/user/lot-management-system/backend/deprecated/
```

**LOC削減**: ~516行

---

## Phase 2: Frontend大掃除（今週中）

### 2A. 即座削除可能なファイル

**実行コマンド**:
```bash
cd /home/user/lot-management-system/frontend

# Step 1: .old ファイルの削除
rm src/features/allocations/pages/LotAllocationPage.tsx.old

# Step 2: 孤立ページの削除（ルーティング未登録）
rm src/features/orders/OrdersPage.tsx

# Step 3: 未使用型定義ファイルの削除
rm src/@types/aliases.ts
```

---

### 2B. Misplaced Directory の修正

**実行コマンド**:
```bash
cd /home/user/lot-management-system/frontend

# Step 1: 正しい場所へ移動
mv src/features/forecast/components/ForecastFileUploadCard.tsx \
   src/features/forecasts/components/ForecastFileUploadCard.tsx

# Step 2: Import修正
# File: src/features/forecasts/pages/ForecastImportPage.tsx
# Change import path:
# FROM: import { ForecastFileUploadCard } from "@/features/forecast/components/ForecastFileUploadCard";
# TO:   import { ForecastFileUploadCard } from "../components/ForecastFileUploadCard";

# Step 3: 空ディレクトリを削除
rmdir src/features/forecast/components
rmdir src/features/forecast
```

---

### 2C. Deprecated Hook 関数の削除

**実行コマンド**:
```bash
# File: src/hooks/ui/useDialog.ts
# Lines 198-210 を削除

# DELETE:
/**
 * 複数のダイアログを管理するためのフック
 * @deprecated Currently not used anywhere in the codebase
 */
export function useMultipleDialogs<T extends Record<string, unknown>>() {
  const dialogs = {} as Record<keyof T, ReturnType<typeof useDialog>>;
  for (const key in dialogs) {
    dialogs[key] = useDialog();
  }
  return dialogs;
}
```

---

### Phase 2 削除ファイルサマリー

**即座削除可能**:
```bash
# Frontend 削除リスト（Phase 2A-2C）
/home/user/lot-management-system/frontend/src/features/allocations/pages/LotAllocationPage.tsx.old
/home/user/lot-management-system/frontend/src/features/orders/OrdersPage.tsx
/home/user/lot-management-system/frontend/src/@types/aliases.ts
/home/user/lot-management-system/frontend/src/features/forecast/  # ディレクトリ削除（移動後）
```

**LOC削減**: ~377行（useMultipleDialogs除く）

---

## Phase 3: Frontend 構造改善（来週）

### 3A. インラインコンポーネントの抽出

**対象ファイル**: `src/features/allocations/components/orders/OrderAndLineListPane.tsx`

**実行計画**:

#### Step 1: OrderCard の抽出（Lines 101-137）
```bash
# 新規ファイル作成
# File: src/features/allocations/components/orders/OrderSummaryCard.tsx
```

**コンポーネント定義**:
```typescript
// src/features/allocations/components/orders/OrderSummaryCard.tsx
import type { Order } from "@/shared/types/aliases";

interface OrderSummaryCardProps {
  order: Order;
  isSelected: boolean;
  onClick: () => void;
  unallocatedQty: number;
}

export function OrderSummaryCard({ order, isSelected, onClick, unallocatedQty }: OrderSummaryCardProps) {
  // Lines 101-137 の内容を移動
}
```

**元ファイル修正**:
```typescript
// OrderAndLineListPane.tsx
// Line 5 付近に追加:
import { OrderSummaryCard } from "./OrderSummaryCard";

// Lines 101-137 を削除
```

---

#### Step 2: OrderLineCard の抽出（Lines 139-176）

**注意**: **名前衝突が発生**するため、異なる名前で作成

```bash
# 新規ファイル作成（衝突回避のため"Summary"を含める）
# File: src/features/allocations/components/orders/OrderLineSummaryCard.tsx
```

**コンポーネント定義**:
```typescript
// src/features/allocations/components/orders/OrderLineSummaryCard.tsx
import type { OrderLine } from "@/shared/types/aliases";

interface OrderLineSummaryCardProps {
  line: OrderLine;
  isSelected: boolean;
  onSelect: () => void;
}

export function OrderLineSummaryCard({ line, isSelected, onSelect }: OrderLineSummaryCardProps) {
  // Lines 139-176 の内容を移動
}
```

**元ファイル修正**:
```typescript
// OrderAndLineListPane.tsx
import { OrderLineSummaryCard } from "./OrderLineSummaryCard";

// Lines 139-176 を削除
// 使用箇所を OrderLineSummaryCard に変更
```

---

#### Step 3: Helper関数の抽出（Optional）

**対象**: `getStatusLabel`, `getStatusColor` (Lines 179-206)

**条件**: 他のファイルでも使用されている場合のみ抽出

**実行コマンド**:
```bash
# 他での使用を確認
grep -r "getStatusLabel\|getStatusColor" src/features/allocations/ \
  --exclude=OrderAndLineListPane.tsx

# 使用されていれば抽出:
# File: src/features/allocations/utils/order-status.ts
```

---

### 3B. OrderLineCard 名前衝突の解消

**現状**: 3つの異なる `OrderLineCard` が存在

**解消計画**:

#### 1. allocations/components/orders/OrderLineCard.tsx
```bash
# リネーム
mv src/features/allocations/components/orders/OrderLineCard.tsx \
   src/features/allocations/components/orders/AllocationOrderLineCard.tsx

# Import修正（自動検索置換）
find src -name "*.tsx" -o -name "*.ts" | xargs sed -i \
  's|from "./OrderLineCard"|from "./AllocationOrderLineCard"|g'
find src -name "*.tsx" -o -name "*.ts" | xargs sed -i \
  's|from "../orders/OrderLineCard"|from "../orders/AllocationOrderLineCard"|g'

# Named import修正
find src -name "*.tsx" -o -name "*.ts" | xargs sed -i \
  's|OrderLineCard|AllocationOrderLineCard|g'
```

**影響範囲**:
- FlatAllocationList.tsx
- LotAllocationPage.tsx
- 他の allocations 配下コンポーネント

---

#### 2. orders/components/OrderLineCard/index.tsx
```bash
# リネーム
mv src/features/orders/components/OrderLineCard \
   src/features/orders/components/OrderLineDetailCard

# Barrel export の変更
# File: src/features/orders/components/OrderLineDetailCard/index.tsx
# export を OrderLineDetailCard に変更
```

**理由**: このコンポーネントは詳細情報を表示するため "Detail" を含める

---

#### 3. インライン OrderLineCard (Phase 3A で解消済み)
- OrderLineSummaryCard.tsx として抽出済み

---

### 3C. Deprecated API呼び出しの移行

**優先度**: 🔴 High（2026-02-15期限）

#### 対象ファイルと移行内容

**1. hooks/mutations/useAllocationMutations.ts**
```typescript
// Line 10, 45 の変更

// OLD:
import { createAllocations } from "@/features/allocations/api";

const mutation = useMutation({
  mutationFn: (data: AllocationCreateRequest) => createAllocations(data),
});

// NEW:
import { createManualAllocationSuggestion, commitAllocation } from "@/features/allocations/api";

const mutation = useMutation({
  mutationFn: async (data: ManualAllocationRequest) => {
    // Step 1: 手動割り当て提案を作成
    const suggestions = await createManualAllocationSuggestion(data);

    // Step 2: 割り当てをコミット
    return await commitAllocation({
      order_id: data.order_id,
      allocations: suggestions.map(s => ({
        lot_id: s.lot_id,
        quantity: s.quantity,
      })),
    });
  },
});
```

---

**2. hooks/mutations/useDragAssign.ts**

**現状チェック**: すでに新API (`/allocation-suggestions/manual`) を使用中
**アクション**: Hook名を変更（オプショナル）

```bash
# リネーム（オプション）
mv src/hooks/mutations/useDragAssign.ts \
   src/hooks/mutations/useManualAllocationSuggestion.ts

# Import修正
find src -name "*.tsx" -o -name "*.ts" | xargs sed -i \
  's|useDragAssign|useManualAllocationSuggestion|g'
```

---

**3. features/allocations/api.ts - Deprecated関数の削除**

**前提**: すべての呼び出し元が新APIに移行済みであることを確認

```typescript
// Lines 229-231, 239-254, 259-268 を削除

// DELETE:
/**
 * @deprecated Use createManualAllocationSuggestion instead
 */
export const dragAssignAllocation = ...

/**
 * @deprecated Use getCandidateLotsForAllocation instead
 */
export const getCandidateLots = ...

/**
 * @deprecated Use commitAllocation instead
 */
export const createAllocations = ...
```

**削除前チェック**:
```bash
# 使用箇所の検索
grep -r "dragAssignAllocation\|getCandidateLots\|createAllocations" src/ \
  --exclude=api.ts \
  --include="*.ts" --include="*.tsx"

# 結果が0件なら削除実行
```

---

### 3D. Legacy Field Migration（order_no → order_number）

**影響範囲**: 13ファイル
**期限**: 2026-02-15

#### Step 1: 型定義の削除

```typescript
// File: src/features/allocations/types/index.ts
// Line 21 削除

// OLD:
export interface Order {
  order_id: number;
  order_no: string;  // ← DELETE
  order_number: string;
  ...
}

// NEW:
export interface Order {
  order_id: number;
  order_number: string;  // single source of truth
  ...
}
```

---

#### Step 2: 使用箇所の修正（7ファイル）

**自動置換**:
```bash
# order_no フィールドアクセスを order_number に変更
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i \
  's/\.order_no\b/.order_number/g'

# order_no: の定義を order_number: に変更
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i \
  's/order_no:/order_number:/g'
```

**手動確認が必要なファイル**:
1. `factories/order-factory.ts:41`
2. `shared/libs/admin-api.ts:51`
3. `shared/libs/normalize.ts:37,134`
4. `utils/validators/order-schemas.ts:7`
5. `hooks/api/useOrderQuery.ts:26`

---

#### Step 3: Type定義の@deprecated削除（移行期限後）

```typescript
// File: src/shared/types/aliases.ts
// Lines 181, 200 の @deprecated コメントと order_no を削除

// 2026-02-15 以降:
export interface Order {
  order_id: number;
  order_number: string;  // order_no は完全削除
  ...
}
```

---

### 3E. Legacy Types Cleanup

**対象**: `shared/types/legacy/index.ts`（3ファイルから参照されている）

#### Step 1: Import移行

```bash
# 参照ファイル:
# 1. features/orders/components/allocation/LotListWithAllocation.tsx
# 2. features/orders/components/display/OrderCard.tsx
# 3. features/orders/components/filters/OrderFilters.tsx

# 自動置換:
find src/features/orders -name "*.tsx" | xargs sed -i \
  's|from "@/shared/types/legacy"|from "@/shared/types/aliases"|g'
```

#### Step 2: 削除

```bash
rm -rf src/shared/types/legacy/
```

---

## Phase 4: 共通型の整備（来月）

### 4A. Master Data Display Types の作成

**新規ファイル**: `src/shared/types/master-displays.ts`

```typescript
// src/shared/types/master-displays.ts

/**
 * Master Data Display Types
 * Corresponds to backend *Summary types
 */

export interface CustomerDisplay {
  customer_id: number;
  customer_code: string;
  customer_name: string;
}

export interface ProductDisplay {
  product_id: number;
  product_code: string;
  product_name: string;
  base_unit: string;
}

export interface WarehouseDisplay {
  warehouse_id: number;
  warehouse_code: string;
  warehouse_name: string;
}

export interface DeliveryPlaceDisplay {
  delivery_place_id: number;
  delivery_place_code: string;
  delivery_place_name: string;
}

export interface SupplierDisplay {
  supplier_id: number;
  supplier_code: string;
  supplier_name: string;
}

export interface UserDisplay {
  user_id: number;
  username: string;
  display_name: string;
}

export interface RoleDisplay {
  role_id: number;
  role_code: string;
  role_name: string;
}
```

**移行**: 既存のインライン定義を段階的に置き換え

---

### 4B. Common API Response Types の作成

**新規ファイル**: `src/shared/types/api-responses.ts`

```typescript
// src/shared/types/api-responses.ts

/**
 * Common API Response Patterns
 */

export interface ListResponse<T> {
  items: T[];
  total: number;
}

export interface PageResponse<T> extends ListResponse<T> {
  page: number;
  page_size: number;
}

export interface ErrorResponse {
  detail: string;
  code?: string;
  field?: string;
}
```

**使用例**:
```typescript
// Before:
interface WarehouseListResponse {
  items: Warehouse[];
  total: number;
}

// After:
import type { ListResponse } from "@/shared/types/api-responses";
type WarehouseListResponse = ListResponse<Warehouse>;
```

---

## Phase 5: 品質チェック & CI確認（各Phase後実行）

### Backend品質チェック

```bash
cd /home/user/lot-management-system/backend
source .venv/bin/activate

# Lint check
ruff check app/

# Format check
ruff format --check app/

# Max lines check
python tools/check_max_lines.py

# Tests（integration除く）
pytest -q -k "not integration"

# Import check
python -c "from app.main import app; print('✅ App imports OK')"

# Server起動確認
uvicorn app.main:app --reload &
SERVER_PID=$!
sleep 5
curl http://localhost:8000/api/health
kill $SERVER_PID
```

---

### Frontend品質チェック

```bash
cd /home/user/lot-management-system/frontend

# Type check
npm run typecheck

# Lint check
npm run lint --max-warnings=0

# Format check
npm run format:check

# Circular dependency check
npx madge src --circular --extensions ts,tsx

# Build check
npm run build
```

---

### OpenAPI型生成

```bash
cd /home/user/lot-management-system

# Backend起動
cd backend
uvicorn app.main:app --reload &
sleep 5

# Frontend型生成
cd ../frontend
npm run generate:api

# 差分確認
git diff src/@types/api.d.ts

# Backend停止
pkill -f uvicorn
```

---

## 実行スケジュール（推奨）

### Day 1（今日）: P0 Critical Fix
- [ ] P0-1: ProductBase スキーマ競合修正
- [ ] P0-2: WarehouseOut スキーマ競合修正
- [ ] P0-3: Broken import削除（deprecated/routes/orders.py）
- [ ] Backend品質チェック実行
- [ ] **Git Commit**: `fix: resolve critical schema conflicts (ProductBase, WarehouseOut)`

### Day 2-3: Phase 1 Backend Cleanup
- [ ] 1A: deprecated/ ディレクトリ削除
- [ ] 1B: 未使用リポジトリ削除
- [ ] 1C: 未使用サービス削除（検証後）
- [ ] 1D: 未使用ルーター削除
- [ ] 1E: Deprecated API に警告追加
- [ ] Backend品質チェック実行
- [ ] **Git Commit**: `refactor(backend): remove unused services, routers, and deprecated code`

### Day 4-5: Phase 2 Frontend Cleanup
- [ ] 2A: .old ファイル、孤立ページ削除
- [ ] 2B: forecast/ ディレクトリ移動・削除
- [ ] 2C: useMultipleDialogs 削除
- [ ] Frontend品質チェック実行
- [ ] **Git Commit**: `refactor(frontend): remove obsolete files and orphaned pages`

### Week 2: Phase 3 Frontend Refactoring
- [ ] 3A: インラインコンポーネント抽出
- [ ] 3B: OrderLineCard 名前衝突解消
- [ ] 3C: Deprecated API移行（1-2ファイルずつ）
- [ ] 3D: order_no → order_number 移行
- [ ] 3E: legacy types cleanup
- [ ] Frontend品質チェック実行
- [ ] **Git Commits**: 各サブフェーズごとに分割コミット

### Week 3-4: Phase 4 Common Types
- [ ] 4A: master-displays.ts 作成
- [ ] 4B: api-responses.ts 作成
- [ ] 既存コードの段階的移行
- [ ] **Git Commit**: `feat(frontend): add common master display and API response types`

### Week 4: Final QA
- [ ] 全Phase の品質チェック再実行
- [ ] E2Eテスト（手動）
- [ ] OpenAPI型生成確認
- [ ] Documentation更新
- [ ] **Git Commit**: `docs: update CLAUDE.md and architecture docs after refactoring`

---

## 削除ファイル完全リスト（Codex用）

### Backend削除対象（P0 + Phase 1）

```bash
# P0 Critical
/home/user/lot-management-system/backend/app/schemas/masters/products_schema.py
/home/user/lot-management-system/backend/app/schemas/masters/warehouses_schema.py
/home/user/lot-management-system/backend/deprecated/routes/orders.py

# Phase 1
/home/user/lot-management-system/backend/deprecated/routes/alerts.py
/home/user/lot-management-system/backend/deprecated/routes/shipping.py
/home/user/lot-management-system/backend/app/repositories/report_repo.py
/home/user/lot-management-system/backend/app/api/routes/orders/orders_validate_router.py
/home/user/lot-management-system/backend/app/services/orders/validation_service.py
/home/user/lot-management-system/backend/app/services/allocation/allocation_service.py
```

### Frontend削除対象（Phase 2）

```bash
# Phase 2
/home/user/lot-management-system/frontend/src/features/allocations/pages/LotAllocationPage.tsx.old
/home/user/lot-management-system/frontend/src/features/orders/OrdersPage.tsx
/home/user/lot-management-system/frontend/src/@types/aliases.ts
/home/user/lot-management-system/frontend/src/features/forecast/  # ディレクトリ（移動後）
/home/user/lot-management-system/frontend/src/shared/types/legacy/  # ディレクトリ（Phase 3E）
```

---

## 推定効果

### コード削減
- **Backend**: ~516行削除
- **Frontend**: ~464行削除
- **合計**: ~980行削除（全体の約5%）

### 構造改善
- **スキーマ競合解消**: 2件（ProductBase, WarehouseOut）
- **コンポーネント名衝突解消**: OrderLineCard x3
- **インライン定義抽出**: 2コンポーネント
- **API移行**: 7ファイル（Deprecated API → 新API）

### 保守性向上
- **Single Source of Truth**: スキーマ、型定義の一元化
- **名前空間の明確化**: コンポーネント名の衝突解消
- **レガシーコード削減**: order_no 等の段階的廃止

---

## リスク管理

### 高リスク作業
1. **P0 スキーマ修正**: 既存API動作に影響
   - **対策**: pytest実行、手動API確認
2. **OrderLineCard リネーム**: 広範囲な import修正
   - **対策**: 段階的実行、TypeScript エラーチェック
3. **Deprecated API削除**: 既存機能破壊の可能性
   - **対策**: grep で使用箇所完全確認、段階的移行

### ロールバック計画
- 各Phase後に Git commit分割
- 問題発生時は該当commitをrevert
- Phase 1（Backend）で問題発生時はPhase 2実行しない

---

## 成功基準

### 必須（Phase完了条件）
- [ ] すべての品質チェックがPASS
- [ ] TypeScript型エラー0件
- [ ] Backend pytest（integration除く）ALL PASS
- [ ] Dev server起動確認（Backend/Frontend）
- [ ] `/api/health` エンドポイント正常応答

### 推奨（QA完了条件）
- [ ] 手動E2Eテスト（主要フロー確認）
- [ ] OpenAPI型生成の差分確認
- [ ] 円環依存チェック（madge）PASS
- [ ] Code coverage維持または向上

---

## 参考資料

- **CLAUDE.md**: プロジェクト構造、命名規則、API一覧
- **Backend Analysis Report**: `backend/` zombie code詳細分析
- **Frontend Analysis Report**: `frontend/src/` zombie code詳細分析
- **API Migration Guide**: `docs/api_migration_guide_v2.2.md`

---

**作成者**: Claude (Sonnet 4.5)
**レビュー推奨**: シニアアーキテクト、テックリード
**実行者**: Codex（このドキュメントをそのまま実行可能）

---

## 次のアクション

```bash
# このファイルをプロジェクトルートに配置
# 実行開始:
# Day 1 P0 から順次実行

# 進捗管理:
# 各チェックボックス [ ] を [x] に変更してcommit
```

**Let's clean up this codebase! 🧹✨**
