/**
 * Customer Items API Client (v2.2 - Phase G-1)
 * 得意先品番マッピング管理
 */

import type { CustomerItemBulkRow, BulkUpsertResponse } from "./types/bulk-operation";

import { http } from "@/shared/api/http-client";

// ===== Types =====

/**
 * Customer Item
 */
export interface CustomerItem {
  customer_id: number;
  customer_code: string;
  customer_name: string;
  external_product_code: string;
  product_id: number;
  product_name: string;
  supplier_id: number | null;
  supplier_code: string | null;
  supplier_name: string | null;
  base_unit: string;
  pack_unit: string | null;
  pack_quantity: number | null;
  special_instructions: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Request types
 */
export interface CreateCustomerItemRequest {
  customer_id: number;
  external_product_code: string;
  product_id: number;
  supplier_id?: number | null;
  base_unit: string;
  pack_unit?: string | null;
  pack_quantity?: number | null;
  special_instructions?: string | null;
}

export interface UpdateCustomerItemRequest {
  product_id?: number;
  supplier_id?: number | null;
  base_unit?: string;
  pack_unit?: string | null;
  pack_quantity?: number | null;
  special_instructions?: string | null;
}

export interface CustomerItemsListParams {
  skip?: number;
  limit?: number;
  customer_id?: number;
  product_id?: number;
}

// ===== API Functions =====

/**
 * Get customer items list
 * @endpoint GET /customer-items
 */
export const getCustomerItems = (params?: CustomerItemsListParams) => {
  const searchParams = new URLSearchParams();
  if (params?.skip !== undefined) searchParams.append("skip", params.skip.toString());
  if (params?.limit !== undefined) searchParams.append("limit", params.limit.toString());
  if (params?.customer_id) searchParams.append("customer_id", params.customer_id.toString());
  if (params?.product_id) searchParams.append("product_id", params.product_id.toString());

  const queryString = searchParams.toString();
  return http.get<CustomerItem[]>(`masters/customer-items${queryString ? "?" + queryString : ""}`);
};

/**
 * Get customer items by customer ID
 * @endpoint GET /customer-items/{customer_id}
 */
export const getCustomerItemsByCustomer = (customerId: number) => {
  return http.get<CustomerItem[]>(`masters/customer-items/${customerId}`);
};

/**
 * Create customer item
 * @endpoint POST /customer-items
 */
export const createCustomerItem = (data: CreateCustomerItemRequest) => {
  return http.post<CustomerItem>("masters/customer-items", data);
};

/**
 * Update customer item
 * @endpoint PUT /customer-items/{customer_id}/{external_product_code}
 */
export const updateCustomerItem = (
  customerId: number,
  externalProductCode: string,
  data: UpdateCustomerItemRequest,
) => {
  return http.put<CustomerItem>(
    `masters/customer-items/${customerId}/${encodeURIComponent(externalProductCode)}`,
    data,
  );
};

/**
 * Delete customer item
 * @endpoint DELETE /customer-items/{customer_id}/{external_product_code}
 */
export const deleteCustomerItem = (customerId: number, externalProductCode: string) => {
  return http.delete(
    `masters/customer-items/${customerId}/${encodeURIComponent(externalProductCode)}`,
  );
};

/**
 * Bulk upsert customer items
 * @endpoint POST /masters/customer-items/bulk-upsert
 */
export const bulkUpsertCustomerItems = (rows: CustomerItemBulkRow[]) => {
  return http.post<BulkUpsertResponse>("masters/customer-items/bulk-upsert", { rows });
};
