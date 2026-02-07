import { getAvailableLots } from "../inventory/api";

import type {
  ManualAllocationRequest,
  ManualAllocationResponse,
  FefoPreviewRequest,
  FefoPreviewResponse,
  AllocationCommitRequest,
  AllocationCommitResponse,
  CreateAllocationPayload,
  AllocationResult,
  PlanningAllocationSummary,
  BulkAutoAllocateRequest,
  BulkAutoAllocateResponse,
  BatchAutoOrderRequest,
  BatchAutoOrderResponse,
  AllocationSuggestionRequest,
  AllocationSuggestionPreviewResponse,
  AllocationSuggestionListResponse,
  AllocationSuggestionBatchUpdateItem,
  ReservationCancelRequest,
  ReservationCancelResponse,
} from "./types";

export * from "./types";
export * from "./constants";

import { http } from "@/shared/api/http-client";

// ===== New API Functions (v2) =====

/**
 * Get allocation candidates for an order line
 * (Wrapper around Inventory API getAvailableLots)
 */
export const getAllocationCandidates = async (params: {
  order_line_id: number;
  supplier_item_id: number; // Added: required for v2 lot search
  warehouse_id?: number;
  limit?: number;
  strategy?: "fefo" | "fifo" | "custom";
}) => {
  // Call Inventory API v2
  const lots = await getAvailableLots({
    supplier_item_id: params.supplier_item_id,
    warehouse_id: params.warehouse_id,
  });

  // Convert to CandidateLotsResponse format
  const items = lots.map((lot) => ({
    lot_id: lot.lot_id,
    lot_number: lot.lot_number || lot.lot_code, // fallback
    available_quantity: lot.available_qty,
    expiry_date: lot.expiry_date,
    product_code: lot.product_code,
    warehouse_code: lot.warehouse_code,
    // Compatibility fields
    free_qty: lot.available_qty,
    current_quantity: lot.available_qty,
    allocated_quantity: 0,
    status: "clean",
    warehouse_name: lot.warehouse_code, // fallback using code
    lock_reason: null,
    internal_unit: null,
    qty_per_internal_unit: null,
    external_unit: null,
  }));

  // Simple sort if needed (server already returns somewhat sorted?)
  // v2 getAvailableLots doesn't guarantee FEFO, list_lots does.
  // getAvailableLots implementation uses InProcessLotClient -> Logic might sort.

  return { items };
};

/**
 * Create allocations for an order line
 * @deprecated Use saveManualAllocations instead for v2 API
 *
 * This function now delegates to saveManualAllocations (v2) for compatibility
 */
export async function createAllocations(
  payload: CreateAllocationPayload,
): Promise<AllocationResult> {
  // Convert legacy payload format to v2 format
  const v2Allocations = payload.allocations.map((a) => ({
    lot_id: a.lotId,
    quantity: a.quantity,
  }));

  await saveManualAllocations({
    order_line_id: payload.order_line_id,
    allocations: v2Allocations,
  });

  return { order_id: payload.order_line_id };
}

/**
 * Cancel all allocations for an order line
 * Uses bulk-cancel endpoint with allocation IDs
 *
 * @param orderLineId - Order line ID
 * @param allocationIds - Array of allocation IDs to cancel (must be provided by caller)
 */
export const cancelAllocationsByLine = async (_orderLineId: number, allocationIds: number[]) => {
  if (allocationIds.length === 0) {
    return {
      success: true,
      message: "No allocations to cancel",
      cancelled_ids: [] as number[],
      failed_ids: [] as number[],
    };
  }

  const result = await http.post<{
    cancelled_ids: number[];
    failed_ids: number[];
    message: string;
  }>("allocations/bulk-cancel", { allocation_ids: allocationIds });

  return {
    success: result.failed_ids.length === 0,
    message: result.message,
    cancelled_ids: result.cancelled_ids,
    failed_ids: result.failed_ids,
  };
};

export const confirmAllocationsBatch = (data: {
  allocation_ids: number[];
  confirmed_by?: string;
}) => {
  return http.post<{ confirmed_ids: number[]; failed_items: { id: number; error: string }[] }>(
    "allocations/confirm-batch",
    data,
  );
};

// ===== Group Planning Summary (計画引当サマリ) =====

export const getPlanningAllocationSummary = (params: {
  customer_id: number;
  delivery_place_id: number;
  supplier_item_id: number;
  forecast_period?: string;
}) => {
  const searchParams = new URLSearchParams();
  searchParams.append("customer_id", params.customer_id.toString());
  searchParams.append("delivery_place_id", params.delivery_place_id.toString());
  searchParams.append("supplier_item_id", params.supplier_item_id.toString());
  if (params.forecast_period) {
    searchParams.append("forecast_period", params.forecast_period);
  }
  return http.get<PlanningAllocationSummary>(
    `v2/forecast/suggestions/group-summary?${searchParams.toString()}`,
  );
};

// ===== Bulk Auto-Allocate (グループ一括引当) =====

export const bulkAutoAllocate = (data: BulkAutoAllocateRequest) => {
  return http.post<BulkAutoAllocateResponse>("allocations/bulk-auto-allocate", data);
};

// ===== Order Auto-Allocate (Batch) =====

export const autoAllocateOrders = (data: BatchAutoOrderRequest) => {
  return http.post<BatchAutoOrderResponse>("allocations/auto-orders", data);
};

// ===== Allocation Suggestions API (v1) =====

export const generateAllocationSuggestions = (data: AllocationSuggestionRequest) => {
  return http.post<AllocationSuggestionPreviewResponse>("v2/forecast/suggestions/preview", data);
};

export const getAllocationSuggestions = (
  params: {
    skip?: number;
    limit?: number;
    forecast_period?: string;
    supplier_item_id?: number;
    customer_id?: number;
  } = {},
) => {
  const searchParams = new URLSearchParams();
  if (params.skip) searchParams.append("skip", params.skip.toString());
  if (params.limit) searchParams.append("limit", params.limit.toString());
  if (params.forecast_period) searchParams.append("forecast_period", params.forecast_period);
  if (params.supplier_item_id)
    searchParams.append("supplier_item_id", params.supplier_item_id.toString());
  if (params.customer_id) searchParams.append("customer_id", params.customer_id.toString());

  const queryString = searchParams.toString();
  return http.get<AllocationSuggestionListResponse>(
    `v2/forecast/suggestions${queryString ? "?" + queryString : ""}`,
  );
};

export const updateAllocationSuggestionsBatch = (data: {
  updates: AllocationSuggestionBatchUpdateItem[];
}) => {
  return http.post<{ status: string; updated_count: number; message: string }>(
    "v2/forecast/suggestions/batch",
    data,
  );
};

export const createManualAllocationSuggestion = (data: ManualAllocationRequest) => {
  return http.post<ManualAllocationResponse>("v2/allocation/manual", data);
};

/**
 * Create FEFO allocation suggestion (preview only)
 * @endpoint POST /api/v2/allocation/preview
 */
export const createFefoAllocationSuggestion = (data: FefoPreviewRequest) => {
  return http.post<FefoPreviewResponse>("v2/allocation/preview", data);
};

/**
 * Commit allocation (Finalize soft allocations to hard)
 * @endpoint POST /api/v2/allocation/commit
 */
export const commitAllocation = (data: AllocationCommitRequest) => {
  return http.post<AllocationCommitResponse>("v2/allocation/commit", data);
};

/**
 * Cancel allocation
 * @endpoint DELETE /api/v2/allocation/{id}
 */
export const cancelAllocation = (allocationId: number) => {
  return http.delete<void>(`v2/allocation/${allocationId}`);
};

/**
 * Save manual allocations for a specific order line (Batch wrapper)
 * Calls createManualAllocationSuggestion for each item.
 */
export const saveManualAllocations = async (data: {
  order_line_id: number;
  allocations: {
    lot_id: number;
    quantity: number;
  }[];
}) => {
  const promises = data.allocations.map((a) =>
    createManualAllocationSuggestion({
      order_line_id: data.order_line_id,
      lot_id: a.lot_id,
      allocated_quantity: a.quantity,
    }),
  );

  const results = await Promise.all(promises);
  return {
    success: true,
    created_count: results.length,
    message: "Allocations saved successfully",
  };
};

/**
 * List allocations by order
 * @endpoint GET /api/v2/allocation/by-order/{order_id}
 */
export const getAllocationsByOrder = (orderId: number) => {
  return http.get<ManualAllocationResponse[]>(`v2/allocation/by-order/${orderId}`);
};

// ===== Reservation Cancel (予約取消) =====

/**
 * Cancel a CONFIRMED reservation (reversal transaction)
 * @endpoint POST /api/allocations/{allocation_id}/cancel
 */
export const cancelConfirmedReservation = (
  allocationId: number,
  data: ReservationCancelRequest,
) => {
  return http.post<ReservationCancelResponse>(`allocations/${allocationId}/cancel`, data);
};
