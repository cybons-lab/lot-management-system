/**
 * Customer Items API Client (v2.2 - Phase G-1)
 * 得意先品番マッピング管理
 *
 * サロゲートキー（id）ベースのAPI
 * - customer_part_no: 得意先品番（先方品番）
 * - ID-based API endpoints
 */

import type { CustomerItemBulkRow, BulkUpsertResponse } from "./types/bulk-operation";

import { http } from "@/shared/api/http-client";

// ===== Types =====

/**
 * Customer Item
 */
export interface CustomerItem {
  id: number;
  customer_id: number;
  customer_code: string;
  customer_name: string;
  customer_part_no: string;
  product_group_id: number | null; // Phase1: オプション（Phase2用グルーピング）
  product_code: string | null;
  product_name: string | null;
  supplier_id: number | null;
  supplier_item_id: number; // Phase1: 必須（NOT NULL制約）
  supplier_code: string | null;
  supplier_name: string | null;
  is_primary: boolean;
  base_unit: string;
  pack_unit: string | null;
  pack_quantity: number | null;
  special_instructions: string | null;
  // メタデータ
  created_at: string;
  updated_at: string;
  valid_to?: string;
}

/**
 * Request types
 */
export interface CreateCustomerItemRequest {
  customer_id: number;
  customer_part_no: string;
  product_group_id?: number | null; // Phase1: オプション
  supplier_id?: number | null; // 非推奨（supplier_item_id経由で取得）
  supplier_item_id: number; // Phase1: 必須
  is_primary?: boolean;
  base_unit: string;
  pack_unit?: string | null;
  pack_quantity?: number | null;
  special_instructions?: string | null;
}

export interface UpdateCustomerItemRequest {
  customer_part_no?: string;
  product_group_id?: number | null; // Phase1: オプション
  supplier_id?: number | null; // 非推奨
  supplier_item_id?: number; // Phase1: 必須（更新時は任意）
  is_primary?: boolean | null;
  base_unit?: string;
  pack_unit?: string | null;
  pack_quantity?: number | null;
  special_instructions?: string | null;
}

export interface CustomerItemsListParams {
  skip?: number;
  limit?: number;
  customer_id?: number;
  product_group_id?: number;
  supplier_id?: number;
  include_inactive?: boolean;
}

// ===== Helper Functions =====

/**
 * Build query string from customer items list params
 */
function buildCustomerItemsQuery(params?: CustomerItemsListParams): string {
  if (!params) return "";

  const searchParams = new URLSearchParams();
  if (params.skip !== undefined) searchParams.append("skip", params.skip.toString());
  if (params.limit !== undefined) searchParams.append("limit", params.limit.toString());
  if (params.customer_id) searchParams.append("customer_id", params.customer_id.toString());
  if (params.product_group_id)
    searchParams.append("product_group_id", params.product_group_id.toString());
  if (params.supplier_id) searchParams.append("supplier_id", params.supplier_id.toString());
  if (params.include_inactive) searchParams.append("include_inactive", "true");

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : "";
}

// ===== API Functions =====

/**
 * Get customer items list
 * @endpoint GET /customer-items
 */
export const getCustomerItems = (params?: CustomerItemsListParams) => {
  const query = buildCustomerItemsQuery(params);
  return http.get<CustomerItem[]>(`masters/customer-items${query}`);
};

/**
 * Get customer items by customer ID
 * @endpoint GET /customer-items/by-customer/{customer_id}
 */
export const getCustomerItemsByCustomer = (customerId: number) => {
  return http.get<CustomerItem[]>(`masters/customer-items/by-customer/${customerId}`);
};

/**
 * Get customer item by ID
 * @endpoint GET /customer-items/{id}
 */
export const getCustomerItemById = (id: number) => {
  return http.get<CustomerItem>(`masters/customer-items/${id}`);
};

/**
 * Create customer item
 * @endpoint POST /customer-items
 */
export const createCustomerItem = (data: CreateCustomerItemRequest) => {
  return http.post<CustomerItem>("masters/customer-items", data);
};

/**
 * Update customer item by ID
 * @endpoint PUT /customer-items/{id}
 */
export const updateCustomerItem = (id: number, data: UpdateCustomerItemRequest) => {
  return http.put<CustomerItem>(`masters/customer-items/${id}`, data);
};

/**
 * Delete customer item by ID (Soft delete)
 * @endpoint DELETE /customer-items/{id}
 */
export const deleteCustomerItem = (id: number, endDate?: string) => {
  const searchParams = new URLSearchParams();
  if (endDate) searchParams.append("end_date", endDate);
  const queryString = searchParams.toString();
  return http.delete(`masters/customer-items/${id}${queryString ? "?" + queryString : ""}`);
};

/**
 * Permanently delete customer item by ID
 * @endpoint DELETE /customer-items/{id}/permanent
 */
export const permanentDeleteCustomerItem = (id: number) => {
  return http.delete(`masters/customer-items/${id}/permanent`);
};

/**
 * Restore customer item by ID
 * @endpoint POST /customer-items/{id}/restore
 */
export const restoreCustomerItem = (id: number) => {
  return http.post<CustomerItem>(`masters/customer-items/${id}/restore`);
};

/**
 * Bulk upsert customer items
 * @endpoint POST /masters/customer-items/bulk-upsert
 */
export const bulkUpsertCustomerItems = (rows: CustomerItemBulkRow[]) => {
  return http.post<BulkUpsertResponse>("masters/customer-items/bulk-upsert", { rows });
};
