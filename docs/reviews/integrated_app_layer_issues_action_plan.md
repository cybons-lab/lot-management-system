# Lot Management System — App Layer Issues Consolidation & Action Plan
**Date**: 2025-12-14 (JST)  
**Scope**: Backend (services/routes/repos/sql views) + Frontend (API client/UI)  
**Input**: 4 independent AI review reports (Codex / Gemini / Claude / Local Claude).

This document is the **single consolidated source** of:
- What is currently wrong (problem statements)
- What we will do about it (decisions + concrete actions)
- What **must not** be re-interpreted (domain definitions / invariants)
- Minimal instructions for AI/agents to implement changes safely

---

## 0. Non‑Negotiable Decisions (Single Source of Truth)

### 0.1 Single Source of Truth
- **`allocations` table (order-side)** will be **abolished**.
- **`lot_reservations` table (inventory-side)** is the **only source of truth** for reservations/allocations.
- `lot_reservations` must hold references needed by order domain (e.g., `order_line_id`, `order_id` if required), so order screens can be derived from reservations without `allocations`.

### 0.2 Reservation types and meanings
We model two distinct concepts:

1) **Provisional / Soft Allocation** (planning / candidate linkage)
- Purpose: show “intended” allocation and allow iteration.
- **Does NOT reduce Available Qty** (confirmed-to-sell quantity).
- It may change frequently; therefore it must NOT mutate physical stock fields frequently.

2) **Confirmed / Hard Allocation** (SAP linkage point)
- The reservation becomes **confirmed when the system registers the allocation to SAP**.
- This is **before physical withdrawal** (出庫) in real-world flow.
- **Confirmed DOES reduce Available Qty** (because at this point business commits it to SAP).

3) **Cancel**
- If SAP-linked allocation is canceled **before physical withdrawal**, release reservation in `lot_reservations`.
- It is valid that confirmed can be released before the actual goods are physically locked.

> Important: “confirmed” in this system means **SAP-registration confirmed**, not “physically withdrawn”.

---

## 1. Core Inventory Invariants (must be implemented consistently)

### 1.1 Definitions
- **Current Qty**: `lots.current_quantity`
- **Locked Qty**: `lots.locked_quantity` (not allocatable)
- **Confirmed Reserved Qty**: sum of `lot_reservations.qty` for reservations that are confirmed
- **Planned Qty**: sum of `lot_reservations.qty` for reservations that are provisional (used for UI/monitoring only)

### 1.2 Available Qty (the only number used for “can we allocate/confirm?” checks)
**Available Qty = Current Qty − Locked Qty − Confirmed Reserved Qty**

- Provisional reservations are **not subtracted** from Available Qty.
- Confirmed reservations **are subtracted** from Available Qty.
- This formula must be defined **in exactly one place** and reused (see §4.1).

### 1.3 Status vocabulary (standardize naming)
Use explicit status names; avoid ambiguous “active/reserved/allocated” drift.
Recommended:
- `provisional`
- `confirmed`
- `cancelled` (or `released`)
(If current DB uses different strings, map them in a migration/compat layer, but standardize at boundaries.)

---

## 2. Implementation Strategy (high-level)

1) **Stop the bleeding (P0/P1 hot fixes)**
   - Seal physical lot deletion API
   - Remove double commit / partial commit patterns for single use-cases
   - Unify datetime usage (timezone correctness)
   - Fix available qty computation bugs (locked/confirmed consistency)

2) **Unify the model**
   - Move all allocation/reservation reads/writes to `lot_reservations`
   - Remove `allocations` dependencies from backend & frontend (or place behind a temporary compatibility layer with clear deprecation)

3) **Rebuild reporting/queries**
   - Update DB views to match the invariants (confirmed-only subtraction, locked subtraction)
   - Ensure all screens and services use the same definitions

4) **Harden concurrency & idempotency**
   - Confirm operation must be idempotent
   - Stock competition must be handled at confirm time (row locks / version checks)

---

## 3. Consolidated Problem List → Action Items

### P0 — Production-breaking / policy violations

#### P0-1: Lot physical deletion exists (policy violation)
**Problem**: A DELETE endpoint/service physically deletes lots, violating “lots must not be physically deleted” policy.  
**Action**:
- **Seal the API**: make DELETE return **403** with guidance (“use stock adjustment”).  
- Optionally: remove route or guard behind admin-only feature flag with explicit approval.
**Acceptance**:
- No public API path can physically delete a lot.
- Tests updated to assert 403 / endpoint removal.

#### P0-2: Double commit / partial commit inside one use-case
**Problem**: Some use-cases commit multiple times; if second commit fails, data becomes inconsistent.  
**Action**:
- For each use-case, enforce: **commit exactly once at the end**.
- Use `flush()` if IDs are needed mid-flow; do not commit mid-flow.
**Acceptance**:
- Each use-case method has a single transaction boundary.
- No multi-commit patterns remain for the same use-case.

---

### P1 — Near-term incidents / correctness risks

#### P1-1: Available Qty calculation ignores locked_quantity
**Problem**: Reservations can be created even when stock is “locked”; allocation can exceed real allocatable stock.  
**Action**:
- Ensure Available Qty formula includes locked subtraction (see §1.2).
- Remove any duplicated calculation that omits locked.
**Acceptance**:
- Any reserve/confirm endpoint rejects when `Available Qty < requested qty`.
- Unit tests cover locked cases.

#### P1-2: Views/services disagree on how confirmed affects inventory
**Problem**: DB views may ignore confirmed reservations (or use mismatched status filters), causing inflated availability.  
**Action**:
- Update views to subtract **confirmed only** (and locked).
- If “active” existed historically, decide mapping:
  - If “active” == provisional → do **not** subtract
  - If “active” == confirmed → rename/migrate
**Acceptance**:
- View-derived availability matches service availability for same lot snapshot.

#### P1-3: Confirm operation not idempotent (Enum vs string mismatch)
**Problem**: A “already confirmed” guard fails due to type mismatch; repeated confirm triggers unnecessary updates/events.  
**Action**:
- Standardize status comparisons (`.value` or DB Enum column).
- Confirm returns success without mutation when already confirmed.
**Acceptance**:
- Calling confirm twice is safe and results in no second mutation.
- Tests: idempotent confirm.

#### P1-4: Concurrency gaps in confirm / commit flows
**Problem**: Two users confirming concurrently can oversubscribe stock (negative availability).  
**Action**:
- At confirm time, enforce row locks and compute availability **inside lock scope**.
- Option A: `SELECT ... FOR UPDATE` on lot rows + reservation rows
- Option B: optimistic locking (version column) + conflict retry
**Acceptance**:
- Concurrent confirm cannot produce negative Available Qty.
- Integration test or simulated concurrency test added.

#### P1-5: datetime.now() / utcnow() mixed (timezone bugs)
**Problem**: Mixed local/UTC timestamps cause lock expiry comparisons to be wrong.  
**Action**:
- Create helper `utcnow()` returning `datetime.now(timezone.utc)`.
- Replace all timestamp creation to use helper.
**Acceptance**:
- No naive datetimes for persisted timestamps.
- Tests cover lock expiry comparisons consistently.

---

### P2 — Technical debt that causes drift & operational pain

#### P2-1: `allocations` × `lot_reservations` double-write design (inconsistency risk)
**Problem**: Two tables represent the same fact; drift is easy (manual fixes/batches).  
**Action**:
- **Abolish `allocations`**. Migrate reads/writes to `lot_reservations`.
- During transition, if necessary, introduce a **compat adapter** (read-only) but do not allow new writes to `allocations`.
- Add a **Reconciler** script (temporary) that detects drift while migration is incomplete.
**Acceptance**:
- No production code path writes `allocations`.
- Reservation/Allocation pages derive from `lot_reservations`.

#### P2-2: Error/Exception definitions duplicated (e.g., InsufficientStockError)
**Problem**: Same-named exceptions exist in multiple modules; inconsistent fields/handling.  
**Action**:
- Consolidate to a single domain exception module and import everywhere.
**Acceptance**:
- One canonical exception type used; API mapping is consistent.

#### P2-3: API status codes are ambiguous (400 for not-found etc.)
**Problem**: Clients can’t distinguish invalid input vs missing resource vs conflict.  
**Action**:
- Map errors consistently:
  - Not found → 404
  - Validation → 422
  - Stock conflict / already confirmed → 409
**Acceptance**:
- Frontend can act on status (retry, show message, refresh).

#### P2-4: Frontend lacks global error handling (409/422 not user-friendly)
**Problem**: Users see generic errors or nothing; conflict resolution workflow is unclear.  
**Action**:
- Add centralized error normalization + toast/inline display strategy.
- For 409: show “stock changed; rerun preview” or “already confirmed; refresh”.
**Acceptance**:
- 409/422 yield clear UI feedback in at least the major flows.

#### P2-5: API version mix (v1/v2 coexistence in FE)
**Problem**: Legacy endpoints linger; easy to regress.  
**Action**:
- Remove v1 usage from frontend; delete v1 client functions after migration.
**Acceptance**:
- No FE code calls v1 endpoints.

#### P2-6: Legacy identifiers (`lot_reference`) remain in types/responses
**Problem**: String identifiers can be unstable; FK should be used.  
**Action**:
- FE must use `lot_id` and `lot_number` only.
- Add lint rule / type-level restriction if possible.
**Acceptance**:
- No FE code relies on `lot_reference` for identity.

#### P2-7: Potential N+1 / view performance risks
**Action**:
- Add paging limits and/or materialize heavy aggregations if needed.
- Avoid per-lot queries for availability—use bulk or view-based results.
**Acceptance**:
- Lot list endpoints remain performant at scale; query count stable.

---

## 4. Where to Define the Availability Formula (Single Implementation Point)

Choose one and enforce globally:

### Option A (recommended for correctness + reuse): Database View/Function
- Provide view (or SQL function) that returns:
  - available_qty (using §1.2)
  - planned_qty (provisional sum)
  - confirmed_qty (confirmed sum)
  - locked_qty
- Backend services and frontend use this view as the authoritative source for display.
- Confirm endpoints still validate inside transaction lock scope.

### Option B: Service-layer single module + tests
- Create `stock_calculation.py` (or equivalent) as the **only** implementation.
- Views must match it (by integration tests or query-level tests).

**Mandatory**:
- Delete/replace all ad-hoc availability computations elsewhere.

---

## 5. Data Migration Notes (allocations → lot_reservations)

1) Add missing columns to `lot_reservations` needed to represent order linkage:
   - `order_line_id` (required)
   - optionally `order_id`, `customer_id`, etc. if needed for query efficiency
2) Backfill from `allocations` to `lot_reservations` if any data exists only there.
3) Update views/services to read `lot_reservations` only.
4) Remove `allocations`:
   - drop table (final) or keep temporarily read-only with explicit “DEPRECATED” and access blocked.

**Acceptance**:
- All order allocation screens can be produced without `allocations`.

---

## 6. Testing & Verification Checklist

### Must-have unit tests
- Available Qty respects locked + confirmed subtraction
- Provisional does not affect Available Qty
- Confirm idempotency
- Cancel releases confirmed reservation before withdrawal

### Must-have integration tests
- Concurrent confirm does not oversubscribe
- API error mapping: 404/409/422
- View availability matches service availability for same lot snapshot

### Smoke tests (manual)
- Create provisional → confirm → cancel → confirm again
- Confirm + SAP cancel simulation path
- UI: 409 shows actionable message and refresh guidance

---

## 7. Instructions for AI / Automation Agents (minimal but strict)

### Read-first rule
- **Read this entire file first**.
- Treat §0 and §1 as **contract / invariants**.
- Do not “improve” the domain meanings without explicit instruction.

### Implementation priorities
1) P0 fixes
2) Inventory invariant alignment (availability formula, views/services)
3) Confirm idempotency & concurrency
4) allocations removal (migration + cleanup)
5) Frontend (error handling, v1 removal, legacy identifiers)

### Output expectations (when making a PR)
- Small, reviewable commits (grouped by sections above)
- Update tests alongside code changes
- Provide a short “Behavior changes” note (what numbers/UX changed and why)
- If any assumption is needed, **state it** and add a TODO with a clear owner

### Prohibited changes
- Do not reintroduce `allocations` as authoritative storage
- Do not make provisional affect Available Qty
- Do not use naive datetimes for persisted timestamps
- Do not add additional status values without updating invariants & tests

---

## 8. Open Items (explicitly not finalized yet)
- Exact status string values in DB today and migration mapping to provisional/confirmed/cancelled
- Whether to implement availability as DB view/function (Option A) or service module (Option B)
- Whether optimistic locking (version columns) will be adopted system-wide

(These can be resolved incrementally as long as §0 and §1 invariants are enforced.)
