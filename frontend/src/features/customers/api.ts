/**
 * Customers API Types and Bulk Operations
 * 
 * Note: Basic CRUD operations are handled by useMasterApi hook.
 * This file contains:
 * - Type definitions (Customer, CustomerCreate, CustomerUpdate)
 * - Bulk import/export operations
 */

import type {
    BulkUpsertResponse,
    CustomerBulkRow,
    CustomerBulkUpsertRequest,
} from "../types/bulk-operation";

import { http } from "@/services/http";
import type { components } from "@/types/api";

// ============================================
// Type Definitions (OpenAPI generated)
// ============================================

export type Customer = components["schemas"]["CustomerResponse"];
export type CustomerCreate = components["schemas"]["CustomerCreate"];
export type CustomerUpdate = components["schemas"]["CustomerUpdate"];

const BASE_PATH = "/customers";

// ============================================
// Bulk Operations
// ============================================

async function upsertCustomerRow(
    row: CustomerBulkRow,
): Promise<{ success: boolean; errorMessage?: string }> {
    try {
        switch (row.OPERATION) {
            case "ADD":
                await http.post<Customer>(BASE_PATH, {
                    customer_code: row.customer_code,
                    customer_name: row.customer_name,
                });
                return { success: true };

            case "UPD":
                await http.put<Customer>(`${BASE_PATH}/${row.customer_code}`, {
                    customer_name: row.customer_name,
                });
                return { success: true };

            case "DEL":
                await http.delete(`${BASE_PATH}/${row.customer_code}`);
                return { success: true };

            default:
                return { success: false, errorMessage: `不明な操作: ${row.OPERATION}` };
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : "不明なエラー";
        return { success: false, errorMessage: message };
    }
}

export async function bulkUpsertCustomers(rows: CustomerBulkRow[]): Promise<BulkUpsertResponse> {
    const results = await Promise.all(
        rows.map(async (row, index) => {
            const result = await upsertCustomerRow(row);
            return {
                rowNumber: row._rowNumber ?? index + 1,
                success: result.success,
                code: row.customer_code,
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
        summary: {
            total: rows.length,
            added,
            updated,
            deleted,
            failed,
        },
        results,
    };
}

export async function bulkUpsertCustomersApi(
    _request: CustomerBulkUpsertRequest,
): Promise<BulkUpsertResponse> {
    throw new Error("bulk-upsert API is not yet implemented");
}
