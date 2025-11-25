# Schema Consistency Fix Rules

## Date: 2025-11-18

## Summary

After comprehensive schema consistency check between DDL (lot_management_ddl_v2_2_id.sql) and SQLAlchemy models:

- **P0 Issues Found: 2**
- **Fix Priority: Immediate** (will cause SQL errors)

---

## P0 Issues (Critical - Will Cause Runtime Errors)

### Issue 1: `Order.customer_code` (Non-existent column)

**Location:** `backend/app/repositories/order_repository.py:80`

**Problem:**
```python
stmt = stmt.where(Order.customer_code == customer_code)  # ❌ Order.customer_code doesn't exist
```

**Root Cause:**
- DDL v2.2 design: `orders` table does NOT have `customer_code` column
- Only has: `customer_id` (FK to customers table)
- `customer_code` lives in `customers` table

**Fix Rule:**
When filtering orders by `customer_code`:
1. **JOIN** the `customers` table
2. Filter using `Customer.customer_code`

**Correct Pattern** (already used in `order_service.py:46-48`):
```python
stmt = stmt.join(Customer, Order.customer_id == Customer.id).where(
    Customer.customer_code == customer_code
)
```

**Files to Fix:**
- ✅ `backend/app/services/orders/order_service.py` - Already correct
- ❌ `backend/app/repositories/order_repository.py:80` - Needs fix

---

### Issue 2: `order_lines.warehouse_id` (Non-existent column)

**Location:** `backend/app/services/allocation/allocation_candidates_service.py:100-101`

**Problem:**
```python
sql_parts.append("""
    AND (l.warehouse_id = (
        SELECT warehouse_id FROM order_lines WHERE id = :order_line_id  # ❌ order_lines.warehouse_id doesn't exist
    ) OR (SELECT warehouse_id FROM order_lines WHERE id = :order_line_id) IS NULL)
""")
```

**Root Cause:**
- DDL v2.2 design: `order_lines` table does NOT have `warehouse_id` column
- Order lines do not specify warehouse (warehouse is determined during allocation)
- Columns available: `id`, `order_id`, `product_id`, `delivery_date`, `order_quantity`, `unit`, `created_at`, `updated_at`

**Fix Rule:**
Since `order_lines` doesn't have `warehouse_id`:
1. **Option A:** Remove the warehouse filter from order line context (recommended)
2. **Option B:** If warehouse filtering is needed, derive it from:
   - Order → Customer → Delivery Place → (implicit warehouse)
   - Or: Use allocation table to find previously used warehouse

**Recommended Fix:**
Remove the warehouse filter entirely for order_line_id context, since:
- Order lines are warehouse-agnostic
- Warehouse is chosen during allocation based on availability
- The current logic contradicts the schema design

**Code to Remove:**
```python
# Lines 97-102 in allocation_candidates_service.py
# Optional: also filter by warehouse if line has one
sql_parts.append("""
    AND (l.warehouse_id = (
        SELECT warehouse_id FROM order_lines WHERE id = :order_line_id
    ) OR (SELECT warehouse_id FROM order_lines WHERE id = :order_line_id) IS NULL)
""")
```

---

## Other Findings (No Action Needed)

### ✅ No P1/P2 Issues Found

After thorough search:
- ❌ No `lots.deleted_at` references (either removed or never existed in v2.2)
- ❌ No `orders.delivery_place_code` references
- ❌ No `order_lines.product_code` references
- ✅ `Customer.customer_code` - Correct (exists in DDL)
- ✅ `DeliveryPlace.delivery_place_code` - Correct (exists in DDL)
- ✅ `Product.maker_part_code` - Correct (exists in DDL)

### ✅ `seed_snapshots` Table (Model-only)

- **Finding:** `seed_snapshots` exists in models but not in DDL
- **Decision:** No action needed - This is intentional (test/seed data management table)

---

## Fix Implementation Plan

### Phase 1: Fix P0 Issues (Immediate)

#### Fix 1: order_repository.py
```python
# File: backend/app/repositories/order_repository.py
# Line: 79-80

# ❌ BEFORE:
if customer_code:
    stmt = stmt.where(Order.customer_code == customer_code)

# ✅ AFTER:
if customer_code:
    from app.models.masters_models import Customer
    stmt = stmt.join(Customer, Order.customer_id == Customer.id).where(
        Customer.customer_code == customer_code
    )
```

#### Fix 2: allocation_candidates_service.py
```python
# File: backend/app/services/allocation/allocation_candidates_service.py
# Lines: 88-102

# ❌ BEFORE:
if order_line_id is not None:
    # Extract product and warehouse from order line
    sql_parts.append("""
        AND l.product_id = (
            SELECT product_id FROM order_lines WHERE id = :order_line_id
        )
    """)
    params["order_line_id"] = order_line_id

    # Optional: also filter by warehouse if line has one
    sql_parts.append("""
        AND (l.warehouse_id = (
            SELECT warehouse_id FROM order_lines WHERE id = :order_line_id
        ) OR (SELECT warehouse_id FROM order_lines WHERE id = :order_line_id) IS NULL)
    """)

# ✅ AFTER:
if order_line_id is not None:
    # Extract product from order line
    # Note: Order lines don't specify warehouse - warehouse is chosen during allocation
    sql_parts.append("""
        AND l.product_id = (
            SELECT product_id FROM order_lines WHERE id = :order_line_id
        )
    """)
    params["order_line_id"] = order_line_id
    # Warehouse filter removed - order_lines.warehouse_id doesn't exist in DDL v2.2
```

### Phase 2: Testing

1. Run `ruff check backend/app/`
2. Run `ruff format backend/app/`
3. Run tests: `pytest backend/tests/ -k "not integration"`
4. Manual API test:
   - `GET /api/orders?customer_code=XXX`
   - `GET /api/allocation-candidates?order_line_id=XXX`

---

## Prevention Guidelines

### For Future Development

1. **DDL is Single Source of Truth**
   - Always check `docs/schema/base/lot_management_ddl_v2_2_id.sql` before referencing columns
   - Never assume a column exists without verification

2. **Code Pattern Guidelines**
   - ✅ **DO:** Join to access related table columns
     ```python
     stmt.join(Customer).where(Customer.customer_code == code)
     ```
   - ❌ **DON'T:** Assume denormalized columns exist
     ```python
     stmt.where(Order.customer_code == code)  # customer_code not in orders table
     ```

3. **Raw SQL Guidelines**
   - Always verify column existence in DDL before writing raw SQL
   - Prefer SQLAlchemy ORM over raw SQL when possible
   - If using raw SQL, add comments explaining column source

4. **Column Naming Patterns (DDL v2.2)**
   - Master tables: `<entity>_code` (e.g., `customer_code`, `product_code`)
   - All tables: `id` for primary key (not `<table>_id`)
   - Foreign keys: `<referenced_table>_id` (e.g., `customer_id`, `product_id`)

---

## Files Modified

1. `backend/app/repositories/order_repository.py` - Fix Order.customer_code reference
2. `backend/app/services/allocation/allocation_candidates_service.py` - Remove order_lines.warehouse_id reference

---

## Commit Message

**English (Conventional Commits):**
```
fix(schema): align repository and service queries with DDL v2.2

- Fix Order.customer_code reference in order_repository (use JOIN)
- Remove non-existent order_lines.warehouse_id from allocation query
- Add comprehensive schema consistency check tooling

Fixes: #<issue-number>
```

**Japanese:**
```
修正(スキーマ): DDL v2.2 に合わせてリポジトリとサービスのクエリを整合

- order_repository で Order.customer_code 参照を修正 (JOIN を使用)
- allocation クエリから存在しない order_lines.warehouse_id を削除
- スキーマ整合性チェックツールを追加
```

---

## Related Documentation

- DDL Source: `docs/schema/base/lot_management_ddl_v2_2_id.sql`
- Schema Check Tool: `tools/schema_consistency_check_v2.py`
- Schema Check Report: `schema_consistency_report.md`
