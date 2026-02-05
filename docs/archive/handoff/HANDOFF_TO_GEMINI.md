# Handoff to Gemini - Phase1 Frontend Migration Completion

**Date:** 2026-02-02
**Branch:** `fix/migration-boolean-comparison-error`
**Status:** Frontend TypeScript errors fixed (0 errors), Backend P1-P3 tasks remain

---

## 🎯 Current Status

### ✅ Completed (Frontend)
- **All TypeScript errors fixed** - `npm run typecheck` passes with 0 errors
- **Excel view migration** - All `product_group_id` → `supplier_item_id` replacements done
- **~100 files updated** across all features (inventory, forecasts, orders, inbound-plans, withdrawals, etc.)
- **Committed**: Commit `75811556` - "fix(frontend): Complete product_group_id to supplier_item_id migration in frontend"

### 🔄 Remaining Work (Backend)

**Priority P1** - Critical business logic (18 files):
- Allocations services and repositories
- Order services
- Inventory services
- Test data generation

**Priority P2** - Test utilities (7 files):
- Test data generators
- Sample data initialization

**Priority P3** - Low priority (15 files):
- Scripts and utilities
- Legacy/deprecated endpoints

**Total:** 40 backend files still need migration

---

## 📋 Next Steps for Gemini

### Immediate Task: Fix Backend P1 Files

Work through the files listed in `docs/project/PHASE1_CLEANUP_TASKS.md` under **Priority P1**.

**Modification Pattern:**
```python
# OLD
product_group_id = order_line.product_group_id
customer_items = db.query(CustomerItem).filter(
    CustomerItem.product_group_id == product_group_id
)

# NEW
supplier_item_id = order_line.supplier_item_id
customer_items = db.query(CustomerItem).filter(
    CustomerItem.supplier_item_id == supplier_item_id
)
```

**Key Points:**
1. Replace `product_group_id` → `supplier_item_id` in:
   - Function parameters
   - Variable names
   - Database queries
   - Filter conditions
   - Dictionary keys

2. **Do NOT change:**
   - Comments mentioning "製品グループ" (product group) - context is still valid
   - Database column references in raw SQL if they match current schema
   - Type hints (already using correct types from models)

3. **Run tests after each service:**
   ```bash
   docker compose exec backend pytest app/tests/test_services/ -v
   ```

---

## 📂 File List - Priority P1 (18 files)

### Allocations (10 files)
```
backend/app/application/services/allocations/
├── allocation_service.py
├── candidate_service.py
├── fefo_service.py
├── fifo_service.py
└── suggestion_service.py

backend/app/infrastructure/persistence/repositories/
├── allocation_repository.py
├── allocation_suggestion_repository.py
└── candidate_lot_repository.py

backend/app/presentation/api/routes/allocations/
├── allocation_router.py
└── candidate_router.py
```

### Orders (4 files)
```
backend/app/application/services/orders/
├── order_line_service.py
└── order_service.py

backend/app/infrastructure/persistence/repositories/
├── order_line_repository.py
└── order_repository.py
```

### Inventory (4 files)
```
backend/app/application/services/inventory/
├── inventory_service.py
└── lot_service.py

backend/app/infrastructure/persistence/repositories/
├── inventory_repository.py
└── lot_repository.py
```

---

## 🧪 Testing Strategy

After fixing each service module:

```bash
# 1. Run mypy type check
docker compose exec backend mypy app/application/services/allocations/

# 2. Run related tests
docker compose exec backend pytest app/tests/test_services/test_allocations/ -v

# 3. Quick smoke test (optional)
curl -X POST http://localhost:8000/api/admin/reset-database
curl -X POST http://localhost:8000/api/admin/init-sample-data
```

---

## 🎬 Excel View Testing

After P1 backend fixes are complete, test the Excel view:

1. **Navigate to:** http://localhost:3000/inventory
2. **Click on any inventory item** to open Excel view
3. **Expected:** Data should display (ロット情報, 引当先, etc.)
4. **Current issue:** "該当する得意先品番が見つかりません" - should be fixed after backend migration

---

## 📊 Progress Tracking

**Total P1 Files:** 18
**Completed:** 0
**Remaining:** 18

Update this document as you complete files. Use this format:

```markdown
### Completed Files
- ✅ allocation_service.py (commit: abc123)
- ✅ candidate_service.py (commit: abc456)
...
```

---

## 🚨 Important Notes

1. **Keep commits atomic** - One logical unit per commit (e.g., "fix: migrate allocation_service to supplier_item_id")
2. **Run type checks** - `mypy` must pass with 0 errors before committing
3. **Follow CLAUDE.md standards** - File size < 300 lines, complexity < 10
4. **Don't break existing tests** - If tests fail, fix the test data too
5. **午後一の動作確認** - User has a demo at 1 PM today, prioritize P1 files

---

## 📞 Contact

If you encounter issues:
- Check `docs/project/migration-investigation-report.md` for known issues
- Reference `CLAUDE.md` for coding standards
- Backend mypy errors? Check model relationships in `masters_models.py`

---

## 🔗 Related Documents

- `docs/project/PHASE1_CLEANUP_TASKS.md` - Full file list with examples
- `docs/project/migration-investigation-report.md` - Investigation findings
- `CLAUDE.md` - Project coding standards
- `backend/app/infrastructure/persistence/models/masters_models.py` - Model definitions

---

**Good luck! 🚀**
