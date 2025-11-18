/**
 * Allocations API Client (v2.2 - Phase E)
 * New API endpoints for allocation candidates, suggestions, and commit
 */

import { fetchApi } from "@/shared/libs/http";
import type { LotCandidate } from "@/shared/types/aliases";

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

/**
 * Candidate Lot Item
 */
export interface CandidateLotItem {
  lot_id: number;
  lot_number: string;
  free_qty: number;
  current_quantity: number;
  allocated_qty: number;
  product_id?: number;
  product_code?: string;
  warehouse_id?: number;
  warehouse_code?: string;
  warehouse_name?: string;
  delivery_place_id?: number;
  delivery_place_code?: string;
  delivery_place_name?: string;
  expiry_date?: string;
  last_updated?: string;
}

export interface CandidateLotsResponse {
  items: CandidateLotItem[];
  total: number;
}

/**
 * Manual Allocation Suggestion
 */
export interface ManualAllocationRequest {
  order_line_id: number;
  lot_id: number;
  quantity: number;
}

export interface ManualAllocationResponse {
  order_line_id: number;
  lot_id: number;
  lot_number: string;
  suggested_quantity: number;
  available_quantity: number;
  product_id?: number;
  product_code?: string;
  delivery_place_id?: number;
  expiry_date?: string;
  status: string;
  message?: string;
}

/**
 * FEFO Allocation
 */
export interface FefoPreviewRequest {
  order_id: number;
}

export interface FefoLotAllocation {
  lot_id: number;
  lot_number: string;
  allocated_quantity: string; // Backend uses string (DECIMAL)
  expiry_date?: string;
  received_date?: string; // Backend uses received_date, not receipt_date
}

export interface FefoLineAllocation {
  order_line_id: number;
  product_id?: number;
  product_code: string;
  delivery_place_id?: number;
  required_qty: number;
  already_allocated_qty: number;
  allocations: FefoLotAllocation[];
  next_div?: string;
  warnings: string[];
}

export interface FefoPreviewResponse {
  order_id: number;
  lines: FefoLineAllocation[];
  warnings: string[];
}

/**
 * Allocation Commit
 */
export interface AllocationCommitRequest {
  order_id: number;
}

export interface AllocationCommitResponse {
  order_id: number;
  created_allocation_ids: number[];
  preview?: FefoPreviewResponse;
  status: string;
  message?: string;
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
  return fetchApi.get<CandidateLotsResponse>(
    `/allocation-candidates${queryString ? "?" + queryString : ""}`,
  );
};

/**
 * Create manual allocation suggestion (preview only)
 * @endpoint POST /allocation-suggestions/manual
 */
export const createManualAllocationSuggestion = (data: ManualAllocationRequest) => {
  return fetchApi.post<ManualAllocationResponse>("/allocation-suggestions/manual", data);
};

/**
 * Create FEFO allocation suggestion (preview only)
 * @endpoint POST /allocation-suggestions/fefo
 */
export const createFefoAllocationSuggestion = (data: FefoPreviewRequest) => {
  return fetchApi.post<FefoPreviewResponse>("/allocation-suggestions/fefo", data);
};

/**
 * Commit allocation (finalize allocation)
 * @endpoint POST /allocations/commit
 */
export const commitAllocation = (data: AllocationCommitRequest) => {
  return fetchApi.post<AllocationCommitResponse>("/allocations/commit", data);
};

/**
 * Cancel allocation
 * @endpoint DELETE /allocations/{id}
 */
export const cancelAllocation = (allocationId: number) => {
  return fetchApi.delete<void>(`/allocations/${allocationId}`);
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
  return fetchApi.post<DragAssignResponse>("/allocation-suggestions/manual", data);
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
  return fetchApi.get<CandidateLotsResponse>(
    `/allocations/candidate-lots${queryString ? "?" + queryString : ""}`,
  );
};

/**
 * @deprecated Use createManualAllocationSuggestion + commitAllocation instead
 */
export async function createAllocations(
  payload: CreateAllocationPayload,
): Promise<AllocationResult> {
  try {
    await fetchApi.post("/allocations", payload);
  } catch (e) {
    console.warn("[allocations/api] createAllocations fallback:", e);
  }
  return { order_id: payload.order_line_id };
}
