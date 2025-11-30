# Code Quality Improvement Report
**Date:** 2025-11-30 (Updated: 2025-11-30 17:00)
**Project:** Lot Management System v2.0
**Baseline:** CLAUDE.md Quality Standards

---

## 📊 Progress Update (2025-11-30 17:00)

**ESLint Errors: 19 → 7** (63% reduction ✅)
**Critical Complexity Fixed: CC 35 → 6** (CRITICAL item resolved ✅)
**Commits Made: 6** | **All changes pushed ✅**

### What Was Fixed

✅ **Backend - CRITICAL:**
- `execute_candidate_lot_query`: CC 35 → 6 (extracted 10 helper functions)

✅ **Frontend - ESLint (12 errors fixed):**
- SupplierProductsPage.tsx: 89 → 45 lines (extracted sub-components)
- ConfirmedLinesPage.tsx: 196 → 70 lines (extracted 6 sub-components)
- InventoryTable.tsx: Fixed 178-line arrow function, reduced file size
- Accessibility: 2 label-has-associated-control issues fixed
- Type safety: 8 `any` types replaced with proper types

### Remaining Issues (7 ESLint errors)

⚠️ **Complex Components (need further extraction):**
- InventoryTable.tsx: 1 error (main function 139 lines)
- LotListPanel.tsx: 2 errors (329 lines, CC 21)
- SupplierProductBulkImportDialog.tsx: 2 errors (243 lines, CC 22)
- UomConversionBulkImportDialog.tsx: 2 errors (245 lines, CC 22)

---

## Executive Summary

✅ **自動修正完了:** Prettier formatting applied
✅ **手動対応完了:** 13 issues (1 CRITICAL backend, 12 frontend ESLint)
⚠️ **手動対応が必要:** 25 remaining issues (ファイルサイズ、複雑度、ESLint警告)

### Overall Status

| Category | Status | Details |
|----------|--------|---------|
| **Backend Lint (Ruff)** | ✅ PASS | All checks passed |
| **Backend Format (Ruff)** | ✅ PASS | 186 files already formatted |
| **Backend Complexity** | ✅ IMPROVED | Critical CC=35 fixed → CC=6 |
| **Frontend TypeScript** | ✅ PASS | No type errors |
| **Frontend ESLint** | ⚠️ IMPROVED | 19 → 7 errors (63% reduction) |
| **Frontend Prettier** | ✅ PASS | All files formatted |
| **File Size (300+ lines)** | ⚠️ WARNINGS | 9 backend, 7 frontend files |
| **Complexity (CC > 10)** | ⚠️ IMPROVED | 17 → 16 functions (1 critical fixed)

---

## 1. 自動修正した内容

### Backend
- **Ruff Lint:** 既にパス済み（修正不要）
- **Ruff Format:** 既にパス済み（修正不要）

### Frontend
- **TypeScript:** 型エラーなし
- **Prettier:** 全ファイルがフォーマット済み

**結論:** コードベースは既に高い品質基準を満たしています。自動修正可能な問題はありませんでした。

---

## 2. 手動対応が必要な項目

### 2.1 Backend: ファイルサイズ超過（300行以上）

**CLAUDE.md基準:** Maximum 300 lines per file (ENFORCED)

| Lines | File | Priority |
|-------|------|----------|
| 531 | `app/api/routes/inventory/lots_router.py` | 🔴 HIGH |
| 399 | `app/services/inventory/inbound_service.py` | 🔴 HIGH |
| 379 | `app/models/inventory_models.py` | 🟡 MEDIUM |
| 374 | `app/models/masters_models.py` | 🟡 MEDIUM |
| 366 | `app/api/routes/admin/admin_router.py` | 🟡 MEDIUM |
| 342 | `app/services/common/operation_log_service.py` | 🟡 MEDIUM |
| 326 | `app/services/orders/order_service.py` | 🟡 MEDIUM |
| 324 | `app/api/routes/inventory/inbound_plans_router.py` | 🟡 MEDIUM |
| 304 | `app/core/logging.py` | 🟡 MEDIUM |

**推奨アクション:**
1. **lots_router.py (531行):** 複数のルーターファイルに分割
   - `lots_basic_router.py` - CRUD operations
   - `lots_movement_router.py` - Stock movements
   - `lots_lock_router.py` - Lock/unlock operations
2. **inbound_service.py (399行):** サービスを分割
   - `inbound_planning_service.py` - Planning logic
   - `inbound_receipt_service.py` - Receipt logic
3. **Models:** 一部のモデルを別ファイルに分離（例：Lot, Product, Customer）

---

### 2.2 Frontend: ファイルサイズ超過（300行以上）

**OpenAPI生成ファイルを除く:**

| Lines | File | Priority |
|-------|------|----------|
| 434 | `features/allocations/hooks/useLotAllocationActions.ts` | 🔴 HIGH |
| 419 | `features/orders/pages/OrdersListPage.tsx` | 🔴 HIGH |
| 413 | `features/inventory/components/LotListPanel.tsx` | 🔴 HIGH |
| 391 | `features/inventory/components/InventoryTable.tsx` | 🔴 HIGH |
| 341 | `features/allocations/components/lots/LotAllocationHeaderView.tsx` | 🟡 MEDIUM |
| 322 | `features/allocations/components/lots/LotListCard.tsx` | 🟡 MEDIUM |
| 318 | `shared/utils/csv-parser.ts` | 🟡 MEDIUM |
| 309 | `shared/components/form/FormField.tsx` | 🟡 MEDIUM |
| 308 | `features/inbound-plans/pages/InboundPlanDetailPage.tsx` | 🟡 MEDIUM |
| 301 | `features/supplier-products/components/SupplierProductBulkImportDialog.tsx` | 🟡 MEDIUM |

**推奨アクション:**
1. **Large Pages (419行):** サブコンポーネントに分割
   - `OrdersListPage` → Extract filters, table, actions
2. **Large Components (413, 391行):**
   - Extract table columns to separate config
   - Move handlers to custom hooks
3. **csv-parser.ts:** 別の関数ファイルに分割

---

### 2.3 Backend: 循環的複雑度が高い関数（CC > 10）

**CLAUDE.md基準:** Maximum 10 (STRICT), Target < 7

| CC | Function | File | Priority | Status |
|----|----------|------|----------|--------|
| ~~**35**~~ → **6** | `execute_candidate_lot_query` | `services/allocations/search.py` | ✅ **FIXED** | Refactored into 11 functions |
| **20** | `generate_orders` | `services/test_data/orders.py` | 🔴 HIGH | Pending |
| **20** | `_validate_profile` | `services/common/profile_loader.py` | 🔴 HIGH | Pending |
| **18** | `calculate_line_allocations` | `services/allocations/fefo.py` | 🔴 HIGH | Pending |
| **15** | `create_stock_movement` | `api/routes/inventory/lots_router.py` | 🟡 MEDIUM | Pending |
| **15** | `bulk_import` | `services/forecasts/forecast_import_service.py` | 🟡 MEDIUM | Pending |
| **14** | `create_lot` | `api/routes/inventory/lots_router.py` | 🟡 MEDIUM | Pending |
| **14** | `update_lot` | `api/routes/inventory/lots_router.py` | 🟡 MEDIUM | Pending |
| **13** | `allocate_with_tracing` | `services/allocations/tracing.py` | 🟡 MEDIUM | Pending |
| **12** | `collect_all_alerts` | `services/alerts/alert_service.py` | 🟡 MEDIUM | Pending |
| **12** | `get_order_lines` | `services/orders/order_service.py` | 🟡 MEDIUM | Pending |
| **11** | `get_db_counts` | `api/routes/admin/admin_healthcheck_router.py` | 🟡 MEDIUM | Pending |
| **11** | `list_lots` | `api/routes/inventory/lots_router.py` | 🟡 MEDIUM | Pending |
| **11** | `lock_lot` | `api/routes/inventory/lots_router.py` | 🟡 MEDIUM | Pending |
| **11** | `generate_lots` | `services/test_data/inventory.py` | 🟡 MEDIUM | Pending |
| **11** | `calculate_allocation` | `domain/allocation/calculator.py` | 🟡 MEDIUM | Pending |

**推奨アクション:**
1. ~~**execute_candidate_lot_query (CC=35):** CRITICAL~~ ✅ **COMPLETED** (CC 35 → 6)
   - ✅ Extracted 10 helper functions: `_apply_fefo_ordering`, `_get_delivery_place_name`, `_query_lots_from_view`, `_query_lots_with_fallback`, `_convert_to_candidate_item`, `_enrich_lot_details`, `_enrich_warehouse_names`, `_enrich_product_units`, `_enrich_candidate_details`
2. **generate_orders, _validate_profile (CC=20):**
   - 検証ロジックを別関数に分離
   - Strategy パターンを検討
3. **calculate_line_allocations (CC=18):**
   - FEFO アルゴリズムをステップごとに分割

---

### 2.4 Frontend: ESLint エラー

**19 → 7 errors (63% reduction ✅)**

#### A. 関数が長すぎる (max-lines-per-function: 80)

| File | Function | Lines | Status | Action |
|------|----------|-------|--------|--------|
| ~~`inventory/components/InventoryTable.tsx`~~ | Arrow function | ~~178~~ | ✅ **FIXED** | Extracted to InventoryTableComponents.tsx |
| `inventory/components/InventoryTable.tsx` | `InventoryTable` | 139 ⬇️ | ⚠️ IMPROVED | Reduced from 337, needs further extraction |
| `inventory/components/LotListPanel.tsx` | `LotListPanel` | 329 | 🔴 PENDING | Extract filters, table |
| ~~`orders/pages/ConfirmedLinesPage.tsx`~~ | `ConfirmedLinesPage` | ~~187~~ → 70 | ✅ **FIXED** | Extracted 6 sub-components |
| `supplier-products/components/SupplierProductBulkImportDialog.tsx` | Dialog | 243 | 🔴 PENDING | Extract form sections |
| ~~`supplier-products/pages/SupplierProductsPage.tsx`~~ | Page | ~~85~~ → 45 | ✅ **FIXED** | Extracted table components |
| `uom-conversions/components/UomConversionBulkImportDialog.tsx` | Dialog | 245 | 🔴 PENDING | Extract form sections |

#### B. 複雑度が高い (complexity > 12)

| File | Function | CC | Status | Action |
|------|----------|-----|--------|--------|
| `LotListPanel.tsx` | `LotListPanel` | 21 | 🔴 PENDING | Simplify conditional logic |
| `SupplierProductBulkImportDialog.tsx` | Dialog | 22 | 🔴 PENDING | Extract validation logic |
| `UomConversionBulkImportDialog.tsx` | Dialog | 22 | 🔴 PENDING | Extract validation logic |

#### C. 型の問題 (@typescript-eslint/no-explicit-any)

| File | Line | Status |
|------|------|--------|
| ~~`hooks/api/useLots.ts`~~ | ~~15~~ | ✅ **FIXED** |
| ~~`hooks/api/useOrders.ts`~~ | ~~15~~ | ✅ **FIXED** |
| ~~`services/api.ts`~~ | ~~42, 58, 67~~ | ✅ **FIXED** (3x) |
| ~~`services/api/lot-service.ts`~~ | ~~16~~ | ✅ **FIXED** |
| ~~`services/api/order-service.ts`~~ | ~~20~~ | ✅ **FIXED** |

**完了:** 全ての `any` を `Record<string, string | number | boolean | undefined>` に置き換え ✅

#### D. アクセシビリティ (jsx-a11y/label-has-associated-control)

| File | Line | Status |
|------|------|--------|
| ~~`SupplierProductBulkImportDialog.tsx`~~ | ~~113~~ | ✅ **FIXED** |
| ~~`UomConversionBulkImportDialog.tsx`~~ | ~~109~~ | ✅ **FIXED** |

**完了:** `htmlFor` と `id` 属性を追加 ✅

---

## 3. 優先度付き TODO リスト

### ✅ COMPLETED

1. ~~**Backend: `execute_candidate_lot_query` (CC=35) をリファクタリング**~~ ✅
   - ✅ CC 35 → 6 に削減
   - ✅ 10個のヘルパー関数に分割
   - Commit: `fd53a3c`

2. ~~**Frontend: `any` 型の置き換え (8箇所)**~~ ✅
   - ✅ 全8箇所を `Record<string, string | number | boolean | undefined>` に置き換え
   - Commit: `b440d9d`

3. ~~**Frontend: アクセシビリティ問題の修正 (2箇所)**~~ ✅
   - ✅ `htmlFor` と `id` 属性を追加
   - Commit: `db79776`

4. ~~**Frontend: ESLint max-lines-per-function 違反の修正 (3/7箇所)**~~ ✅
   - ✅ SupplierProductsPage.tsx (89 → 45 lines)
   - ✅ ConfirmedLinesPage.tsx (187 → 70 lines)
   - ✅ InventoryTable.tsx (178-line arrow function fixed)

### 🔴 HIGH (2週間以内)

5. **Backend: `lots_router.py` (531行) を分割**
   - 3つのルーターファイルに分割

6. **Backend: 高複雑度関数のリファクタリング (CC 18-20)**
   - `generate_orders`, `_validate_profile`, `calculate_line_allocations`

7. **Frontend: 大きなコンポーネントの分割**
   - `LotListPanel` (329行, CC 21) - 最優先
   - `SupplierProductBulkImportDialog` (243行, CC 22)
   - `UomConversionBulkImportDialog` (245行, CC 22)
   - `InventoryTable` (139行) - 部分的完了、さらに削減必要

### 🟡 MEDIUM (1ヶ月以内)

6. **Backend: 残りの300行超過ファイルの分割 (8ファイル)**

7. **Backend: 中程度の複雑度関数のリファクタリング (CC 11-15, 11関数)**

8. **Frontend: 残りの300行超過ファイルの分割 (7ファイル)**

9. **Frontend: ESLint max-lines-per-function 違反の修正 (7箇所)**

10. **Frontend: アクセシビリティ問題の修正 (2箇所)**

### 🟢 LOW (必要に応じて)

11. **Frontend: npm audit で検出されたセキュリティ脆弱性の修正**
    - 11 vulnerabilities (9 moderate, 2 critical)
    - `npm audit fix` を実行

12. **Code coverage の向上**
    - Backend: 目標 >= 80%
    - Frontend: 目標 >= 60%

---

## 4. 改善の影響範囲

### 予想される工数

| Task | Estimated Hours | Risk |
|------|----------------|------|
| Critical リファクタリング (1項目) | 8-16h | Medium |
| High リファクタリング (4項目) | 24-40h | Medium |
| Medium 改善 (5項目) | 20-30h | Low |
| Low 改善 (2項目) | 4-8h | Low |
| **合計** | **56-94h** | - |

### リスク評価

- **Low Risk:** ファイル分割、型の置き換え（既存機能への影響少）
- **Medium Risk:** 複雑な関数のリファクタリング（テストでカバー必要）
- **High Risk:** なし

---

## 5. 次のステップ

1. ✅ **このレポートをレビュー**
2. ✅ **Critical 項目の対応完了** (execute_candidate_lot_query CC 35 → 6)
3. ✅ **ESLint 問題の部分的対応** (19 → 7 errors, 63% reduction)
4. ⬜ **残り7個のESLint errorを修正**
   - LotListPanel.tsx (2 errors: 329 lines, CC 21)
   - SupplierProductBulkImportDialog.tsx (2 errors: 243 lines, CC 22)
   - UomConversionBulkImportDialog.tsx (2 errors: 245 lines, CC 22)
   - InventoryTable.tsx (1 error: 139 lines)
5. ⬜ **High 項目のスプリント計画** (2週間スプリント推奨)
   - Backend: lots_router.py 分割, 高複雑度関数リファクタリング
6. ⬜ **CI/CD に品質ゲートを追加**
   - radon complexity check (fail if CC > 15)
   - File size check (fail if > 300 lines)
   - ESLint check with --max-warnings=0
7. ⬜ **定期的な品質レビュー** (月次推奨)

---

## 6. 参考コマンド

```bash
# Backend quality checks
cd backend
ruff check app/
ruff format --check app/
radon cc app/ -s -n C  # Show functions with CC >= 10

# Frontend quality checks
cd frontend
npm run typecheck
npm run lint -- --max-warnings=0
npm run format:check

# File size check
find backend/app -name "*.py" -exec wc -l {} \; | awk '$1 > 300'
find frontend/src -name "*.tsx" -o -name "*.ts" | xargs wc -l | awk '$1 > 300'
```

---

**Report Generated:** 2025-11-30
**Generated By:** Claude Code Quality Checker
**Baseline:** CLAUDE.md v2.0
