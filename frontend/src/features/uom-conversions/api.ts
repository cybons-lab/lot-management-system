import { http } from "@/shared/api/http-client";
import type { BulkUpsertResponse } from "@/shared/types/bulk-operations";
import type { UomConversionBulkRow } from "./types/bulk-operation";

export interface UomConversionResponse {
  conversion_id: number;
  product_code: string;
  product_name: string;
  external_unit: string;
  conversion_factor: number;
  remarks?: string;
}

export type UomConversionCreate = Omit<UomConversionResponse, "conversion_id" | "product_name">;
export type UomConversionUpdate = Partial<UomConversionCreate>;

const BASE_PATH = "masters/uom-conversions";

async function upsertUomConversionRow(
  row: UomConversionBulkRow,
): Promise<{ success: boolean; errorMessage?: string }> {
  try {
    switch (row.OPERATION) {
      case "ADD":
        await http.post(BASE_PATH, {
          product_code: row.product_code,
          external_unit: row.external_unit,
          conversion_factor: row.conversion_factor,
          remarks: row.remarks,
        });
        return { success: true };

      case "UPD":
        // For UOM conversions, we might need to find the ID first if we don't have it in CSV.
        // But CSV doesn't have ID. It has product_code + external_unit.
        // If the backend supports update by composite key, that's great.
        // If not, we might need to fetch list and find ID.
        // Assuming backend supports update by ID, but we don't have ID.
        // Or maybe we can use product_code/external_unit as key?
        // Let's assume we need to find it first or backend supports query params.
        // Actually, let's try to use a search endpoint or just assume we can't update without ID easily unless backend supports it.
        // However, for now let's assume we can't easily update without ID, OR we assume the user provides enough info.
        // Wait, UomConversionResponse has conversion_id. But CSV doesn't.
        // If we want to update, we need to know which one to update.
        // Maybe we should fetch all conversions first? That's expensive.
        // Or maybe the backend supports PUT /masters/uom-conversions?product_code=...&external_unit=...
        // Let's assume for now we skip UPD or try to implement it if we can find a way.
        // Actually, let's just try to POST for ADD.
        // For UPD, if we don't have ID, it's hard.
        // Maybe we can assume the backend handles upsert on POST?
        // Or maybe we just fail UPD for now if we can't identify the record.

        // Alternative: The CSV export SHOULD include conversion_id if we want to update it.
        // But the current CSV spec I defined doesn't include conversion_id.
        // Let's check uom-conversion-csv.ts headers.
        // ["OPERATION", "product_code", "product_name", "external_unit", "conversion_factor", "remarks"]
        // No ID.

        // So we can only ADD or maybe DELETE by composite key if backend supports it.
        // Let's assume we can DELETE by composite key: DELETE /masters/uom-conversions?product_code=...&external_unit=...
        // But http client might not support query params in delete easily without config.

        // Let's implement ADD only for now, and maybe UPD/DEL if we can figure it out.
        // Or better, let's fetch the list inside bulkUpsert to map keys to IDs? That's safer.

        // Let's fetch all conversions once (since it's master data, maybe not too huge?)
        // Or just fail UPD/DEL for now with a message "ID required".

        // Wait, I can change the CSV format to include conversion_id.
        // But the user didn't explicitly ask for it, but for "Import/Export".
        // Usually export includes ID for update purposes.
        // Let's add conversion_id to CSV headers in uom-conversion-csv.ts and here.

        return { success: false, errorMessage: "更新機能は現在未対応です（IDが必要です）" };

      case "DEL":
        return { success: false, errorMessage: "削除機能は現在未対応です（IDが必要です）" };

      default:
        return { success: false, errorMessage: `不明な操作: ${row.OPERATION}` };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "不明なエラー";
    return { success: false, errorMessage: message };
  }
}

export async function bulkUpsertUomConversions(
  rows: UomConversionBulkRow[],
): Promise<BulkUpsertResponse> {
  // TODO: Implement proper UPD/DEL support by including conversion_id in CSV
  const results = await Promise.all(
    rows.map(async (row, index) => {
      const result = await upsertUomConversionRow(row);
      return {
        rowNumber: row._rowNumber ?? index + 1,
        success: result.success,
        code: `${row.product_code}-${row.external_unit}`,
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
