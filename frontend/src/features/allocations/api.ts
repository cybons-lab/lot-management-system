/**
 * Allocations API Client (v2.2 - Phase E)
 * New API endpoints for allocation candidates, suggestions, and commit
 */

import { http } from "@/shared/api/http-client";
import type { LotCandidate } from "@/shared/types/aliases";
import type {
  AllocationCommitRequest,
  AllocationCommitResponse,
  CandidateLotItem,
  CandidateLotsResponse,
  FefoLineAllocation,
  FefoLotAllocation,
  FefoPreviewRequest,
  FefoPreviewResponse,
  ManualAllocationRequest,
  ManualAllocationResponse,
  ManualAllocationSavePayload,
} from "@/shared/types/schema";

// ===== Legacy Types (for backward compatibility) =====

export type AllocationInputItem = {
  lotId: number;
  lot: LotCandidate | null;
  delivery_place_id?: number | null;
  delivery_place_code?: string | null;
  quantity: number;
};

export type CreateAllocationPayload = {
  order_line_id: number;
  product_code: string;
  allocations: AllocationInputItem[];
};

export type AllocationResult = {
  order_id: number;
};

// ===== New API Types (v2.2.1) =====

export type {
  CandidateLotItem,
  CandidateLotsResponse,
  ManualAllocationRequest,
  ManualAllocationResponse,
  FefoPreviewRequest,
  FefoPreviewResponse,
  FefoLineAllocation,
  FefoLotAllocation,
  AllocationCommitRequest,
  AllocationCommitResponse,
  ManualAllocationSavePayload,
  // ManualAllocationSaveResponse, // Removed from re-export as it's redefined below
};

/** Manual allocation save payload/response */
// Schema doesn't include order_line_id as it's a path param, but frontend needs it for the function arg
export type ManualAllocationSavePayloadExtended = ManualAllocationSavePayload & {
  order_line_id: number;
};

export interface ManualAllocationSaveResponse {
  success?: boolean;
  message?: string;
  allocated_ids?: number[];
}

// ===== New API Functions (v2.2.1) =====

/**
 * Get allocation candidates for an order line
 * @endpoint GET /allocation-candidates
 */
export const getAllocationCandidates = (params: {
  order_line_id: number;
  strategy?: "fefo" | "fifo" | "custom";
  limit?: number;
}) => {
  const searchParams = new URLSearchParams();
  searchParams.append("order_line_id", params.order_line_id.toString());
  if (params.strategy) searchParams.append("strategy", params.strategy);
  if (params.limit) searchParams.append("limit", params.limit.toString());

  const queryString = searchParams.toString();
  return http.get<CandidateLotsResponse>(
    `allocation-candidates${queryString ? "?" + queryString : ""}`,
  );
};

/**
 * Create manual allocation suggestion (preview only)
 * @endpoint POST /allocation-suggestions/manual
 */
// TODO: Use generated types once available
export const createManualAllocationSuggestion = (data: ManualAllocationRequest) => {
  return http.post<ManualAllocationResponse>("allocation-suggestions/manual", data);
};

/**
 * Create FEFO allocation suggestion (preview only)
 * @endpoint POST /allocation-suggestions/fefo
 */
export const createFefoAllocationSuggestion = (data: FefoPreviewRequest) => {
  return http.post<FefoPreviewResponse>("allocation-suggestions/fefo", data);
};

/**
 * Commit allocation (finalize allocation)
 * @endpoint POST /allocations/commit
 */
export const commitAllocation = (data: AllocationCommitRequest) => {
  return http.post<AllocationCommitResponse>("allocations/commit", data);
};

/**
 * Save manual allocations for a specific order line
 * @endpoint POST /orders/{order_line_id}/allocations
 */
export const saveManualAllocations = (data: ManualAllocationSavePayloadExtended) => {
  return http.post<ManualAllocationSaveResponse>(`orders/${data.order_line_id}/allocations`, {
    allocations: data.allocations,
  });
};

/**
 * Cancel allocation
 * @endpoint DELETE /allocations/{id}
 */
export const cancelAllocation = (allocationId: number) => {
  return http.delete<void>(`allocations/${allocationId}`);
};

/**
 * Confirm allocations (Soft -> Hard)
 * @endpoint POST /allocations/confirm-batch
 */
export const confirmAllocationsBatch = (data: {
  allocation_ids: number[];
  confirmed_by?: string;
}) => {
  return http.post<{ confirmed_ids: number[]; failed_items: any[] }>(
    "allocations/confirm-batch",
    data,
  );
};

/**
 * Drag-assign allocation (manual allocation)
 * @deprecated Use createManualAllocationSuggestion + commitAllocation instead
 * @endpoint POST /allocation-suggestions/manual (updated from /allocations/drag-assign)
 */
export interface DragAssignRequest {
  order_line_id: number;
  lot_id: number;
  allocated_quantity: number; // Note: allocate_qty is deprecated, use allocated_quantity
}

export interface DragAssignResponse {
  order_line_id: number;
  lot_id: number;
  lot_number: string;
  suggested_quantity: number;
  available_quantity: number;
  status: string;
  message?: string;
}

export const dragAssignAllocation = (data: DragAssignRequest) => {
  return http.post<DragAssignResponse>("allocation-suggestions/manual", data);
};

// ===== Legacy API Functions (for backward compatibility) =====

/**
 * @deprecated Use getAllocationCandidates instead
 * @endpoint GET /allocations/candidate-lots
 */
export const getCandidateLots = (params: {
  product_id: number;
  delivery_place_id?: number;
  limit?: number;
}) => {
  const searchParams = new URLSearchParams();
  searchParams.append("product_id", params.product_id.toString());
  if (params.delivery_place_id)
    searchParams.append("warehouse_id", params.delivery_place_id.toString());
  if (params.limit) searchParams.append("limit", params.limit.toString());

  const queryString = searchParams.toString();
  return http.get<CandidateLotsResponse>(
    `allocations/candidate-lots${queryString ? "?" + queryString : ""}`,
  );
};

/**
 * @deprecated Use createManualAllocationSuggestion + commitAllocation instead
 */
export async function createAllocations(
  payload: CreateAllocationPayload,
): Promise<AllocationResult> {
  try {
    await http.post("allocations", payload);
  } catch (e) {
    console.warn("[allocations/api] createAllocations fallback:", e);
  }
  return { order_id: payload.order_line_id };
}

// ===== Allocation Suggestions API (Phase 4) =====

export interface AllocationSuggestionResponse {
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
}

export interface AllocationSuggestionListResponse {
  suggestions: AllocationSuggestionResponse[];
  total: number;
}

export interface AllocationScopeForecast {
  forecast_periods: string[];
  customer_ids?: number[];
  delivery_place_ids?: number[];
  product_ids?: number[];
}

export interface AllocationScopeOrder {
  order_line_id: number;
}

export interface AllocationOptions {
  allocation_type?: "soft" | "hard";
  fefo?: boolean;
  allow_cross_warehouse?: boolean;
  ignore_existing_suggestions?: boolean;
}

export interface AllocationSuggestionRequest {
  mode: "forecast" | "order";
  forecast_scope?: AllocationScopeForecast;
  order_scope?: AllocationScopeOrder;
  options?: AllocationOptions;
}

export interface AllocationSuggestionPreviewResponse {
  suggestions: AllocationSuggestionResponse[];
  stats: Record<string, unknown>; // Define detailed stats type if needed
  gaps: unknown[];
}

/**
 * Generate or Preview Allocation Suggestions
 * @endpoint POST /allocation-suggestions/preview
 */
export const generateAllocationSuggestions = (data: AllocationSuggestionRequest) => {
  return http.post<AllocationSuggestionPreviewResponse>("allocation-suggestions/preview", data);
};

/**
 * List Allocation Suggestions
 * @endpoint GET /allocation-suggestions
 */
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
    `allocation-suggestions${queryString ? "?" + queryString : ""}`,
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
  lot_breakdown: PlanningAllocationLotBreakdown[];
  by_period: PlanningAllocationPeriod[];
}

/**
 * Get planning allocation summary for a forecast group
 * @endpoint GET /allocation-suggestions/group-summary
 */
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
    `allocation-suggestions/group-summary?${searchParams.toString()}`,
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

/**
 * Bulk auto-allocate for groups (FEFO strategy)
 * @endpoint POST /allocations/bulk-auto-allocate
 */
export const bulkAutoAllocate = (data: BulkAutoAllocateRequest) => {
  return http.post<BulkAutoAllocateResponse>("allocations/bulk-auto-allocate", data);
};
