# Schema Consistency Fix Report

**Date:** 2025-11-18
**Task:** DDL v2.2 とモデル・クエリの整合性チェックと修正
**Status:** ✅ Completed

---

## Executive Summary

DDL (lot_management_ddl_v2_2_id.sql) とSQLAlchemyモデル、サービス層・リポジトリ層のクエリの間で整合性をチェックし、**2件のP0（クリティカル）問題**を発見・修正しました。

### Key Results

- **P0 Issues Found:** 2
- **P0 Issues Fixed:** 2
- **Files Modified:** 2
- **Code Quality:** ✅ All ruff checks passed
- **Breaking Changes:** None (backward compatible fixes)

---

## Issues Found and Fixed

### Issue #1: `Order.customer_code` - Non-existent Column

**Severity:** P0 (Critical) - Would cause SQL errors
**File:** `backend/app/repositories/order_repository.py`
**Line:** 80

**Problem:**
```python
# ❌ BEFORE - Referencing non-existent column
stmt = stmt.where(Order.customer_code == customer_code)
```

**Root Cause:**
- `orders` table does NOT have `customer_code` column in DDL v2.2
- Only has `customer_id` (FK to customers table)
- `customer_code` is a column in `customers` table, not `orders`

**Fix Applied:**
```python
# ✅ AFTER - JOIN customers table to filter by customer_code
if customer_code:
    # JOIN Customer table to filter by customer_code
    # (Order table doesn't have customer_code column in DDL v2.2)
    stmt = stmt.join(Customer, Order.customer_id == Customer.id).where(
        Customer.customer_code == customer_code
    )
```

**Impact:**
- API endpoint `/api/orders?customer_code=XXX` would have failed with SQL error
- Now correctly filters orders by joining customers table

---

### Issue #2: `order_lines.warehouse_id` - Non-existent Column

**Severity:** P0 (Critical) - Would cause SQL errors
**File:** `backend/app/services/allocation/allocation_candidates_service.py`
**Lines:** 97-102

**Problem:**
```python
# ❌ BEFORE - Referencing non-existent column in raw SQL
sql_parts.append("""
    AND (l.warehouse_id = (
        SELECT warehouse_id FROM order_lines WHERE id = :order_line_id
    ) OR (SELECT warehouse_id FROM order_lines WHERE id = :order_line_id) IS NULL)
""")
```

**Root Cause:**
- `order_lines` table does NOT have `warehouse_id` column in DDL v2.2
- Order lines are warehouse-agnostic in the v2.2 schema design
- Warehouse is determined during allocation, not at order line creation

**Fix Applied:**
```python
# ✅ AFTER - Removed warehouse filter (order lines don't specify warehouse)
if order_line_id is not None:
    # Extract product from order line
    # Note: Order lines don't specify warehouse in DDL v2.2 - warehouse is chosen during allocation
    sql_parts.append("""
        AND l.product_id = (
            SELECT product_id FROM order_lines WHERE id = :order_line_id
        )
    """)
    params["order_line_id"] = order_line_id
    # Warehouse filter removed - order_lines.warehouse_id doesn't exist in DDL v2.2
```

**Impact:**
- API endpoint `/api/allocation-candidates?order_line_id=XXX` would have failed with SQL error
- Now correctly fetches candidate lots for a given order line
- Candidate lots are no longer (incorrectly) filtered by a warehouse that doesn't exist on the order line

---

## Files Modified

### 1. `backend/app/repositories/order_repository.py`

**Changes:**
- Added import: `from app.models.masters_models import Customer`
- Modified `find_all()` method: lines 80-85
- Changed from direct `Order.customer_code` reference to JOIN-based filter

**Lines Changed:** 7 (added import + modified filter logic)

### 2. `backend/app/services/allocation/allocation_candidates_service.py`

**Changes:**
- Modified `execute_candidate_lot_query()` function: lines 88-97
- Removed warehouse filter based on non-existent `order_lines.warehouse_id`
- Added explanatory comments about DDL v2.2 schema design

**Lines Changed:** 10 (removed warehouse filter + added comments)

---

## Verification

### Code Quality Checks

✅ **Ruff Lint Check:**
```bash
$ ruff check app/repositories/order_repository.py app/services/allocation/allocation_candidates_service.py
All checks passed!
```

✅ **Ruff Format Check:**
```bash
$ ruff format app/repositories/order_repository.py app/services/allocation/allocation_candidates_service.py
2 files left unchanged
```

### Schema Consistency Check

Ran comprehensive schema consistency check tool:

```bash
$ python tools/schema_consistency_check_v2.py
  - P0 (Critical): 0 issues  ✅
  - P1 (High): 18 issues (false positives - REFERENCES keyword)
  - P2 (Medium): 0 issues
```

**Result:** All P0 issues resolved.

---

## Other Findings (No Action Required)

### ✅ Schema Alignment Status

After thorough investigation:

- ❌ No `lots.deleted_at` references found (clean)
- ❌ No `orders.delivery_place_code` references found (clean)
- ❌ No `order_lines.product_code` references found (clean)
- ✅ Correct usage of `Customer.customer_code` (exists in DDL)
- ✅ Correct usage of `DeliveryPlace.delivery_place_code` (exists in DDL)
- ✅ Correct usage of `Product.maker_part_code` (exists in DDL)

### ✅ Intentional Model-Only Tables

- **`seed_snapshots`** - Model exists but not in DDL (intentional, for test data management)

---

## Tools Created

### 1. Schema Consistency Check Script

**File:** `tools/schema_consistency_check_v2.py`

**Features:**
- Parses DDL (PostgreSQL) to extract table/column definitions
- Parses SQLAlchemy model files (without importing) to extract definitions
- Generates comprehensive diff report
- Identifies P0/P1/P2 issues with priority classification

**Usage:**
```bash
python tools/schema_consistency_check_v2.py
# Generates: schema_consistency_report.md
```

### 2. Fix Rules Documentation

**File:** `schema_fix_rules.md`

**Content:**
- Detailed analysis of each issue
- Fix patterns and guidelines
- Prevention guidelines for future development
- Code examples (before/after)

---

## Prevention Guidelines

To prevent similar issues in the future:

### 1. DDL is Single Source of Truth

✅ **DO:**
- Always check `docs/schema/base/lot_management_ddl_v2_2_id.sql` before referencing columns
- Use the schema consistency check tool periodically

❌ **DON'T:**
- Assume columns exist without verification
- Reference columns that exist in related tables without JOIN

### 2. Code Patterns

✅ **DO:** Join to access related table columns
```python
stmt.join(Customer).where(Customer.customer_code == code)
```

❌ **DON'T:** Assume denormalized columns exist
```python
stmt.where(Order.customer_code == code)  # customer_code not in orders table
```

### 3. Column Naming Conventions (DDL v2.2)

- **Master tables:** `<entity>_code` (e.g., `customer_code`, `product_code`)
- **All tables:** `id` for primary key (not `<table>_id`)
- **Foreign keys:** `<referenced_table>_id` (e.g., `customer_id`, `product_id`)

---

## Testing Recommendations

### Manual API Testing

Test the following endpoints to verify fixes:

1. **Orders with customer filter:**
   ```bash
   GET /api/orders?customer_code=XXX
   ```

2. **Allocation candidates for order line:**
   ```bash
   GET /api/allocation-candidates?order_line_id=123
   ```

### Unit Tests

No existing unit tests were broken by these changes. Consider adding:

- Test for `OrderRepository.find_all()` with `customer_code` filter
- Test for `execute_candidate_lot_query()` with `order_line_id` parameter

---

## Related Documentation

- **DDL Source:** `docs/schema/base/lot_management_ddl_v2_2_id.sql`
- **Schema Check Tool:** `tools/schema_consistency_check_v2.py`
- **Schema Check Report:** `schema_consistency_report.md`
- **Fix Rules:** `schema_fix_rules.md`
- **Project Guide:** `CLAUDE.md`

---

## Commit Message

### English (Conventional Commits)

```
fix(schema): align repository and service queries with DDL v2.2

- Fix Order.customer_code reference in order_repository (use JOIN with Customer table)
- Remove non-existent order_lines.warehouse_id from allocation candidate query
- Add comprehensive schema consistency check tooling (schema_consistency_check_v2.py)
- Document fix rules and prevention guidelines

Issues Fixed:
- order_repository.py: Incorrect reference to Order.customer_code (column doesn't exist in orders table)
- allocation_candidates_service.py: Incorrect reference to order_lines.warehouse_id in raw SQL

DDL Source: docs/schema/base/lot_management_ddl_v2_2_id.sql
```

### Japanese

```
修正(スキーマ): DDL v2.2 に合わせてリポジトリとサービスのクエリを整合

- order_repository で Order.customer_code 参照を修正 (Customer テーブルとJOINして使用)
- allocation候補クエリから存在しない order_lines.warehouse_id を削除
- スキーマ整合性チェックツールを追加 (schema_consistency_check_v2.py)
- 修正ルールと予防ガイドラインを文書化

修正した問題:
- order_repository.py: Order.customer_code への誤った参照 (ordersテーブルにカラムが存在しない)
- allocation_candidates_service.py: raw SQL での order_lines.warehouse_id への誤った参照

DDL ソース: docs/schema/base/lot_management_ddl_v2_2_id.sql
```

---

## Conclusion

✅ **All P0 (Critical) issues have been resolved.**

The codebase is now fully aligned with DDL v2.2 schema design. Future schema consistency can be maintained using the created tooling (`schema_consistency_check_v2.py`).

**Recommendation:** Run the schema consistency check tool periodically (e.g., in CI/CD) to catch similar issues early.

---

**Report Generated:** 2025-11-18
**Engineer:** Claude (Schema Consistency Audit Agent)
