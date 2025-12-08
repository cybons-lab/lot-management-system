# Task Instruction for Claude Code

## Context
We are removing the legacy `order_number` business key from the system and replacing it with generated IDs and `customer_order_no`.
- **Backend**: Fully refactored. Database columns removed, tests passing.
- **Frontend**: Type definitions (`api.d.ts`) updated, build errors (`tsc`, `eslint`, `prettier`) resolved.
- **Problem**: The UI currently falls back to showing `order.id` where `order_number` used to be. This may be confusing for users.

## Objective
Refactor the Frontend UI to better display Order information without `order_number`, prioritizing `customer_order_no` or `sap_order_no`, and verify end-to-end functionality.

## Steps

### 1. Review & Improve UI Components
Search for components displaying Order information and ensure they are user-friendly.

- **Target Files**:
  - `frontend/src/features/orders/components/display/OrderCard.tsx`
  - `frontend/src/features/orders/components/tables/ConfirmedLinesTable.tsx`
  - `frontend/src/features/forecasts/components/ForecastDetailCard/*` (e.g. `OrderSummaryHeader.tsx`)
  - Any file using `formatOrderCode` utility.

- **Action**:
  - Instead of just showing `ID: #123`, try to show:
    - Primary: `Customer Order No` (if exists)
    - Secondary: `SAP Order No` (if exists)
    - Fallback: `ID: #123`
  - Update table headers if they still say "Order No" to something more specific like "Ref No" or "Order Code".

### 2. Manual Verification
If you have access to a browser tool or can run integration tests:
- Start the backend and frontend.
- Navigate to the **Order List** page.
- Check if orders are identifiable.
- Navigate to the **Inventory/Allocation** page.
- Ensure the removal of `order_number` hasn't broken any data loading or display logic.

### 3. Cleanup
- Ensure `npm run typecheck` and `npm run lint` still pass after your changes.
- If you find any stale code comments referencing `order_number`, remove them.

## Reference
- See `docs/tasks/NEXT_STEPS_ORDER_REFACTOR.md` for detailed status.
