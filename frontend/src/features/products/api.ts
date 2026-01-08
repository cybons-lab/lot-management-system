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
// export type ProductCreate = components["schemas"]["ProductCreate"]; // Override to match backend changes
export type ProductCreate = {
  product_code?: string | null;
  product_name: string;
  maker_part_code?: string;
  base_unit?: string;
  consumption_limit_days?: number | null;
  internal_unit: string;
  external_unit: string;
  qty_per_internal_unit: number;
  customer_part_no: string; // Required
  maker_item_code: string; // Required
  is_active?: boolean;
};
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
