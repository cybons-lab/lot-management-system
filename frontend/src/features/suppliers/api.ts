/**
 * Suppliers API Types and Bulk Operations
 */

import type { BulkUpsertResponse, SupplierBulkRow } from "./types/bulk-operation";

import { http } from "@/shared/api/http-client";
import type { components } from "@/types/api";

export type Supplier = components["schemas"]["SupplierResponse"];
export type SupplierCreate = components["schemas"]["SupplierCreate"];
export type SupplierUpdate = components["schemas"]["SupplierUpdate"];

const BASE_PATH = "/suppliers";

// ============================================
// Individual CRUD Operations (for legacy hooks)
// ============================================

export async function createSupplier(data: SupplierCreate): Promise<Supplier> {
  return http.post<Supplier>(BASE_PATH, data);
}

export async function updateSupplier(code: string, data: SupplierUpdate): Promise<Supplier> {
  return http.put<Supplier>(`${BASE_PATH}/${code}`, data);
}

export async function deleteSupplier(code: string): Promise<void> {
  return http.delete(`${BASE_PATH}/${code}`);
}

// ============================================
// Bulk Operations
// ============================================

async function upsertSupplierRow(
  row: SupplierBulkRow,
): Promise<{ success: boolean; errorMessage?: string }> {
  try {
    switch (row.OPERATION) {
      case "ADD":
        await http.post<Supplier>(BASE_PATH, {
          supplier_code: row.supplier_code,
          supplier_name: row.supplier_name,
        });
        return { success: true };
      case "UPD":
        await http.put<Supplier>(`${BASE_PATH}/${row.supplier_code}`, {
          supplier_name: row.supplier_name,
        });
        return { success: true };
      case "DEL":
        await http.delete(`${BASE_PATH}/${row.supplier_code}`);
        return { success: true };
      default:
        return { success: false, errorMessage: `不明な操作: ${row.OPERATION}` };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "不明なエラー";
    return { success: false, errorMessage: message };
  }
}

export async function bulkUpsertSuppliers(rows: SupplierBulkRow[]): Promise<BulkUpsertResponse> {
  const results = await Promise.all(
    rows.map(async (row, index) => {
      const result = await upsertSupplierRow(row);
      return {
        rowNumber: row._rowNumber ?? index + 1,
        success: result.success,
        code: row.supplier_code,
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
