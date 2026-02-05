/**
 * Warehouses API Types and Bulk Operations
 */

import type { BulkUpsertResponse, WarehouseBulkRow } from "./types/bulk-operation";

import { http } from "@/shared/api/http-client";
import type { components } from "@/types/api";

export type Warehouse = components["schemas"]["WarehouseResponse"];
export type WarehouseCreate = components["schemas"]["WarehouseCreate"];
export type WarehouseUpdate = components["schemas"]["WarehouseUpdate"];

const BASE_PATH = "masters/warehouses";

// ============================================
// Individual CRUD Operations (for legacy hooks)
// ============================================

export async function createWarehouse(data: WarehouseCreate): Promise<Warehouse> {
  return http.post<Warehouse>(BASE_PATH, data);
}

export async function updateWarehouse(code: string, data: WarehouseUpdate): Promise<Warehouse> {
  return http.put<Warehouse>(`${BASE_PATH}/${code}`, data);
}

export async function deleteWarehouse(code: string, version: number): Promise<void> {
  return http.delete(`${BASE_PATH}/${code}?version=${version}`);
}

// ============================================
// Bulk Operations
// ============================================
export async function bulkUpsertWarehouses(rows: WarehouseBulkRow[]): Promise<BulkUpsertResponse> {
  return http.post<BulkUpsertResponse>(`${BASE_PATH}/bulk-upsert`, { rows });
}
