import { http } from "@/shared/api/http-client";
import type { BulkUpsertResponse } from "@/shared/types/bulk-operations";
import type { SupplierProductBulkRow } from "./types/bulk-operation";

export interface SupplierProductResponse {
  supplier_code: string;
  supplier_name: string;
  product_code: string;
  product_name: string;
  order_unit?: string;
  order_lot_size?: number;
}

export type SupplierProductCreate = Partial<SupplierProductResponse>;
export type SupplierProductUpdate = Partial<SupplierProductResponse>;

const BASE_PATH = "masters/supplier-products";

async function upsertSupplierProductRow(
  row: SupplierProductBulkRow,
): Promise<{ success: boolean; errorMessage?: string }> {
  try {
    switch (row.OPERATION) {
      case "ADD":
        await http.post(BASE_PATH, {
          supplier_code: row.supplier_code,
          product_code: row.product_code,
          order_unit: row.order_unit,
          order_lot_size: row.order_lot_size,
        });
        return { success: true };

      case "UPD":
        // Assuming composite key path: /supplier_code/product_code
        await http.put(`${BASE_PATH}/${row.supplier_code}/${row.product_code}`, {
          order_unit: row.order_unit,
          order_lot_size: row.order_lot_size,
        });
        return { success: true };

      case "DEL":
        await http.delete(`${BASE_PATH}/${row.supplier_code}/${row.product_code}`);
        return { success: true };

      default:
        return { success: false, errorMessage: `不明な操作: ${row.OPERATION}` };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "不明なエラー";
    return { success: false, errorMessage: message };
  }
}

export async function bulkUpsertSupplierProducts(
  rows: SupplierProductBulkRow[],
): Promise<BulkUpsertResponse> {
  const results = await Promise.all(
    rows.map(async (row, index) => {
      const result = await upsertSupplierProductRow(row);
      return {
        rowNumber: row._rowNumber ?? index + 1,
        success: result.success,
        code: `${row.supplier_code}-${row.product_code}`,
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
