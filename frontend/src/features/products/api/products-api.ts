/**
 * Products API
 * 商品マスタのAPI通信関数
 */

import type { components } from "@/types/api";

import { http } from "@/services/http";

import type { BulkUpsertResponse, ProductBulkRow } from "../types/bulk-operation";

// OpenAPI生成型
export type Product = components["schemas"]["ProductResponse"];
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

export async function getProduct(makerPartCode: string): Promise<Product> {
  const response = await http.get<Product>(`${BASE_PATH}/${makerPartCode}`);
  return response.data;
}

export async function createProduct(data: ProductCreate): Promise<Product> {
  const response = await http.post<Product>(BASE_PATH, data);
  return response.data;
}

export async function updateProduct(makerPartCode: string, data: ProductUpdate): Promise<Product> {
  const response = await http.put<Product>(`${BASE_PATH}/${makerPartCode}`, data);
  return response.data;
}

export async function deleteProduct(makerPartCode: string): Promise<void> {
  await http.delete(`${BASE_PATH}/${makerPartCode}`);
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
          maker_part_code: row.maker_part_code,
          product_name: row.product_name,
          base_unit: row.base_unit,
          consumption_limit_days: row.consumption_limit_days,
        });
        return { success: true };

      case "UPD":
        await updateProduct(row.maker_part_code, {
          product_name: row.product_name,
          base_unit: row.base_unit,
          consumption_limit_days: row.consumption_limit_days,
        });
        return { success: true };

      case "DEL":
        await deleteProduct(row.maker_part_code);
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
        code: row.maker_part_code,
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
