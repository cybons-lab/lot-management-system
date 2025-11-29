/**
 * Warehouses API Types and Bulk Operations
 */

import type { BulkUpsertResponse, WarehouseBulkRow } from "../types/bulk-operation";
import { http } from "@/shared/api/http-client";
import type { components } from "@/types/api";

export type Warehouse = components["schemas"]["WarehouseResponse"];
export type WarehouseCreate = components["schemas"]["WarehouseCreate"];
export type WarehouseUpdate = components["schemas"]["WarehouseUpdate"];

const BASE_PATH = "/warehouses";

// ============================================
// Individual CRUD Operations (for legacy hooks)
// ============================================

export async function createWarehouse(data: WarehouseCreate): Promise<Warehouse> {
    return http.post<Warehouse>(BASE_PATH, data).json();
}

export async function updateWarehouse(code: string, data: WarehouseUpdate): Promise<Warehouse> {
    return http.put<Warehouse>(`${BASE_PATH}/${code}`, data).json();
}

export async function deleteWarehouse(code: string): Promise<void> {
    return http.delete(`${BASE_PATH}/${code}`).json();
}

// ============================================
// Bulk Operations
// ============================================
async function upsertWarehouseRow(
    row: WarehouseBulkRow,
): Promise<{ success: boolean; errorMessage?: string }> {
    try {
        switch (row.OPERATION) {
            case "ADD":
                await http.post<Warehouse>(BASE_PATH, {
                    warehouse_code: row.warehouse_code,
                    warehouse_name: row.warehouse_name,
                    warehouse_type: row.warehouse_type,
                });
                return { success: true };
            case "UPD":
                await http.put<Warehouse>(`${BASE_PATH}/${row.warehouse_code}`, {
                    warehouse_name: row.warehouse_name,
                    warehouse_type: row.warehouse_type,
                });
                return { success: true };
            case "DEL":
                await http.delete(`${BASE_PATH}/${row.warehouse_code}`);
                return { success: true };
            default:
                return { success: false, errorMessage: `不明な操作: ${row.OPERATION}` };
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : "不明なエラー";
        return { success: false, errorMessage: message };
    }
}

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
