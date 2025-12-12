/**
 * Allocations API Client (v2)
 */

import { getAvailableLots } from "../inventory/api"; // Inventory APIからのインポート

import { http } from "@/shared/api/http-client";
import type { paths } from "@/types/api";

// ===== API Types (v2 compatible) =====

export type ManualAllocationRequest =
  paths["/api/v2/allocation/manual"]["post"]["requestBody"]["content"]["application/json"];
export type ManualAllocationResponse =
  paths["/api/v2/allocation/manual"]["post"]["responses"][200]["content"]["application/json"];

export type ManualAllocationBatchResponse = {
  success: boolean;
  created_count: number;
  message: string;
};

export type FefoPreviewRequest =
  paths["/api/v2/allocation/preview"]["post"]["requestBody"]["content"]["application/json"];
export type FefoPreviewResponse =
  paths["/api/v2/allocation/preview"]["post"]["responses"][200]["content"]["application/json"];

export type AllocationCommitRequest =
  paths["/api/v2/allocation/commit"]["post"]["requestBody"]["content"]["application/json"];
export type AllocationCommitResponse =
  paths["/api/v2/allocation/commit"]["post"]["responses"][200]["content"]["application/json"];

// Alias for compatibility
export type CandidateLotsResponse = {
  items: Array<{
    lot_id: number;
    lot_number: string;
    available_quantity: number;
    expiry_date?: string;
    product_code?: string;
    warehouse_code?: string;
  }>;
};

// ===== New API Functions (v2) =====

/**
 * Get allocation candidates for an order line
 * (Wrapper around Inventory API getAvailableLots)
 */
export const getAllocationCandidates = async (params: {
  order_line_id: number;
  product_id: number; // Added: required for v2 lot search
  warehouse_id?: number;
  limit?: number;
  strategy?: "fefo" | "fifo" | "custom";
}) => {
  // Call Inventory API v2
  const lots = await getAvailableLots({
    product_id: params.product_id,
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

// ==========================================
// ===== Legacy / v1 API Functions (Restored) =====
// ==========================================

export type CandidateLotItem = {
  lot_id: number;
  lot_number: string;
  free_qty: number;
  current_quantity: number;
  allocated_quantity: number | string;
  allocated_qty?: number;
  product_id?: number | null;
  product_code?: string | null;
  delivery_place_id?: number | null;
  delivery_place_code?: string | null;
  delivery_place_name?: string | null;
  expiry_date?: string | null;
  last_updated?: string | null;

  // Added for compatibility
  available_quantity: number;
  status?: string;
  warehouse_name?: string | null;
  warehouse_code?: string | null;
  lock_reason?: string | null;
  internal_unit?: string | null;
  qty_per_internal_unit?: number | null;
  external_unit?: string | null;
};

// Legacy types for createAllocations
export type AllocationInputItem = {
  lotId: number;
  lot?: unknown; // For UI logic compatibility
  quantity: number;
  delivery_place_id?: number | null;
};

export type CreateAllocationPayload = {
  order_line_id: number;
  allocations: AllocationInputItem[];
  product_code?: string; // Compatibility
  // other fields if necessary
};

export type AllocationResult = {
  order_id: number;
};

export async function createAllocations(
  payload: CreateAllocationPayload,
): Promise<AllocationResult> {
  // Use v1 endpoint if available, but manual allocation Logic is migrated to v2 manual suggestion + commit?
  // Or just use the old endpoint if it still exists.
  // Assuming frontend logic expects the old behavior.
  await http.post("allocations", payload);
  return { order_id: payload.order_line_id }; // Stub return
}

export const cancelAllocationsByLine = (orderLineId: number) => {
  return http.post<{
    success: boolean;
    message: string;
    cancelled_ids: number[];
  }>("allocations/cancel-by-order-line", { order_line_id: orderLineId });
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

export interface PlanningAllocationLotBreakdown {
  lot_id: number;
  lot_number: string | null;
  expiry_date: string | null;
  planned_quantity: number;
}

export interface PlanningAllocationPeriod {
  forecast_period: string;
  planned_quantity: number;
}

export interface PlanningAllocationSummary {
  has_data: boolean;
  total_planned_quantity: number;
  total_demand_quantity: number;
  shortage_quantity: number;
  lot_breakdown: PlanningAllocationLotBreakdown[];
  by_period: PlanningAllocationPeriod[];
}

export const getPlanningAllocationSummary = (params: {
  customer_id: number;
  delivery_place_id: number;
  product_id: number;
  forecast_period?: string;
}) => {
  const searchParams = new URLSearchParams();
  searchParams.append("customer_id", params.customer_id.toString());
  searchParams.append("delivery_place_id", params.delivery_place_id.toString());
  searchParams.append("product_id", params.product_id.toString());
  if (params.forecast_period) {
    searchParams.append("forecast_period", params.forecast_period);
  }
  return http.get<PlanningAllocationSummary>(
    `v2/forecast/suggestions/group-summary?${searchParams.toString()}`,
  );
};

// ===== Bulk Auto-Allocate (グループ一括引当) =====

export interface BulkAutoAllocateRequest {
  product_id?: number | null;
  customer_id?: number | null;
  delivery_place_id?: number | null;
  order_type?: "FORECAST_LINKED" | "KANBAN" | "SPOT" | "ORDER" | null;
  skip_already_allocated?: boolean;
}

export interface BulkAutoAllocateFailedLine {
  line_id: number;
  error: string;
}

export interface BulkAutoAllocateResponse {
  processed_lines: number;
  allocated_lines: number;
  total_allocations: number;
  skipped_lines: number;
  failed_lines: BulkAutoAllocateFailedLine[];
  message: string;
}

export const bulkAutoAllocate = (data: BulkAutoAllocateRequest) => {
  return http.post<BulkAutoAllocateResponse>("allocations/bulk-auto-allocate", data);
};

// ===== Order Auto-Allocate (Batch) =====

export interface BatchAutoOrderRequest {
  order_ids: number[];
  dry_run?: boolean;
}

export interface BatchAutoOrderResult {
  order_id: number;
  success: boolean;
  message?: string;
  created_allocation_ids: number[];
}

export interface BatchAutoOrderResponse {
  results: BatchAutoOrderResult[];
  total_orders: number;
  success_count: number;
  failure_count: number;
  message: string;
}

export const autoAllocateOrders = (data: BatchAutoOrderRequest) => {
  return http.post<BatchAutoOrderResponse>("allocations/auto-orders", data);
};

// ===== Allocation Suggestions API (v1) =====

export type AllocationSuggestionRequest = {
  mode: "forecast" | "order";
  forecast_scope?: {
    forecast_periods: string[];
    customer_ids?: number[];
    delivery_place_ids?: number[];
    product_ids?: number[];
  };
  order_scope?: {
    order_line_id: number;
  };
  options?: {
    allocation_type?: "soft" | "hard";
    fefo?: boolean;
    allow_cross_warehouse?: boolean;
    ignore_existing_suggestions?: boolean;
  };
};

export type AllocationSuggestionResponse = {
  id: number;
  forecast_period: string;
  customer_id: number;
  delivery_place_id: number;
  product_id: number;
  lot_id: number;
  quantity: number;
  allocation_type: "soft" | "hard";
  source: string;
  order_line_id?: number | null;
  created_at: string;
  updated_at: string;
  lot_number?: string;
  lot_expiry_date?: string;
  warehouse_name?: string;
};

export type AllocationSuggestionPreviewResponse = {
  suggestions: AllocationSuggestionResponse[];
  stats: Record<string, unknown>;
  gaps: unknown[];
};

export type AllocationSuggestionListResponse = {
  suggestions: AllocationSuggestionResponse[];
  total: number;
};

export const generateAllocationSuggestions = (data: AllocationSuggestionRequest) => {
  return http.post<AllocationSuggestionPreviewResponse>("v2/forecast/suggestions/preview", data);
};

export const getAllocationSuggestions = (params: {
  skip?: number;
  limit?: number;
  forecast_period?: string;
  product_id?: number;
  customer_id?: number;
}) => {
  const searchParams = new URLSearchParams();
  if (params.skip) searchParams.append("skip", params.skip.toString());
  if (params.limit) searchParams.append("limit", params.limit.toString());
  if (params.forecast_period) searchParams.append("forecast_period", params.forecast_period);
  if (params.product_id) searchParams.append("product_id", params.product_id.toString());
  if (params.customer_id) searchParams.append("customer_id", params.customer_id.toString());

  const queryString = searchParams.toString();
  return http.get<AllocationSuggestionListResponse>(
    `v2/forecast/suggestions${queryString ? "?" + queryString : ""}`,
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
  allocations: Array<{
    lot_id: number;
    quantity: number;
  }>;
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
