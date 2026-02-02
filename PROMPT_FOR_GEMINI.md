# Prompt for Gemini: Phase1 Backend Migration

## Context
We're migrating from `product_group_id` to `supplier_item_id` as part of Phase1 architecture cleanup. The frontend is complete (0 TypeScript errors), but backend P1 files need migration.

## Your Task
Fix **18 Priority P1 backend files** listed in `docs/project/PHASE1_CLEANUP_TASKS.md`.

## Files to Fix (P1 - Critical)

### Allocations Services (5 files)
- `backend/app/application/services/allocations/allocation_service.py`
- `backend/app/application/services/allocations/candidate_service.py`
- `backend/app/application/services/allocations/fefo_service.py`
- `backend/app/application/services/allocations/fifo_service.py`
- `backend/app/application/services/allocations/suggestion_service.py`

### Allocation Repositories (3 files)
- `backend/app/infrastructure/persistence/repositories/allocation_repository.py`
- `backend/app/infrastructure/persistence/repositories/allocation_suggestion_repository.py`
- `backend/app/infrastructure/persistence/repositories/candidate_lot_repository.py`

### Allocation Routers (2 files)
- `backend/app/presentation/api/routes/allocations/allocation_router.py`
- `backend/app/presentation/api/routes/allocations/candidate_router.py`

### Orders (4 files)
- `backend/app/application/services/orders/order_line_service.py`
- `backend/app/application/services/orders/order_service.py`
- `backend/app/infrastructure/persistence/repositories/order_line_repository.py`
- `backend/app/infrastructure/persistence/repositories/order_repository.py`

### Inventory (4 files)
- `backend/app/application/services/inventory/inventory_service.py`
- `backend/app/application/services/inventory/lot_service.py`
- `backend/app/infrastructure/persistence/repositories/inventory_repository.py`
- `backend/app/infrastructure/persistence/repositories/lot_repository.py`

## How to Fix Each File

### Pattern 1: Variable and Parameter Renaming
```python
# BEFORE
def allocate_lot(product_group_id: int, quantity: Decimal):
    lot = db.query(Lot).filter(Lot.product_group_id == product_group_id).first()

# AFTER
def allocate_lot(supplier_item_id: int, quantity: Decimal):
    lot = db.query(Lot).filter(Lot.supplier_item_id == supplier_item_id).first()
```

### Pattern 2: Dictionary Keys
```python
# BEFORE
params = {
    "product_group_id": product_id,
    "quantity": qty
}

# AFTER
params = {
    "supplier_item_id": product_id,
    "quantity": qty
}
```

### Pattern 3: Model Access
```python
# BEFORE
product_id = order_line.product_group_id
customer_items = db.query(CustomerItem).filter(
    CustomerItem.product_group_id == product_id
)

# AFTER
supplier_item_id = order_line.supplier_item_id
customer_items = db.query(CustomerItem).filter(
    CustomerItem.supplier_item_id == supplier_item_id
)
```

## Testing After Each File

```bash
# 1. Type check
docker compose exec backend mypy backend/app/application/services/allocations/allocation_service.py

# 2. Run tests
docker compose exec backend pytest backend/tests/test_services/test_allocations/ -v

# 3. Quick smoke test (optional)
curl -X POST http://localhost:8000/api/admin/reset-database
curl -X POST http://localhost:8000/api/admin/init-sample-data
```

## Standards (MUST FOLLOW)

1. **File size:** < 300 lines (if needed, split into multiple commits)
2. **Cyclomatic complexity:** < 10 per function
3. **Type hints:** Keep all existing type hints intact
4. **Docstrings:** Don't remove existing docstrings
5. **Commits:** Atomic commits per file or logical unit
   ```bash
   git add backend/app/application/services/allocations/allocation_service.py
   git commit -m "fix(allocations): migrate allocation_service to supplier_item_id

   - Replace all product_group_id references with supplier_item_id
   - Update function parameters and variable names
   - Update database queries and filters
   - Mypy and tests passing

   Phase1 cleanup: P1 allocations service

   Co-Authored-By: Gemini Pro <noreply@google.com>"
   ```

## Branch Info
- **Current branch:** `fix/migration-boolean-comparison-error`
- **Base branch:** `main`
- **Latest commits:**
  - `f295a6da` - docs: Add Gemini handoff document
  - `75811556` - fix(frontend): Complete product_group_id migration
  - `49a8bbcc` - WIP: Batch replace product_group_id in frontend

## Key Documents to Reference

1. **`docs/project/HANDOFF_TO_GEMINI.md`** - Detailed instructions (you're reading the summary)
2. **`docs/project/PHASE1_CLEANUP_TASKS.md`** - Full file list with modification patterns
3. **`CLAUDE.md`** - Project coding standards
4. **`backend/app/infrastructure/persistence/models/masters_models.py`** - Model definitions

## Success Criteria

- ✅ All 18 P1 files migrated
- ✅ `mypy backend/app/` passes with 0 errors
- ✅ `pytest backend/tests/` passes (or fails with expected failures)
- ✅ Atomic commits per file/module
- ✅ Excel view displays data (test at http://localhost:3000/inventory)

## Timeline

**Deadline:** 午後一 (1 PM) for user demo
**Expected:** ~1-2 hours for 18 files (10-15 min each)

## Questions?

Read:
1. `docs/project/HANDOFF_TO_GEMINI.md` - Full context
2. `docs/project/migration-investigation-report.md` - Known issues
3. `CLAUDE.md` - Coding standards

---

**Start with allocations services first** - they're the most critical for Excel view functionality.

Good luck! 🚀
