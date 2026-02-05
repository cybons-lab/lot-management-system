import type { UomConversionBulkRow } from "./types/bulk-operation";

import { http } from "@/shared/api/http-client";
import type { BulkUpsertResponse } from "@/shared/types/bulk-operations";

export interface UomConversionResponse {
  conversion_id: number;
  version: number;
  supplier_item_id?: number;
  product_code: string;
  product_name: string;
  external_unit: string;
  conversion_factor: number;
  remarks?: string;
  valid_to?: string;
}

export interface UomConversionCreate {
  supplier_item_id: number;
  external_unit: string;
  factor: number;
}

export type UomConversionUpdate = {
  factor?: number;
  version: number;
};

/**
 * Create a new UOM conversion
 * @endpoint POST /masters/uom-conversions
 */
export async function createUomConversion(
  data: UomConversionCreate,
): Promise<UomConversionResponse> {
  return http.post<UomConversionResponse>("masters/uom-conversions", data);
}

/**
 * Bulk upsert UOM conversions
 * @endpoint POST /masters/uom-conversions/bulk-upsert
 */
export async function bulkUpsertUomConversions(
  rows: UomConversionBulkRow[],
): Promise<BulkUpsertResponse> {
  return http.post<BulkUpsertResponse>("masters/uom-conversions/bulk-upsert", { rows });
}
