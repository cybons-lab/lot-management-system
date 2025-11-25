# ESLint Issues Report

Generated: 2025-11-10

## Summary

Total Issues: 45 (42 errors, 3 warnings)

### Issues by Category

1. **Function Length Violations** (max-lines-per-function: 80 lines max) - 17 errors
2. **Complexity Violations** (complexity: 12 max) - 15 errors
3. **Parameter Count Violations** (max-params: 4 max) - 2 errors
4. **React Hooks Violations** (critical) - 2 errors
5. **Accessibility Issues** (jsx-a11y) - 6 issues (3 errors, 3 warnings)
6. **Import Restrictions** - 1 error (fixed)

---

## Critical Issues (Must Fix)

### 🔴 React Hooks Violations

These MUST be fixed as they can cause runtime errors:

1. **src/features/orders/components/WarehouseSelector.tsx:24:3**
   - Error: `React.useEffect` called conditionally
   - Impact: HIGH - Violates Rules of Hooks
   - Fix: Move conditional logic inside useEffect

2. **src/hooks/ui/useDialog.ts:204:21**
   - Error: `useDialog` called inside a callback
   - Impact: HIGH - Violates Rules of Hooks
   - Fix: Refactor to avoid calling hooks in callbacks

---

## High Priority Issues

### 🟡 Accessibility Issues

#### Labels without Associated Controls

- **src/features/orders/components/OrderFilters.tsx**
  - Lines: 17, 29, 45
  - Fix: Add `htmlFor` attribute or wrap controls properly

- **src/features/orders/components/WarehouseSelector.tsx:32:7**
  - Fix: Add `htmlFor` attribute to label

#### Missing Keyboard Listeners

- **src/features/allocations/components/OrderCard.tsx:32:5**
  - Warning: Click handler without keyboard listener
  - Fix: Add `onKeyDown` or use `<button>` element

- **src/features/allocations/components/OrderLineCard.tsx:33:5**
  - Warning: Click handler without keyboard listener
  - Fix: Add `onKeyDown` or use `<button>` element

- **src/pages/OrdersPage.tsx:49:11**
  - Warning: Click handler without keyboard listener
  - Fix: Add `onKeyDown` or use `<button>` element

---

## Structural Issues (Future Refactoring)

These violate code quality rules but don't affect functionality.
Recommend addressing in future refactoring sprints.

### Function Length Violations (max 80 lines)

| File                                                               | Function                 | Lines | Severity     |
| ------------------------------------------------------------------ | ------------------------ | ----- | ------------ |
| `src/features/allocations/components/LotAllocationPanel.tsx`       | LotAllocationPanel       | 299   | 🔴 Very High |
| `src/features/allocations/components/WarehouseAllocationModal.tsx` | WarehouseAllocationModal | 171   | 🔴 High      |
| `src/features/inventory/pages/InventoryPage.tsx`                   | InventoryPage            | 285   | 🔴 Very High |
| `src/features/orders/components/OrderLineCard/index.tsx`           | OrderLineCard            | 164   | 🔴 High      |
| `src/features/orders/pages/OrdersListPage.tsx`                     | OrdersListPage           | 290   | 🔴 Very High |
| `src/features/orders/pages/OrdersListPage.tsx`                     | Arrow function (line 88) | 95    | 🔴 High      |
| `src/shared/components/data/DataTable.tsx`                         | DataTable                | 182   | 🔴 High      |
| `src/features/forecasts/pages/ForecastListPage.tsx`                | ForecastListPage         | 118   | 🟡 Medium    |
| `src/features/forecasts/pages/ForecastListPage.tsx`                | ForecastGroupCard        | 122   | 🟡 Medium    |
| `src/features/orders/components/LotListWithAllocation.tsx`         | LotListWithAllocation    | 122   | 🟡 Medium    |
| `src/features/orders/components/LotListWithAllocation.tsx`         | Arrow function (line 70) | 86    | 🟡 Medium    |
| `src/shared/components/data/TablePagination.tsx`                   | TablePagination          | 109   | 🟡 Medium    |
| `src/features/allocations/pages/LotAllocationPage.tsx`             | LotAllocationPage        | 105   | 🟡 Medium    |
| `src/features/orders/pages/OrderDetailPage.tsx`                    | OrderDetailPage          | 156   | 🟡 Medium    |
| `src/features/orders/components/ForecastSection.tsx`               | ForecastSection          | 92    | 🟡 Medium    |
| `src/features/orders/pages/OrderPage.tsx`                          | OrderPage                | 91    | 🟡 Medium    |

### Complexity Violations (max 12)

| File                                                              | Function           | Complexity | Severity     |
| ----------------------------------------------------------------- | ------------------ | ---------- | ------------ |
| `src/features/orders/hooks/useOrderLineComputed.ts:33:27`         | Arrow function     | 51         | 🔴 Very High |
| `src/features/allocations/components/LotAllocationPanel.tsx:61:8` | LotAllocationPanel | 23         | 🔴 High      |
| `src/features/orders/components/OrderLineCard/index.tsx:27:8`     | OrderLineCard      | 21         | 🔴 High      |
| `src/features/allocations/components/OrderCard.tsx:17:8`          | OrderCard          | 19         | 🔴 High      |
| `src/features/inventory/api.ts:19:49`                             | Arrow function     | 18         | 🔴 High      |
| `src/features/orders/components/LotListWithAllocation.tsx:70:31`  | Arrow function     | 18         | 🔴 High      |
| `src/features/allocations/components/OrderDetailPane.tsx:21:8`    | OrderDetailPane    | 14         | 🟡 Medium    |
| `src/features/forecast/api.ts:46:57`                              | Arrow function     | 14         | 🟡 Medium    |
| `src/features/orders/api.ts:25:54`                                | Arrow function     | 14         | 🟡 Medium    |
| `src/shared/components/form/FormDialog.tsx:56:8`                  | FormDialog         | 14         | 🟡 Medium    |
| `src/features/allocations/components/OrderLineCard.tsx:14:8`      | OrderLineCard      | 13         | 🟡 Medium    |
| `src/features/orders/components/ForecastSection.tsx:14:8`         | ForecastSection    | 13         | 🟡 Medium    |

### Parameter Count Violations (max 4 params)

| File                                                           | Function              | Params | Fix Strategy       |
| -------------------------------------------------------------- | --------------------- | ------ | ------------------ |
| `src/features/allocations/hooks/useAllocationMutation.ts:17:8` | useAllocationMutation | 6      | Use options object |
| `src/features/allocations/hooks/useAutoSelection.ts:10:8`      | useAutoSelection      | 5      | Use options object |

---

## Recommended Refactoring Strategy

### Phase 1: Critical Fixes (Required for CI)

1. Fix React Hooks violations (2 files)
2. Fix accessibility label issues (2 files)

### Phase 2: Accessibility Improvements (Recommended)

1. Add keyboard listeners to clickable elements (3 files)

### Phase 3: Large File Refactoring (Future Sprint)

Priority order based on size and complexity:

1. `useOrderLineComputed.ts` (complexity 51) - Split into smaller functions
2. `LotAllocationPanel.tsx` (299 lines, complexity 23) - Extract sub-components
3. `InventoryPage.tsx` (285 lines) - Extract components
4. `OrdersListPage.tsx` (290 lines) - Extract components
5. `DataTable.tsx` (182 lines) - Extract sub-components

### Phase 4: API Simplification

1. Refactor `useAllocationMutation` and `useAutoSelection` to use options objects

---

## Notes

- **Import Restrictions**: Fixed by updating ESLint config to allow axios in `shared/libs/`
- **Tailwind Plugin**: Removed due to Tailwind v4 incompatibility (class ordering handled by Prettier)
- **Infrastructure Layer**: `hooks/`, `services/`, `shared/libs/` exempt from complexity rules

---

## Current Status

✅ ESLint Flat Config implemented with strict rules
✅ Prettier with Tailwind plugin configured
✅ Feature-based directory structure established
✅ Large files split (LotAllocationPage 941→169 lines)
⚠️ 45 ESLint issues remaining (mostly structural)
🔴 2 critical React Hooks violations require immediate attention
