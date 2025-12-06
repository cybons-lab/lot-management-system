/**
 * Products API Types and Bulk Operations
 *
 * Note: Basic CRUD operations are handled by useMasterApi hook.
 * This file contains:
 * - Type definitions (Product, ProductCreate, ProductUpdate)
 * - Bulk import/export operations
 * - Product-Supplier relationship operations
 */

import type { BulkUpsertResponse, ProductBulkRow } from "./types/bulk-operation";

import { http } from "@/shared/api/http-client";
import type { components } from "@/types/api";

// ============================================
// Type Definitions (OpenAPI generated)
// ============================================

export type Product = components["schemas"]["ProductOut"];
export type ProductCreate = components["schemas"]["ProductCreate"];
export type ProductUpdate = components["schemas"]["ProductUpdate"];

// Product-Supplier relationship type
export interface ProductSupplier {
  id: number;
  supplier_id: number;
  supplier_code: string;
  supplier_name: string;
  is_primary: boolean;
  lead_time_days: number | null;
}

const BASE_PATH = "masters/products";

// ============================================
// Product-Supplier Operations
// ============================================

export async function getProductSuppliers(productCode: string): Promise<ProductSupplier[]> {
  return http.get<ProductSupplier[]>(`${BASE_PATH}/${productCode}/suppliers`);
}

// ============================================
// Bulk Operations
// ============================================

export async function bulkUpsertProducts(rows: ProductBulkRow[]): Promise<BulkUpsertResponse> {
  return http.post<BulkUpsertResponse>(`${BASE_PATH}/bulk-upsert`, { rows });
}
