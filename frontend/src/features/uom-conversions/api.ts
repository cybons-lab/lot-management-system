import type { UomConversionBulkRow } from "./types/bulk-operation";

import { http } from "@/shared/api/http-client";
import type { BulkUpsertResponse } from "@/shared/types/bulk-operations";

export interface UomConversionResponse {
  conversion_id: number;
  product_code: string;
  product_name: string;
  external_unit: string;
  conversion_factor: number;
  remarks?: string;
}

export type UomConversionCreate = Omit<UomConversionResponse, "conversion_id" | "product_name">;
export type UomConversionUpdate = {
  factor?: number;
};

/**
 * Bulk upsert UOM conversions
 * @endpoint POST /masters/uom-conversions/bulk-upsert
 */
export async function bulkUpsertUomConversions(
  rows: UomConversionBulkRow[],
): Promise<BulkUpsertResponse> {
  return http.post<BulkUpsertResponse>("masters/uom-conversions/bulk-upsert", { rows });
}
