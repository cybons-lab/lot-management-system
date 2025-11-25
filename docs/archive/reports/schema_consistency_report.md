# Schema Consistency Check Report

**Purpose:** Identify mismatches between DDL (source of truth) and SQLAlchemy models

---

## Summary

- **DDL tables:** 27
- **Model tables:** 28
- **Tables only in DDL:** 0
- **Tables only in models:** 1
- **Tables with column diffs:** 18
- **P0 issues (critical):** 0
- **P1 issues (high):** 18
- **P2 issues (medium):** 0

## Priority Issues

### P0: Critical

*(No P0 issues found)*

### P1: High Priority — Likely Issues

These patterns suggest potential problems.

- `adjustments` has 1 DDL-only columns: REFERENCES
- `allocation_suggestions` has 1 DDL-only columns: REFERENCES
- `allocations` has 1 DDL-only columns: REFERENCES
- `customer_items` has 1 DDL-only columns: REFERENCES
- `delivery_places` has 1 DDL-only columns: REFERENCES
- `expected_lots` has 1 DDL-only columns: REFERENCES
- `forecast_headers` has 1 DDL-only columns: REFERENCES
- `forecast_lines` has 1 DDL-only columns: REFERENCES
- `inbound_plan_lines` has 1 DDL-only columns: REFERENCES
- `inbound_plans` has 1 DDL-only columns: REFERENCES
- `inventory_items` has 1 DDL-only columns: REFERENCES
- `lots` has 1 DDL-only columns: REFERENCES
- `master_change_logs` has 1 DDL-only columns: REFERENCES
- `operation_logs` has 1 DDL-only columns: REFERENCES
- `order_lines` has 1 DDL-only columns: REFERENCES
- `orders` has 1 DDL-only columns: REFERENCES
- `stock_history` has 1 DDL-only columns: REFERENCES
- `user_roles` has 1 DDL-only columns: REFERENCES

## 1. Table-Level Differences

### (A) Tables in DDL but not in Models

*(None)*

### (B) Tables in Models but not in DDL ⚠️

- **`seed_snapshots`** — Columns: created_at, csv_dir, id, name, params_json...

## 2. Column-Level Differences

### Table: `adjustments`

**📋 Columns in DDL only (not in model):**
- `REFERENCES`

### Table: `allocation_suggestions`

**📋 Columns in DDL only (not in model):**
- `REFERENCES`

### Table: `allocations`

**📋 Columns in DDL only (not in model):**
- `REFERENCES`

### Table: `customer_items`

**📋 Columns in DDL only (not in model):**
- `REFERENCES`

### Table: `delivery_places`

**📋 Columns in DDL only (not in model):**
- `REFERENCES`

### Table: `expected_lots`

**📋 Columns in DDL only (not in model):**
- `REFERENCES`

### Table: `forecast_headers`

**📋 Columns in DDL only (not in model):**
- `REFERENCES`

### Table: `forecast_lines`

**📋 Columns in DDL only (not in model):**
- `REFERENCES`

### Table: `inbound_plan_lines`

**📋 Columns in DDL only (not in model):**
- `REFERENCES`

### Table: `inbound_plans`

**📋 Columns in DDL only (not in model):**
- `REFERENCES`

### Table: `inventory_items`

**📋 Columns in DDL only (not in model):**
- `REFERENCES`

### Table: `lots`

**📋 Columns in DDL only (not in model):**
- `REFERENCES`

### Table: `master_change_logs`

**📋 Columns in DDL only (not in model):**
- `REFERENCES`

### Table: `operation_logs`

**📋 Columns in DDL only (not in model):**
- `REFERENCES`

### Table: `order_lines`

**📋 Columns in DDL only (not in model):**
- `REFERENCES`

### Table: `orders`

**📋 Columns in DDL only (not in model):**
- `REFERENCES`

### Table: `stock_history`

**📋 Columns in DDL only (not in model):**
- `REFERENCES`

### Table: `user_roles`

**📋 Columns in DDL only (not in model):**
- `REFERENCES`

## Recommendations

1. **Fix P0 issues immediately** — These will cause SQL errors
2. **Review P1 issues** — Check for raw SQL queries using DDL-only columns
3. **Decide on P2 issues** — Determine if columns should be added to DDL or removed from models
4. **Update models to match DDL** — DDL is the single source of truth
