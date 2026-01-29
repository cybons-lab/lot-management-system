# Phase1 Architectural Issue: Product Code vs Maker Part Number Duplication

**Date:** 2026-01-27
**Status:** CRITICAL - Requires Resolution Before Production
**Identified By:** User feedback during UI testing

---

## Problem Statement

The current sample data has `supplier_items.maker_part_no` duplicating `products.maker_part_code`, which defeats the purpose of Phase1's SKU-driven architecture.

### User's Observation (Original Japanese)

> 「商品構成に出てるコードがメーカー品番なんだけどさ、これだとメーカー品番が被ってしまうんだよ。メーカー品番＝仕入先の品番」

**Translation:**
"The codes showing in product composition are actually maker part numbers, which causes duplicates. Maker part number = supplier's part number"

---

## Current State (INCORRECT)

### Database Schema

```
products table:
├── id: BIGINT (PK)
├── maker_part_code: VARCHAR(100) NOT NULL  ← Product's unique code
└── product_name: VARCHAR(200)

supplier_items table:
├── id: BIGINT (PK)
├── product_id: BIGINT (FK to products, NULLABLE)
├── supplier_id: BIGINT (FK to suppliers, NOT NULL)
├── maker_part_no: VARCHAR(100) NOT NULL  ← Should be supplier's OWN code
└── (supplier_id, maker_part_no) UNIQUE constraint
```

### Sample Data (PROBLEM)

```sql
-- Products
ID: 1, maker_part_code: 'PRD-171WI', name: '六角ボルト M6 91'
ID: 2, maker_part_code: 'PRD-782qH', name: '配線ケーブル A 22'

-- Supplier Items (INCORRECT - maker_part_no duplicates product code)
SI_ID: 1, maker_part_no: 'PRD-171WI', supplier: '有限会社鈴木電気', product_id: 1
SI_ID: 2, maker_part_no: 'PRD-782qH', supplier: '有限会社鈴木電気', product_id: 2
SI_ID: 3, maker_part_no: 'PRD-782qH', supplier: '村上通信有限会社', product_id: 2  ← DUPLICATE!
```

**Result:**
- Multiple suppliers have identical `maker_part_no` values
- Query result shows 5 maker_part_no values used by 2+ suppliers
- This violates the real-world expectation that each supplier has their own part numbering system

---

## Expected State (CORRECT)

### Correct Business Logic

**Real-world scenario:**
- **Product:** "M6 Hex Bolt" (internal product)
- **Product Code:** `PRD-171WI` (internal reference)
- **Supplier A (有限会社鈴木電気):** Calls it `SUZ-BOLT-M6-001` (their catalog number)
- **Supplier B (村上通信有限会社):** Calls it `MUR-HB-M6-123` (their catalog number)

### Corrected Sample Data

```sql
-- Products (UNCHANGED)
ID: 1, maker_part_code: 'PRD-171WI', name: '六角ボルト M6 91'
ID: 2, maker_part_code: 'PRD-782qH', name: '配線ケーブル A 22'

-- Supplier Items (CORRECTED - each supplier has unique part numbers)
SI_ID: 1, maker_part_no: 'SUZ-BOLT-M6-001', supplier: '有限会社鈴木電気', product_id: 1
SI_ID: 2, maker_part_no: 'SUZ-CABLE-A22', supplier: '有限会社鈴木電気', product_id: 2
SI_ID: 3, maker_part_no: 'MUR-CABLE-A22-V2', supplier: '村上通信有限会社', product_id: 2
SI_ID: 4, maker_part_no: 'MUR-GASKET-B96', supplier: '村上通信有限会社', product_id: 3
```

**Benefits:**
- ✅ Each supplier's `maker_part_no` is unique to that supplier
- ✅ Multiple suppliers can sell the same product with different part numbers
- ✅ The (supplier_id, maker_part_no) unique constraint makes sense
- ✅ Customer orders can reference supplier-specific part numbers

---

## Impact Analysis

### Affected Components

1. **Sample Data Generation:**
   - `seed_smartread_dummy.py` - May be generating incorrect data
   - Database reset scripts - Need to generate proper supplier part numbers

2. **UI Display:**
   - Supplier Products table showing duplicate codes
   - Customer Items form showing confusing dropdowns
   - Product composition views mixing product codes with supplier codes

3. **Business Logic:**
   - Customer item mappings may be using product_code instead of maker_part_no
   - Order processing may not correctly identify supplier-specific items
   - Inventory tracking could be confused between product-level and supplier-level SKUs

### Data Migration Required

If production data exists, a migration is needed to:
1. Generate unique supplier-specific part numbers for each supplier_item
2. Update any customer_items references to use new part numbers
3. Update any order_lines or lot_receipts that reference old part numbers

---

## Proposed Solution

### Option 1: Fix Sample Data Only (Quick Fix)

**Approach:**
1. Update sample data generation to create unique supplier part numbers
2. Use naming pattern: `{SUPPLIER_PREFIX}-{PRODUCT_TYPE}-{VARIANT}`
3. No schema changes required

**Pros:**
- Quick to implement
- No breaking changes
- Validates the existing schema design

**Cons:**
- Doesn't fix production data if it exists
- Requires manual data cleanup for existing deployments

### Option 2: Add Data Validation + Migration (Comprehensive)

**Approach:**
1. Add validation to prevent duplicate maker_part_no across suppliers for same product
2. Create migration script to fix existing data
3. Add UI warnings when duplicate patterns detected
4. Update documentation with clear examples

**Pros:**
- Prevents future issues
- Fixes existing data systematically
- Provides guardrails for users

**Cons:**
- More development effort
- Requires testing migration scripts
- May break existing workflows temporarily

---

## Recommended Action

**Immediate (Today):**
1. ✅ Document the issue (this document)
2. Create new sample data with correct supplier-specific part numbers
3. Test UI with corrected data
4. Verify Phase1 forms work correctly with non-duplicate codes

**Short-term (This Week):**
1. Add validation warnings in UI when duplicate patterns detected
2. Update user documentation with clear examples
3. Create data audit script to check for this pattern in production databases

**Long-term (Before Production):**
1. Implement strict validation in backend API
2. Add database constraint or trigger if feasible
3. Create migration guide for existing deployments

---

## Related Files

- `/backend/app/infrastructure/persistence/models/product_models.py` - Product model
- `/backend/app/infrastructure/persistence/models/supplier_models.py` - Supplier items model
- `/backend/seed_smartread_dummy.py` - Sample data generation
- `/frontend/src/features/supplier-products/components/SupplierProductForm.tsx` - UI form
- `/docs/project/PHASE1_IMPLEMENTATION.md` - Phase1 overview

---

## Questions for Stakeholders

1. **Should we allow the same maker_part_no across different suppliers?**
   - Current constraint: (supplier_id, maker_part_no) UNIQUE
   - This allows duplicates across suppliers
   - Is this the desired behavior?

2. **What should happen if a customer order specifies a maker_part_no that exists for multiple suppliers?**
   - Should we require customer_item mapping first?
   - Should we use supplier priority rules?
   - Should we reject ambiguous orders?

3. **How should we handle historical data?**
   - Preserve original part numbers?
   - Generate new ones systematically?
   - Allow manual correction?

---

## Status Updates

- **2026-01-27:** Issue identified during UI testing
- **2026-01-27:** Analysis document created
- **[TBD]:** Solution approved and implemented
