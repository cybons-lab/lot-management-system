/**
 * Products API Types and Bulk Operations
 *
 * Note: Basic CRUD operations are handled by useMasterApi hook.
 * This file contains:
 * - Type definitions (Product, ProductCreate, ProductUpdate)
 * - Bulk import/export operations
 */

import type { BulkUpsertResponse, ProductBulkRow } from "../types/bulk-operation";
import { http } from "@/shared/api/http-client";
import type { components } from "@/types/api";

// ============================================
// Type Definitions (OpenAPI generated)
// ============================================

export type Product = components["schemas"]["ProductOut"];
export type ProductCreate = components["schemas"]["ProductCreate"];
export type ProductUpdate = components["schemas"]["ProductUpdate"];

const BASE_PATH = "/products";

// ============================================
// Individual CRUD Operations (for legacy hooks)
// ============================================

export async function createProduct(data: ProductCreate): Promise<Product> {
  return http.post<Product>(BASE_PATH, data);
}

export async function updateProduct(code: string, data: ProductUpdate): Promise<Product> {
  return http.put<Product>(`${BASE_PATH}/${code}`, data);
}

export async function deleteProduct(code: string): Promise<void> {
  return http.delete(`${BASE_PATH}/${code}`);
}

// ============================================
// Bulk Operations
// ============================================

async function upsertProductRow(
  row: ProductBulkRow,
): Promise<{ success: boolean; errorMessage?: string }> {
  try {
    switch (row.OPERATION) {
      case "ADD":
        await http.post<Product>(BASE_PATH, {
          product_code: row.product_code,
          product_name: row.product_name,
          internal_unit: row.internal_unit,
          external_unit: row.external_unit,
          qty_per_internal_unit: row.qty_per_internal_unit,
          customer_part_no: row.customer_part_no,
          maker_item_code: row.maker_item_code,
          is_active: row.is_active,
        });
        return { success: true };

      case "UPD":
        await http.put<Product>(`${BASE_PATH}/${row.product_code}`, {
          product_name: row.product_name,
          internal_unit: row.internal_unit,
          external_unit: row.external_unit,
          qty_per_internal_unit: row.qty_per_internal_unit,
          customer_part_no: row.customer_part_no,
          maker_item_code: row.maker_item_code,
          is_active: row.is_active,
        });
        return { success: true };

      case "DEL":
        await http.delete(`${BASE_PATH}/${row.product_code}`);
        return { success: true };

      default:
        return { success: false, errorMessage: `不明な操作: ${row.OPERATION}` };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "不明なエラー";
    return { success: false, errorMessage: message };
  }
}

export async function bulkUpsertProducts(rows: ProductBulkRow[]): Promise<BulkUpsertResponse> {
  const results = await Promise.all(
    rows.map(async (row, index) => {
      const result = await upsertProductRow(row);
      return {
        rowNumber: row._rowNumber ?? index + 1,
        success: result.success,
        code: row.product_code,
        errorMessage: result.errorMessage,
      };
    }),
  );

  const added = results.filter((r, i) => r.success && rows[i]?.OPERATION === "ADD").length;
  const updated = results.filter((r, i) => r.success && rows[i]?.OPERATION === "UPD").length;
  const deleted = results.filter((r, i) => r.success && rows[i]?.OPERATION === "DEL").length;
  const failed = results.filter((r) => !r.success).length;

  return {
    status: failed === 0 ? "success" : failed === rows.length ? "failed" : "partial",
    summary: { total: rows.length, added, updated, deleted, failed },
    results,
  };
}
