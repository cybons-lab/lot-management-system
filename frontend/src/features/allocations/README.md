# Allocations Feature - API Migration Guide (v2.2)

## Overview

Phase E introduces new allocation API endpoints that follow the v2.2.1 specification. The old endpoints are deprecated and will be removed in v3.0.

## New API Endpoints (v2.2.1)

### 1. Get Allocation Candidates

**Old:** `GET /allocations/candidate-lots?product_id={id}`
**New:** `GET /allocation-candidates?order_line_id={id}`

```typescript
import { useAllocationCandidates } from "@/features/allocations/hooks";

function MyComponent() {
  const { data, isLoading } = useAllocationCandidates({
    order_line_id: 123,
    strategy: "fefo", // optional: "fefo" | "fifo" | "custom"
    limit: 200, // optional
  });

  return (
    <div>
      {data?.items.map((lot) => (
        <div key={lot.lot_id}>
          {lot.lot_number} - Free: {lot.free_qty}
        </div>
      ))}
    </div>
  );
}
```

### 2. Manual Allocation Suggestion (Preview)

**Old:** `POST /allocations/drag-assign`
**New:** `POST /allocation-suggestions/manual`

```typescript
import { useCreateManualAllocationSuggestion } from "@/features/allocations/hooks";

function MyComponent() {
  const mutation = useCreateManualAllocationSuggestion();

  const handleAllocate = async () => {
    const result = await mutation.mutateAsync({
      order_line_id: 123,
      lot_id: 456,
      quantity: 100,
    });

    console.log("Preview:", result.message);
    // Next: call commitAllocation to finalize
  };

  return <button onClick={handleAllocate}>Preview Manual Allocation</button>;
}
```

### 3. FEFO Allocation Suggestion (Preview)

**Old:** `POST /allocations/preview`
**New:** `POST /allocation-suggestions/fefo`

```typescript
import { useCreateFefoAllocationSuggestion } from "@/features/allocations/hooks";

function MyComponent() {
  const mutation = useCreateFefoAllocationSuggestion();

  const handlePreview = async () => {
    const result = await mutation.mutateAsync({
      order_id: 789,
    });

    console.log("FEFO Preview:", result.lines);
    // Next: call commitAllocation to finalize
  };

  return <button onClick={handlePreview}>Preview FEFO Allocation</button>;
}
```

### 4. Commit Allocation (Finalize)

**Old:** `POST /allocations/orders/{id}/allocate`
**New:** `POST /allocations/commit`

```typescript
import { useCommitAllocation } from "@/features/allocations/hooks";

function MyComponent() {
  const mutation = useCommitAllocation();

  const handleCommit = async () => {
    const result = await mutation.mutateAsync({
      order_id: 789,
    });

    console.log("Committed:", result.created_allocation_ids);
    console.log("Status:", result.status);
  };

  return <button onClick={handleCommit}>Commit Allocation</button>;
}
```

### 5. Cancel Allocation

**Endpoint:** `DELETE /allocations/{id}` (unchanged)

```typescript
import { useCancelAllocation } from "@/features/allocations/hooks";

function MyComponent() {
  const mutation = useCancelAllocation();

  const handleCancel = async (allocationId: number) => {
    await mutation.mutateAsync(allocationId);
    console.log("Allocation cancelled");
  };

  return <button onClick={() => handleCancel(123)}>Cancel Allocation</button>;
}
```

## Complete Workflow Example

```typescript
import {
  useAllocationCandidates,
  useCreateManualAllocationSuggestion,
  useCreateFefoAllocationSuggestion,
  useCommitAllocation,
} from "@/features/allocations/hooks";

function AllocationWorkflow({ orderLineId, orderId }: Props) {
  // 1. Get candidates
  const { data: candidates } = useAllocationCandidates({
    order_line_id: orderLineId,
    strategy: "fefo",
  });

  // 2. Create suggestions
  const manualMutation = useCreateManualAllocationSuggestion();
  const fefoMutation = useCreateFefoAllocationSuggestion();

  // 3. Commit
  const commitMutation = useCommitAllocation();

  // Manual allocation flow
  const handleManualAllocate = async (lotId: number, quantity: number) => {
    // Preview
    const preview = await manualMutation.mutateAsync({
      order_line_id: orderLineId,
      lot_id: lotId,
      quantity,
    });

    if (preview.status === "preview") {
      // Confirm and commit
      if (confirm(`Allocate ${quantity} from ${preview.lot_number}?`)) {
        await commitMutation.mutateAsync({ order_id: orderId });
      }
    }
  };

  // FEFO allocation flow
  const handleFefoAllocate = async () => {
    // Preview
    const preview = await fefoMutation.mutateAsync({ order_id: orderId });

    if (preview.warnings.length > 0) {
      console.warn("Warnings:", preview.warnings);
    }

    // Confirm and commit
    if (confirm("Commit FEFO allocation?")) {
      await commitMutation.mutateAsync({ order_id: orderId });
    }
  };

  return (
    <div>
      <h2>Candidates</h2>
      {candidates?.items.map((lot) => (
        <div key={lot.lot_id}>
          {lot.lot_number} - {lot.free_qty}
          <button onClick={() => handleManualAllocate(lot.lot_id, 100)}>
            Allocate 100
          </button>
        </div>
      ))}

      <button onClick={handleFefoAllocate}>Auto Allocate (FEFO)</button>
    </div>
  );
}
```

## Migration Checklist

- [ ] Replace `getCandidateLots` with `useAllocationCandidates`
- [ ] Replace `POST /allocations/drag-assign` with `createManualAllocationSuggestion` + `commitAllocation`
- [ ] Replace `POST /allocations/preview` with `createFefoAllocationSuggestion` + `commitAllocation`
- [ ] Replace `POST /allocations/orders/{id}/allocate` with `commitAllocation`
- [ ] Test the two-step flow (preview → commit)
- [ ] Remove deprecated API calls

## Breaking Changes

1. **Allocation is now a two-step process:**
   - Step 1: Create suggestion (preview only, no DB changes)
   - Step 2: Commit allocation (finalize, DB changes)

2. **Candidate lots API parameter changed:**
   - Old: Requires `product_id`
   - New: Requires `order_line_id`

3. **Response structure changed:**
   - Check the new response types in `api.ts`
   - Update any code that relies on the old response structure

## Deprecation Timeline

- **v2.2.1** (Current): New endpoints available, old endpoints deprecated
- **v2.3.0** (Q2 2026): Old endpoints will show warnings
- **v3.0.0** (Q3 2026): Old endpoints will be removed

## Support

For questions or issues, please refer to:

- Backend API docs: `/docs/architecture/api_refactor_plan_v2.2.md`
- Frontend refactor plan: `/docs/frontend/frontend_refactor_plan_v2.2.md`
