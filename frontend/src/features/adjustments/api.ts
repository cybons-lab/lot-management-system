/**
 * Adjustments API Client (v2.2 - Phase D)
 * 在庫調整管理
 */

import { http } from "@/shared/api/http-client";

// ===== Types =====

/**
 * Adjustment Type
 */
export type AdjustmentType = "physical_count" | "damage" | "loss" | "found" | "other";

/**
 * Adjustment
 */
export interface Adjustment {
  adjustment_id: number;
  lot_id: number;
  adjustment_type: AdjustmentType;
  adjusted_quantity: number;
  reason: string;
  adjusted_by: number;
  adjusted_at: string;
  // Joined data (optional)
  lot_number?: string;
  product_code?: string;
  product_name?: string;
  warehouse_name?: string;
}

/**
 * Request types
 */
export interface CreateAdjustmentRequest {
  lot_id: number;
  adjustment_type: AdjustmentType;
  adjusted_quantity: number;
  reason: string;
  adjusted_by: number;
}

export interface AdjustmentsListParams {
  skip?: number;
  limit?: number;
  lot_id?: number;
  adjustment_type?: AdjustmentType;
}

// ===== API Functions =====

/**
 * Get adjustments list
 * @endpoint GET /adjustments
 */
export const getAdjustments = (params?: AdjustmentsListParams) => {
  const searchParams = new URLSearchParams();
  if (params?.skip !== undefined) searchParams.append("skip", params.skip.toString());
  if (params?.limit !== undefined) searchParams.append("limit", params.limit.toString());
  if (params?.lot_id) searchParams.append("lot_id", params.lot_id.toString());
  if (params?.adjustment_type) searchParams.append("adjustment_type", params.adjustment_type);

  const queryString = searchParams.toString();
  return http.get<Adjustment[]>(`/adjustments${queryString ? "?" + queryString : ""}`);
};

/**
 * Get adjustment detail
 * @endpoint GET /adjustments/{id}
 */
export const getAdjustment = (id: number) => {
  return http.get<Adjustment>(`/adjustments/${id}`);
};

/**
 * Create adjustment
 * @endpoint POST /adjustments
 */
export const createAdjustment = (data: CreateAdjustmentRequest) => {
  return http.post<Adjustment>("/adjustments", data);
};
