/**
 * Products API
 * 商品マスタのAPI通信関数
 */

import type { BulkUpsertResponse, ProductBulkRow } from "../types/bulk-operation";

import { http } from "@/services/http";
import type { components } from "@/types/api";

// OpenAPI生成型
export type Product = components["schemas"]["ProductOut"];
export type ProductCreate = components["schemas"]["ProductCreate"];
export type ProductUpdate = components["schemas"]["ProductUpdate"];

const BASE_PATH = "/products";

// ============================================
// CRUD API
// ============================================

export async function listProducts(): Promise<Product[]> {
  const response = await http.get<Product[]>(BASE_PATH);
  return response.data;
}

export async function getProduct(productCode: string): Promise<Product> {
  const response = await http.get<Product>(`${BASE_PATH}/${productCode}`);
  return response.data;
}

export async function createProduct(data: ProductCreate): Promise<Product> {
  const response = await http.post<Product>(BASE_PATH, data);
  return response.data;
}

export async function updateProduct(productCode: string, data: ProductUpdate): Promise<Product> {
  const response = await http.put<Product>(`${BASE_PATH}/${productCode}`, data);
  return response.data;
}

export async function deleteProduct(productCode: string): Promise<void> {
  await http.delete(`${BASE_PATH}/${productCode}`);
}

// ============================================
// Bulk API
// ============================================

async function upsertProductRow(
  row: ProductBulkRow,
): Promise<{ success: boolean; errorMessage?: string }> {
  try {
    switch (row.OPERATION) {
      case "ADD":
        await createProduct({
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
        await updateProduct(row.product_code, {
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
        await deleteProduct(row.product_code);
        return { success: true };

      default:
        return { success: false, errorMessage: `不明な操作: ${row.OPERATION}` };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "不明なエラー";
    return { success: false, errorMessage: message };
  }
}

// TODO: backend: bulk-upsert not yet implemented
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
