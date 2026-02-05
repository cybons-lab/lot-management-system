/**
 * Suppliers API Types and Bulk Operations
 */

import type { BulkUpsertResponse, SupplierBulkRow } from "./types/bulk-operation";

import { http } from "@/shared/api/http-client";
import type { components } from "@/types/api";

export type Supplier = components["schemas"]["SupplierResponse"];
export type SupplierCreate = components["schemas"]["SupplierCreate"];
export type SupplierUpdate = components["schemas"]["SupplierUpdate"];

const BASE_PATH = "masters/suppliers";

// ============================================
// Individual CRUD Operations (for legacy hooks)
// ============================================

export async function createSupplier(data: SupplierCreate): Promise<Supplier> {
  return http.post<Supplier>(BASE_PATH, data);
}

export async function updateSupplier(code: string, data: SupplierUpdate): Promise<Supplier> {
  return http.put<Supplier>(`${BASE_PATH}/${code}`, data);
}

export async function deleteSupplier(code: string, version: number): Promise<void> {
  return http.delete(`${BASE_PATH}/${code}?version=${version}`);
}

// ============================================
// Bulk Operations
// ============================================

export async function bulkUpsertSuppliers(rows: SupplierBulkRow[]): Promise<BulkUpsertResponse> {
  return http.post<BulkUpsertResponse>(`${BASE_PATH}/bulk-upsert`, { rows });
}
