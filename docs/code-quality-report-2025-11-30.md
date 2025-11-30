# Code Quality Improvement Report
**Date:** 2025-11-30
**Project:** Lot Management System v2.0
**Baseline:** CLAUDE.md Quality Standards

---

## Executive Summary

✅ **自動修正完了:** 0 issues (全てのlint/formatチェックが既にパス済み)
⚠️ **手動対応が必要:** 38 issues (ファイルサイズ、複雑度、ESLint警告)

### Overall Status

| Category | Status | Details |
|----------|--------|---------|
| **Backend Lint (Ruff)** | ✅ PASS | All checks passed |
| **Backend Format (Ruff)** | ✅ PASS | 186 files already formatted |
| **Frontend TypeScript** | ✅ PASS | No type errors |
| **Frontend ESLint** | ⚠️ WARNINGS | 19 errors (0 auto-fixable) |
| **Frontend Prettier** | ✅ PASS | All files formatted |
| **File Size (300+ lines)** | ⚠️ WARNINGS | 9 backend, 10 frontend files |
| **Complexity (CC > 10)** | ⚠️ WARNINGS | 17 functions |

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

| CC | Function | File | Priority |
|----|----------|------|----------|
| **35** | `execute_candidate_lot_query` | `services/allocations/search.py` | 🔴 CRITICAL |
| **20** | `generate_orders` | `services/test_data/orders.py` | 🔴 HIGH |
| **20** | `_validate_profile` | `services/common/profile_loader.py` | 🔴 HIGH |
| **18** | `calculate_line_allocations` | `services/allocations/fefo.py` | 🔴 HIGH |
| **15** | `create_stock_movement` | `api/routes/inventory/lots_router.py` | 🟡 MEDIUM |
| **15** | `bulk_import` | `services/forecasts/forecast_import_service.py` | 🟡 MEDIUM |
| **14** | `create_lot` | `api/routes/inventory/lots_router.py` | 🟡 MEDIUM |
| **14** | `update_lot` | `api/routes/inventory/lots_router.py` | 🟡 MEDIUM |
| **13** | `allocate_with_tracing` | `services/allocations/tracing.py` | 🟡 MEDIUM |
| **12** | `collect_all_alerts` | `services/alerts/alert_service.py` | 🟡 MEDIUM |
| **12** | `get_order_lines` | `services/orders/order_service.py` | 🟡 MEDIUM |
| **11** | `get_db_counts` | `api/routes/admin/admin_healthcheck_router.py` | 🟡 MEDIUM |
| **11** | `list_lots` | `api/routes/inventory/lots_router.py` | 🟡 MEDIUM |
| **11** | `lock_lot` | `api/routes/inventory/lots_router.py` | 🟡 MEDIUM |
| **11** | `generate_lots` | `services/test_data/inventory.py` | 🟡 MEDIUM |
| **11** | `calculate_allocation` | `domain/allocation/calculator.py` | 🟡 MEDIUM |

**推奨アクション:**
1. **execute_candidate_lot_query (CC=35):** CRITICAL - 至急リファクタリング
   - 複数の小さな関数に分割
   - 早期returnを使用
   - ネストを減らす
2. **generate_orders, _validate_profile (CC=20):**
   - 検証ロジックを別関数に分離
   - Strategy パターンを検討
3. **calculate_line_allocations (CC=18):**
   - FEFO アルゴリズムをステップごとに分割

---

### 2.4 Frontend: ESLint エラー

**19 errors detected:**

#### A. 関数が長すぎる (max-lines-per-function: 80)

| File | Function | Lines | Action |
|------|----------|-------|--------|
| `inventory/components/InventoryTable.tsx` | `InventoryTable` | 337 | Extract sub-components |
| `inventory/components/InventoryTable.tsx` | Arrow function | 178 | Extract handler logic to hook |
| `inventory/components/LotListPanel.tsx` | `LotListPanel` | 329 | Extract filters, table |
| `orders/pages/ConfirmedLinesPage.tsx` | `ConfirmedLinesPage` | 187 | Extract sub-components |
| `supplier-products/components/SupplierProductBulkImportDialog.tsx` | Dialog | 239 | Extract form sections |
| `supplier-products/pages/SupplierProductsPage.tsx` | Page | 85 | Extract filters |
| `uom-conversions/components/UomConversionBulkImportDialog.tsx` | Dialog | 241 | Extract form sections |

#### B. 複雑度が高い (complexity > 12)

| File | Function | CC | Action |
|------|----------|-----|--------|
| `LotListPanel.tsx` | `LotListPanel` | 21 | Simplify conditional logic |
| `SupplierProductBulkImportDialog.tsx` | Dialog | 22 | Extract validation logic |
| `UomConversionBulkImportDialog.tsx` | Dialog | 22 | Extract validation logic |

#### C. 型の問題 (@typescript-eslint/no-explicit-any)

| File | Line | Issue |
|------|------|-------|
| `hooks/api/useLots.ts` | 15 | Unexpected any |
| `hooks/api/useOrders.ts` | 15 | Unexpected any |
| `services/api.ts` | 42, 58, 67 | Unexpected any (3x) |
| `services/api/lot-service.ts` | 16 | Unexpected any |
| `services/api/order-service.ts` | 20 | Unexpected any |

**推奨アクション:** 全ての `any` を適切な型に置き換え

#### D. アクセシビリティ (jsx-a11y/label-has-associated-control)

| File | Line |
|------|------|
| `SupplierProductBulkImportDialog.tsx` | 113 |
| `UomConversionBulkImportDialog.tsx` | 109 |

**推奨アクション:** `htmlFor` 属性を追加

---

## 3. 優先度付き TODO リスト

### 🔴 CRITICAL (即対応)

1. **Backend: `execute_candidate_lot_query` (CC=35) をリファクタリング**
   - 期限: 1週間以内
   - 理由: 複雑度が基準の3.5倍
   - アクション: 複数の小さな関数に分割

### 🔴 HIGH (2週間以内)

2. **Backend: `lots_router.py` (531行) を分割**
   - 3つのルーターファイルに分割

3. **Backend: 高複雑度関数のリファクタリング (CC 18-20)**
   - `generate_orders`, `_validate_profile`, `calculate_line_allocations`

4. **Frontend: 大きなコンポーネントの分割**
   - `InventoryTable` (337行)
   - `LotListPanel` (329行)
   - `OrdersListPage` (419行)

5. **Frontend: `any` 型の置き換え (8箇所)**
   - 型安全性の向上

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
2. ⬜ **Critical 項目の対応開始** (execute_candidate_lot_query)
3. ⬜ **High 項目のスプリント計画** (2週間スプリント推奨)
4. ⬜ **CI/CD に品質ゲートを追加**
   - radon complexity check (fail if CC > 15)
   - File size check (fail if > 300 lines)
5. ⬜ **定期的な品質レビュー** (月次推奨)

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
