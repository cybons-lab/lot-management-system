/**
 * Suppliers API
 * 仕入先マスタのAPI通信関数
 */

import type { BulkUpsertResponse, SupplierBulkRow } from "../types/bulk-operation";

import { http } from "@/services/http";
import type { components } from "@/types/api";



// OpenAPI生成型
export type Supplier = components["schemas"]["SupplierResponse"];
export type SupplierCreate = components["schemas"]["SupplierCreate"];
export type SupplierUpdate = components["schemas"]["SupplierUpdate"];

const BASE_PATH = "/suppliers";

// ============================================
// CRUD API
// ============================================

export async function listSuppliers(): Promise<Supplier[]> {
  const response = await http.get<Supplier[]>(BASE_PATH);
  return response.data;
}

export async function getSupplier(supplierCode: string): Promise<Supplier> {
  const response = await http.get<Supplier>(`${BASE_PATH}/${supplierCode}`);
  return response.data;
}

export async function createSupplier(data: SupplierCreate): Promise<Supplier> {
  const response = await http.post<Supplier>(BASE_PATH, data);
  return response.data;
}

export async function updateSupplier(
  supplierCode: string,
  data: SupplierUpdate,
): Promise<Supplier> {
  const response = await http.put<Supplier>(`${BASE_PATH}/${supplierCode}`, data);
  return response.data;
}

export async function deleteSupplier(supplierCode: string): Promise<void> {
  await http.delete(`${BASE_PATH}/${supplierCode}`);
}

// ============================================
// Bulk API
// ============================================

async function upsertSupplierRow(
  row: SupplierBulkRow,
): Promise<{ success: boolean; errorMessage?: string }> {
  try {
    switch (row.OPERATION) {
      case "ADD":
        await createSupplier({
          supplier_code: row.supplier_code,
          supplier_name: row.supplier_name,
        });
        return { success: true };

      case "UPD":
        await updateSupplier(row.supplier_code, {
          supplier_name: row.supplier_name,
        });
        return { success: true };

      case "DEL":
        await deleteSupplier(row.supplier_code);
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
