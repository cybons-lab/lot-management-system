/**
 * Warehouses API
 * 倉庫マスタのAPI通信関数
 */

import type { components } from "@/types/api";

import { http } from "@/services/http";

import type { BulkUpsertResponse, WarehouseBulkRow } from "../types/bulk-operation";

// OpenAPI生成型
export type Warehouse = components["schemas"]["WarehouseResponse"];
export type WarehouseCreate = components["schemas"]["WarehouseCreate"];
export type WarehouseUpdate = components["schemas"]["WarehouseUpdate"];

const BASE_PATH = "/warehouses";

// ============================================
// CRUD API
// ============================================

export async function listWarehouses(): Promise<Warehouse[]> {
  const response = await http.get<Warehouse[]>(BASE_PATH);
  return response.data;
}

export async function getWarehouse(warehouseCode: string): Promise<Warehouse> {
  const response = await http.get<Warehouse>(`${BASE_PATH}/${warehouseCode}`);
  return response.data;
}

export async function createWarehouse(data: WarehouseCreate): Promise<Warehouse> {
  const response = await http.post<Warehouse>(BASE_PATH, data);
  return response.data;
}

export async function updateWarehouse(
  warehouseCode: string,
  data: WarehouseUpdate,
): Promise<Warehouse> {
  const response = await http.put<Warehouse>(`${BASE_PATH}/${warehouseCode}`, data);
  return response.data;
}

export async function deleteWarehouse(warehouseCode: string): Promise<void> {
  await http.delete(`${BASE_PATH}/${warehouseCode}`);
}

// ============================================
// Bulk API
// ============================================

async function upsertWarehouseRow(
  row: WarehouseBulkRow,
): Promise<{ success: boolean; errorMessage?: string }> {
  try {
    switch (row.OPERATION) {
      case "ADD":
        await createWarehouse({
          warehouse_code: row.warehouse_code,
          warehouse_name: row.warehouse_name,
          warehouse_type: row.warehouse_type,
        });
        return { success: true };

      case "UPD":
        await updateWarehouse(row.warehouse_code, {
          warehouse_name: row.warehouse_name,
          warehouse_type: row.warehouse_type,
        });
        return { success: true };

      case "DEL":
        await deleteWarehouse(row.warehouse_code);
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
export async function bulkUpsertWarehouses(rows: WarehouseBulkRow[]): Promise<BulkUpsertResponse> {
  const results = await Promise.all(
    rows.map(async (row, index) => {
      const result = await upsertWarehouseRow(row);
      return {
        rowNumber: row._rowNumber ?? index + 1,
        success: result.success,
        code: row.warehouse_code,
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
