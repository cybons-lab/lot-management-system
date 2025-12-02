/**
 * Customers API Types and Bulk Operations
 *
 * Note: Basic CRUD operations are handled by useMasterApi hook.
 * This file contains:
 * - Type definitions (Customer, CustomerCreate, CustomerUpdate)
 * - Bulk import/export operations
 */

import type {
  BulkUpsertResponse,
  CustomerBulkRow,
  CustomerBulkUpsertRequest,
} from "./types/bulk-operation";

import { http } from "@/shared/api/http-client";
import type { components } from "@/types/api";

// ============================================
// Type Definitions (OpenAPI generated)
// ============================================

export type Customer = components["schemas"]["CustomerResponse"];
export type CustomerCreate = components["schemas"]["CustomerCreate"];
export type CustomerUpdate = components["schemas"]["CustomerUpdate"];

const BASE_PATH = "masters/customers";

// ============================================
// Bulk Operations
// ============================================

export async function bulkUpsertCustomers(rows: CustomerBulkRow[]): Promise<BulkUpsertResponse> {
  return http.post<BulkUpsertResponse>(`${BASE_PATH}/bulk-upsert`, { rows });
}

export async function bulkUpsertCustomersApi(
  _request: CustomerBulkUpsertRequest,
): Promise<BulkUpsertResponse> {
  throw new Error("bulk-upsert API is not yet implemented");
}
