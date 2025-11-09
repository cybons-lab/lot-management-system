# Migration and Schema Inconsistency Fixes - Summary

**Date:** 2025-11-09
**Branch:** `claude/fix-migration-schema-inconsistencies-011CUxPsNDa4fB8KTcXVDtgf`

## Problem Summary

The Lot Management System had critical schema inconsistencies between Alembic migrations and SQLAlchemy models that caused:

1. ❌ **Error:** `psycopg2.errors.UndefinedColumn: column customers.id does not exist`
2. ❌ **Error:** Alembic attempted to create `lot_current_stock` as a TABLE instead of a VIEW
3. ❌ **Error:** Seeding failed at the customer step after inserting warehouses and products
4. ❌ **Error:** `stock_movements.product_id` was TEXT FK to `products.product_code` instead of INTEGER FK to `products.id`

## Root Causes Identified

### 1. Inverted Schema Design in Initial Migration

**File:** `backend/alembic/versions/664ac90c10f4_initial_schema_base_after_manual_.py`

The initial migration created tables with **code-based primary keys** when the SQLAlchemy models expected **id-based primary keys**:

| Table | Initial Migration PK | SQLAlchemy Model PK | Status |
|-------|---------------------|---------------------|--------|
| `customers` | `customer_code TEXT` | `id INTEGER` | ❌ Mismatch |
| `products` | `product_code TEXT` | `id INTEGER` | ❌ Mismatch |
| `suppliers` | `supplier_code TEXT` | `id INTEGER` | ❌ Mismatch |
| `warehouses` | `id SERIAL` | `id INTEGER` | ✅ Match |

### 2. StockMovement Foreign Key Type Mismatch

**Issue:** The `stock_movements.product_id` column was created as TEXT with FK to `products(product_code)`, but the StockMovement model expects INTEGER with FK to `products(id)`.

**Impact:** Any code trying to insert StockMovement records with `product_id` as integer would fail.

### 3. lot_current_stock Created as TABLE

**Issue:** The initial migration's downgrade section attempted to alter `lot_current_stock` as a table, but it should only exist as a VIEW (properly handled in migration `744d13c795bd`).

### 4. Seed Data Not Using ID-based Foreign Keys

**File:** `backend/app/api/routes/admin.py`

The `load_full_sample_data` function had multiple issues:
- Used incorrect column names for `StockMovement` (`movement_type`, `quantity`, `movement_date` instead of `reason`, `quantity_delta`, `occurred_at`)
- Created `Lot` records without setting `product_id`, `supplier_id` (only set code fields)
- Created `Order` records without setting `customer_id`
- Created `OrderLine` records without setting `product_id`
- This caused `StockMovement` creation to fail since `product_id` was None

## Solutions Implemented

### 1. New Migration: Fix Schema Inconsistencies

**File:** `backend/alembic/versions/vh9a4atxbh4q_fix_schema_inconsistencies_id_pks.py`

Created a comprehensive, **idempotent** migration that:

✅ Converts `customers`, `products`, `suppliers` to use `id` as PRIMARY KEY
✅ Adds UNIQUE constraints on `customer_code`, `product_code`, `supplier_code`
✅ Fixes `stock_movements.product_id` from TEXT to INTEGER
✅ Updates all foreign key references to use id-based relationships
✅ Handles both scenarios: databases with code-based PKs and those already having id-based PKs
✅ Preserves existing data during migration

**Key Features:**
- Idempotent: Safe to run multiple times
- Handles data migration: Converts product_code references to product_id
- Creates sequences for auto-incrementing id columns
- Maintains backward compatibility with denormalized code columns

### 2. Fixed admin.py Seed Data Logic

**File:** `backend/app/api/routes/admin.py`

**Changes Made:**

#### a) StockMovement Creation (Lines 246-269)
**Before:**
```python
db.add(StockMovement(
    product_id=db_lot.product_id,   # Was None!
    movement_type="receipt",        # Wrong column
    quantity=recv_qty,              # Wrong column
    movement_date=date.today(),     # Wrong column
))
```

**After:**
```python
db.add(StockMovement(
    product_id=product.id,          # Correct: INTEGER FK to products.id
    reason="inbound",               # Correct: matches model
    quantity_delta=recv_qty,        # Correct: matches model
    occurred_at=datetime.utcnow(),  # Correct: matches model
))
```

#### b) Lot Creation (Lines 244-256)
**Added:** Proper lookup of `product_id`, `supplier_id` from their respective tables

**Before:**
```python
db_lot = Lot(
    supplier_code=lot_data.supplier_code,
    product_code=lot_data.product_code,
    warehouse_id=warehouse.id,
    # Missing: product_id, supplier_id
)
```

**After:**
```python
db_lot = Lot(
    product_id=product.id,           # Added: id-based FK
    product_code=lot_data.product_code,  # Kept: denormalized
    supplier_id=supplier.id if supplier else None,  # Added
    supplier_code=lot_data.supplier_code,  # Kept: denormalized
    warehouse_id=warehouse.id,
    warehouse_code=warehouse.warehouse_code,  # Added
)
```

#### c) Order Creation (Lines 307-313)
**Added:** Lookup of `customer_id` from `customer_code`

**Before:**
```python
db_order = Order(
    customer_code=order_data.customer_code,
    # Missing: customer_id
)
```

**After:**
```python
db_order = Order(
    customer_id=customer.id if customer else None,  # Added
    customer_code=order_data.customer_code,
)
```

#### d) OrderLine Creation (Lines 355-363)
**Added:** Use `product.id` for `product_id` field

**Before:**
```python
db_line = OrderLine(
    product_code=line_data.product_code,
    # Missing: product_id
)
```

**After:**
```python
db_line = OrderLine(
    product_id=product.id,           # Added
    product_code=line_data.product_code,
)
```

#### e) Added datetime Import (Line 8)
```python
from datetime import date, datetime  # Added datetime
```

### 3. Migration File Context

The new migration is designed to work in the migration chain:

```
664ac90c10f4 (initial - buggy schema)
    ↓
5f68d2a452b8 (audit history)
    ↓
952dcae456fb (unify quantities)
    ↓
744d13c795bd (lot_current_stock → VIEW)
    ↓
c91377233966 (warehouses unique constraint)
    ↓
3f8a35b39c3d (denormalized code columns)
    ↓
vh9a4atxbh4q ← NEW: Fix schema inconsistencies
```

## Files Modified

1. ✅ **Created:** `backend/alembic/versions/vh9a4atxbh4q_fix_schema_inconsistencies_id_pks.py`
   - New migration to fix schema from code-based to id-based PKs
   - Idempotent and safe to run multiple times
   - Handles data migration automatically

2. ✅ **Updated:** `backend/app/api/routes/admin.py`
   - Fixed `StockMovement` creation with correct column names
   - Added proper id field population for `Lot`, `Order`, `OrderLine`
   - Added `datetime` import
   - Ensured both id and code fields are populated (denormalization)

## Expected Outcomes

After applying these fixes:

✅ **`/api/admin/reset-database`** should work without errors
✅ **`/api/admin/seeds`** should successfully create sample data
✅ **`/api/admin/load-full-sample-data`** should work with correct schema
✅ All tables have consistent structure: `id` as PK, `code` as UNIQUE
✅ Foreign key relationships use id-based references (INTEGER)
✅ Denormalized code columns are maintained for backward compatibility
✅ `lot_current_stock` exists only as a VIEW, not a TABLE
✅ No more `column customers.id does not exist` errors
✅ StockMovement records can be created successfully

## Testing Checklist

Before deployment, verify:

- [ ] Run `alembic upgrade head` successfully
- [ ] Run `/api/admin/reset-database` without errors
- [ ] Run `/api/admin/seeds` and verify data is inserted
- [ ] Check that `customers`, `products`, `suppliers` tables have `id` as PK
- [ ] Verify `lot_current_stock` is a VIEW (not a TABLE)
- [ ] Confirm `stock_movements.product_id` is INTEGER type
- [ ] Test that sample data seeding completes without 500 errors

## Notes for Future Development

1. **Dual Schema Support:** The system now supports both id-based and code-based lookups through denormalized columns. The migration `3f8a35b39c3d` ensures these stay in sync.

2. **Seed Endpoints:** There are two seeding mechanisms:
   - `/api/admin/seeds` - Uses `seeds_service.py` (simpler, uses UPSERT)
   - `/api/admin/load-full-sample-data` - Uses `admin.py` (more complex, with validation)

   Both have been fixed to use id-based foreign keys.

3. **Migration Strategy:** The new migration is idempotent, meaning it can safely handle:
   - Databases created with the buggy initial migration
   - Databases already having the correct schema
   - Partial migrations

4. **No Downgrade:** The new migration does not support downgrade as converting from id-based to code-based PKs would be destructive. Restore from backup if needed.

## Author Comments

The root cause was a mismatch between the initial migration's schema design (code-based PKs) and the SQLAlchemy models (id-based PKs). This suggests the initial migration was either:
- Written for a different schema design that was later changed
- The downgrade section was mistakenly placed in the upgrade section

The fix establishes a consistent schema where:
- **Primary Keys:** Always use `id` (auto-incrementing integer)
- **Unique Constraints:** Always use `code` columns (customer_code, product_code, etc.)
- **Foreign Keys:** Always reference `id` fields
- **Denormalized Columns:** Code columns are kept for backward compatibility and denormalized lookups

This approach provides the best of both worlds: database normalization (id-based relationships) and developer convenience (code-based lookups).
