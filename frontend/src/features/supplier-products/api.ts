import type { SupplierProductBulkRow } from "./types/bulk-operation";

import { http } from "@/shared/api/http-client";
import type { BulkUpsertResponse } from "@/shared/types/bulk-operations";

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
  const errors: string[] = [];
  let created = 0;
  let updated = 0;
  let failed = 0;

  for (const [index, row] of rows.entries()) {
    const result = await upsertSupplierProductRow(row);
    if (result.success) {
      if (row.OPERATION === "ADD") created++;
      else if (row.OPERATION === "UPD") updated++;
      // DEL is processed but not counted in created/updated
    } else {
      failed++;
      errors.push(`行${row._rowNumber ?? index + 1}: ${result.errorMessage}`);
    }
  }

  return {
    status: failed === 0 ? "success" : failed === rows.length ? "failed" : "partial",
    summary: {
      total: rows.length,
      created,
      updated,
      failed,
    },
    errors,
  };
}
